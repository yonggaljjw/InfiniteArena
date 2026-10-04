// 역할: 실제 서버 전투로 사망과 리스폰을 관찰하고 V2 스프라이트 상태와 V4 화면을 검사합니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import { test, expect } from "@playwright/test";

test("V2 실제 전투 사망·리스폰과 스프라이트 상태", async ({ browser }) => {
  test.setTimeout(75000);
  test.skip(Boolean(process.env.ARENA_URL), "개발 서버의 시각 상태 검사 전용");
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const snapshots: any[] = [null, null],
    ids: string[] = ["", ""],
    combatEvents = new Map<string, any>();
  try {
    for (const [i, page] of pages.entries()) {
      page.on("websocket", (ws) =>
        ws.on("framereceived", (e) => {
          const d = JSON.parse(String(e.payload));
          if (d.type === "welcome") ids[i] = d.player_id;
          if (d.type === "snapshot") {
            snapshots[i] = d;
            for (const e of d.combat_events ?? []) combatEvents.set(e.id, e);
          }
        }),
      );
      await page.goto("/");
      await page.getByLabel("닉네임").fill("전투검증" + i);
      await page.getByRole("button", { name: "월드 입장" }).click();
      await expect(page.getByText("접속 완료", { exact: true })).toBeVisible();
    }
    // 두 플레이어를 실제 안전구역 밖으로 움직입니다. 모든 피해는 서버가 판정합니다.
    for (const page of pages) {
      await page.bringToFront();
      await page.keyboard.down("d");
      await page.waitForTimeout(1800);
      await page.keyboard.up("d");
    }
    await expect
      .poll(
        () =>
          snapshots.findIndex(
            (s, i) =>
              s?.players.find((p: any) => p.id === ids[i])?.alive === false,
          ),
        { timeout: 45000 },
      )
      .toBeGreaterThanOrEqual(0);
    const i = snapshots.findIndex(
        (s, j) => s?.players.find((p: any) => p.id === ids[j])?.alive === false,
      ),
      page = pages[i],
      id = ids[i];
    await expect
      .poll(() =>
        page.evaluate(
          (id) =>
            (
              window.__ARENA_GAME__!.scene.getScene("Arena") as any
            ).entities.get(id)?.visual.pose,
          id,
        ),
      )
      .toBe("death");
    await expect(page.getByTestId("death-overlay")).toBeVisible();
    await page.screenshot({ path: "test-results/death-live-v4.png" });
    await expect(
      page.getByRole("button", { name: "다시 생존하기", exact: true }),
    ).toBeEnabled({ timeout: 10000 });
    await page
      .getByRole("button", { name: "다시 생존하기", exact: true })
      .click();
    await expect
      .poll(() => snapshots[i]?.players.find((p: any) => p.id === id)?.alive)
      .toBe(true);
    await expect
      .poll(() =>
        page.evaluate((id) => {
          const e = (
            window.__ARENA_GAME__!.scene.getScene("Arena") as any
          ).entities.get(id);
          return (
            e?.sprite.visible &&
            e.visual.deathAt === null &&
            e.sprite.alpha === 1
          );
        }, id),
      )
      .toBe(true);
    const counts = await page.evaluate(
      () =>
        (window.__ARENA_GAME__!.scene.getScene("Arena") as any).combat.stats()
          .events,
    );
    expect(counts.hit).toBeGreaterThan(0);
    expect(counts.death).toBeGreaterThan(0);
    await page.screenshot({ path: "test-results/respawn-v2.png" });
    await page.screenshot({ path: "test-results/respawn-v3.png" });
  } finally {
    for (const c of contexts) await c.close();
  }
});
