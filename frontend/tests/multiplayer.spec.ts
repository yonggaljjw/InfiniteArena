// 역할: 두 브라우저 컨텍스트의 입장·이동 전달·재접속·퇴장 흐름 검사.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import { test, expect } from "@playwright/test";

test("두 브라우저: 입장, 이동 동기화, 재접속, 퇴장", async ({ browser }) => {
  const ca = await browser.newContext(),
    cb = await browser.newContext();
  const a = await ca.newPage(),
    b = await cb.newPage();
  const errors: string[] = [];
  a.on("pageerror", (e) => errors.push(e.message));
  b.on("pageerror", (e) => errors.push(e.message));
  let first: any,
    latest: any,
    aid = "";
  a.on("websocket", (ws) =>
    ws.on("framereceived", (event) => {
      const d = JSON.parse(String(event.payload));
      if (d.type === "welcome") aid = d.player_id;
    }),
  );
  b.on("websocket", (ws) =>
    ws.on("framereceived", (event) => {
      const d = JSON.parse(String(event.payload));
      if (d.type === "snapshot") {
        latest = d;
        if (!first && d.online === 2) first = d;
      }
    }),
  );
  await a.goto("/");
  await a.getByLabel("닉네임").fill("브라우저A");
  await a.getByRole("button", { name: "월드 입장" }).click();
  await expect(a.getByText("접속 완료", { exact: true })).toBeVisible();
  await b.goto("/");
  await b.getByLabel("닉네임").fill("브라우저B");
  await b.getByRole("button", { name: "월드 입장" }).click();
  await expect(b.getByTestId("player-count")).toHaveText("접속 2명");
  await expect.poll(() => Boolean(first && aid)).toBeTruthy();
  const start = first.players.find((p: any) => p.id === aid).x;
  // 안전구역 중심으로 이동하여 무작위 스폰 오프셋이 기존 몬스터 전투를 유발하지 않게 합니다.
  // 이 테스트는 이동 동기화 자체를 검사합니다.
  const right = start <= 2048,
    key = right ? "d" : "a",
    direction = right ? "right" : "left";
  await a.bringToFront();
  await expect(a.locator("canvas")).toBeVisible();
  await a.keyboard.down(key);
  try {
    if (!process.env.ARENA_URL)
      await expect
        .poll(
          () =>
            b.evaluate((id) => {
              const e = (
                window.__ARENA_GAME__!.scene.getScene("Arena") as any
              ).entities.get(id);
              return e ? [e.visual.direction, e.visual.pose] : null;
            }, aid),
          { intervals: [20, 20, 50] },
        )
        .toEqual([direction, "walk"]);
    await expect
      .poll(
        () =>
          Math.abs(
            (latest?.players.find((p: any) => p.id === aid)?.x ?? start) -
              start,
          ),
        { intervals: [20, 20, 50] },
      )
      .toBeGreaterThan(50);
  } finally {
    await a.keyboard.up(key);
  }
  if (!process.env.ARENA_URL)
    await expect
      .poll(() =>
        b.evaluate(
          (id) =>
            (
              window.__ARENA_GAME__!.scene.getScene("Arena") as any
            ).entities.get(id)?.visual.pose,
          aid,
        ),
      )
      .toBe("idle");
  await expect(a.locator("canvas")).toBeVisible();
  await a.screenshot({ path: "test-results/arena-game.png" });
  // 원시 브라우저 연결을 끊은 뒤 UI 재접속으로 동일 게스트를 복구합니다.
  await ca.setOffline(true);
  await a.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(
    a.getByRole("button", { name: "재접속", exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await ca.setOffline(false);
  await a.waitForTimeout(500);
  await a.getByRole("button", { name: "재접속", exact: true }).click();
  await expect(a.getByText("접속 완료", { exact: true })).toBeVisible();
  await b.getByRole("button", { name: "나가기", exact: true }).click();
  await expect(a.getByTestId("player-count")).toHaveText("접속 1명");
  if (!process.env.ARENA_URL)
    await expect
      .poll(() =>
        b.evaluate(() => {
          const s = window.__ARENA_GAME__!.scene.getScene("Arena") as any,
            c = s.combat.stats();
          return [
            s.entities.size,
            s.monsters.size,
            c.projectiles.active,
            c.pool.spriteActive,
            c.pool.textActive,
            c.seen,
          ];
        }),
      )
      .toEqual([0, 0, 0, 0, 0, 0]);
  expect(errors).toEqual([]);
  await ca.close();
  await cb.close();
});
