// 역할: 실제 두 게스트의 PvP 발사/명중 이벤트와 효과 수신 검사. 키 입력 드라이버만 테스트용으로 제어합니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import { expect } from "@playwright/test";
import { test } from "./support/isolatedArena";

test("V3 실제 두 브라우저 PvP 확정 명중과 발사 구분", async ({
  browser,
  arenaUrl,
}) => {
  test.skip(
    Boolean(process.env.ARENA_URL),
    "개발 서버 입력 드라이버/렌더러 검사",
  );
  test.setTimeout(45000);
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const pages = await Promise.all(contexts.map((c) => c.newPage())),
    ids = ["", ""],
    observed = new Map<string, any>();
  try {
    for (const [i, page] of pages.entries()) {
      page.on("websocket", (ws) =>
        ws.on("framereceived", (e) => {
          const s = JSON.parse(String(e.payload));
          if (s.type === "welcome") ids[i] = s.player_id;
          for (const event of s.combat_events ?? [])
            observed.set(event.id, event);
        }),
      );
      await page.goto(arenaUrl);
      await page.getByLabel("닉네임").fill("대전" + i);
      await page.getByRole("button", { name: "월드 입장" }).click();
      await expect(page.getByText("접속 완료", { exact: true })).toBeVisible();
    }
    // 두 가상 키보드로 기존 50ms 입력 전송을 사용해 OS 포커스 때문에 한쪽이 멈추는 것을 방지합니다.
    // 서버 상태나 피해값을 주입하지 않습니다.
    await Promise.all(
      pages.map((p) =>
        p.evaluate(() => {
          (
            window.__ARENA_GAME__!.scene.getScene("Arena") as any
          ).movement.read = () => [1, 0];
        }),
      ),
    );
    await pages[0].waitForTimeout(1100);
    await Promise.all(
      pages.map((p) =>
        p.evaluate(() => {
          (
            window.__ARENA_GAME__!.scene.getScene("Arena") as any
          ).movement.read = () => [0, 0];
        }),
      ),
    );
    await expect
      .poll(
        () =>
          [...observed.values()].some(
            (e) =>
              e.kind === "hit" &&
              e.target_kind === "player" &&
              ids.includes(e.owner) &&
              ids.includes(e.target) &&
              e.owner !== e.target,
          ),
        { timeout: 25000 },
      )
      .toBe(true);
    expect(
      [...observed.values()].some(
        (e) => e.kind === "fire" && ids.includes(e.owner),
      ),
    ).toBe(true);
    const stats = await pages[0].evaluate(() =>
      (window.__ARENA_GAME__!.scene.getScene("Arena") as any).combat.stats(),
    );
    expect(stats.events.hit).toBeGreaterThan(0);
    expect(stats.events.fire).toBeGreaterThan(0);
    await pages[0].screenshot({ path: "test-results/pvp-v3.png" });
  } finally {
    for (const c of contexts) await c.close();
  }
});
