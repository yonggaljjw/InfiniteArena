// 역할: 실제 몬스터 사냥→EXP/레벨업→강화 선택→서버 능력치 변경 흐름 검사. 가짜 보상을 주입하지 않습니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import { expect } from "@playwright/test";
import { test } from "./support/isolatedArena";

test("V4 실제 몬스터 처치·레벨업·서버 카드 선택 적용", async ({
  page,
  arenaUrl,
}) => {
  test.skip(Boolean(process.env.ARENA_URL), "개발 서버 가상 키보드 전용");
  test.setTimeout(80000);
  const errors: string[] = [],
    requests: any[] = [];
  let snapshot: any;
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("websocket", (ws) => {
    ws.on("framereceived", (e) => {
      const s = JSON.parse(String(e.payload));
      if (s.type === "snapshot") snapshot = s;
    });
    ws.on("framesent", (e) => {
      const s = JSON.parse(String(e.payload));
      if (s.type === "upgrade_selected") requests.push(s);
    });
  });
  await page.goto(arenaUrl);
  await page.getByLabel("닉네임", { exact: true }).fill("성장검증");
  await page.getByRole("button", { name: "월드 입장", exact: true }).click();
  await expect(page.getByText("접속 완료", { exact: true })).toBeVisible();
  // 독립 seed83 월드에 정상 키 입력만 보냅니다. 처치/EXP/카드는 기존 서버 규칙이 생성하며
  // 엔티티 상태나 보상을 주입하지 않습니다.
  await page.evaluate(() => {
    (window.__ARENA_GAME__!.scene.getScene("Arena") as any).movement.read =
      () => [0, -1];
  });
  await page.waitForTimeout(1050);
  await page.evaluate(() => {
    (window.__ARENA_GAME__!.scene.getScene("Arena") as any).movement.read =
      () => [0, 0];
  });
  await expect
    .poll(() => Boolean(snapshot?.choices.length), { timeout: 30000 })
    .toBe(true);
  expect(snapshot.choices).toHaveLength(3);
  const before = JSON.parse(JSON.stringify(snapshot)),
    me = before.players.find((p: any) => p.id === before.you),
    choice = before.choices[0];
  await expect(page.locator(".upgrade-card")).toHaveCount(3);
  expect(
    await page
      .locator(".upgrade-card")
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-choice"))),
  ).toEqual(before.choices);
  await page
    .locator(`[data-choice="${choice}"]`)
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect.poll(() => snapshot.offer_id).toBeGreaterThan(before.offer_id);
  expect(requests).toHaveLength(1);
  expect(requests[0]).toEqual({
    v: 1,
    type: "upgrade_selected",
    offer_id: before.offer_id,
    choice,
  });
  const after = snapshot.players.find((p: any) => p.id === before.you);
  expect(snapshot.tick).toBeGreaterThanOrEqual(before.tick);
  if (choice === "damage") expect(after.damage).toBeGreaterThan(me.damage);
  if (choice === "health") expect(after.max_hp).toBeGreaterThan(me.max_hp);
  if (choice === "haste") expect(after.cooldown).toBeLessThan(me.cooldown);
  if (choice === "spread" || choice === "orbit")
    expect(after.weapons).toContain(choice);
  await page.screenshot({ path: "test-results/upgrade-applied-live-v4.png" });
  expect(errors).toEqual([]);
});
