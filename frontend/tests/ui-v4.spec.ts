// 역할: V4 키보드·저장 설정·서버 수치 연결과 PC 해상도/125% UI 검사. 경계 데이터는 표시 패킷으로 재생합니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import { test, expect, type Page } from "@playwright/test";

// 게스트 입장을 요청하고 첫 서버 스냅샷을 기다립니다. 화면 검사는 확정 응답 이후 시작합니다.
async function join(page: Page, nickname = "화면검증") {
  let snapshot: any;
  page.on("websocket", (ws) =>
    ws.on("framereceived", (e) => {
      const packet = JSON.parse(String(e.payload));
      if (packet.type === "snapshot") snapshot = packet;
    }),
  );
  await page.goto("/");
  await page.getByLabel("닉네임", { exact: true }).fill(nickname);
  await page.getByRole("button", { name: "월드 입장", exact: true }).click();
  await expect(page.getByText("접속 완료", { exact: true })).toBeVisible();
  await expect.poll(() => Boolean(snapshot)).toBe(true);
  return snapshot;
}
// 표시 검사에만 서버 스냅샷 모양의 fixture를 주입합니다. 실제 전투/성장 성공 검증으로 해석하지 않습니다.
async function replay(page: Page, snapshot: any) {
  await page.evaluate(async (snapshot) => {
    const url = "/src/shared/bridge.ts",
      { bridge, ui } = await import(url);
    const publish = bridge.publish.bind(bridge);
    bridge.publish = (packet: any) => {
      if (packet.combat_epoch === "v4-ui-replay") publish(packet);
    };
    (window as any).__uiV4 = { ui, publish, fixture: snapshot };
    (window.__ARENA_GAME__!.scene.getScene("Arena") as any).apply = () => {};
    publish({ ...snapshot, combat_epoch: "v4-ui-replay", combat_events: [] });
  }, snapshot);
}
// 현재 DOM의 실제 사각형과 viewport를 읽어 레이아웃 잘림/겹침 검사에 사용합니다.
async function boxes(page: Page, selectors: string[]) {
  return page.evaluate(
    (selectors) =>
      selectors.map((selector) => {
        const element = document.querySelector(selector) as HTMLElement;
        const b = element.getBoundingClientRect();
        return {
          selector,
          x: b.x,
          y: b.y,
          width: b.width,
          height: b.height,
          viewport: [innerWidth, innerHeight],
        };
      }),
    selectors,
  );
}
// 검사한 사각형이 viewport 경계 안에 들어오는지 확인합니다. 장식/모든 DOM의 무겹침 보장은 아닙니다.
function onScreen(items: Awaited<ReturnType<typeof boxes>>) {
  for (const b of items) {
    expect(b.x, b.selector).toBeGreaterThanOrEqual(-1);
    expect(b.y, b.selector).toBeGreaterThanOrEqual(-1);
    expect(b.x + b.width, b.selector).toBeLessThanOrEqual(b.viewport[0] + 1);
    expect(b.y + b.height, b.selector).toBeLessThanOrEqual(b.viewport[1] + 1);
  }
}

test("V4 메뉴·설정 키보드·저장·입력 차단과 실제 데이터 연결", async ({
  page,
}) => {
  test.skip(Boolean(process.env.ARENA_URL), "개발 서버 상태 검사");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByLabel("닉네임", { exact: true })
    .pressSequentially("WASD_user");
  await expect(page.getByLabel("닉네임", { exact: true })).toHaveValue(
    "WASD_user",
  );
  await page.screenshot({ path: "test-results/menu-v4.png" });
  await page.getByRole("button", { name: "설정", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("button", { name: "설정 닫기" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "완료" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "설정 닫기" })).toBeFocused();
  await page.getByLabel("UI 크기", { exact: false }).selectOption("1.25");
  await page.getByLabel("UI 동작 감소", { exact: false }).check();
  await page.getByLabel("상세 능력치 표시", { exact: false }).uncheck();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "설정", exact: true }),
  ).toBeFocused();
  await page.reload();
  await expect(page.locator("main")).toHaveClass("reduce-motion");
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await expect(page.getByLabel("UI 크기", { exact: false })).toHaveValue(
    "1.25",
  );
  await page.getByRole("button", { name: "완료", exact: true }).click();
  const snapshot = await join(page, "설정검증");
  const me = snapshot.players.find((p: any) => p.id === snapshot.you);
  await expect(
    page.getByRole("progressbar", { name: "체력", exact: true }),
  ).toHaveAttribute("aria-valuenow", String(me.hp));
  await expect(
    page.getByRole("progressbar", { name: "경험치", exact: true }),
  ).toHaveAttribute("aria-valuemax", String(me.exp_next));
  await expect(page.getByTestId("weapon-stats")).toHaveCount(0);
  await page.getByRole("button", { name: "설정", exact: true }).click();
  const before = await page.evaluate(
    () => (window.__ARENA_GAME__!.scene.getScene("Arena") as any).latest,
  );
  await page.keyboard.down("d");
  await page.waitForTimeout(350);
  await page.keyboard.up("d");
  const after = await page.evaluate(
    () => (window.__ARENA_GAME__!.scene.getScene("Arena") as any).latest,
  );
  expect(after.tick).toBeGreaterThan(before.tick);
  expect(after.players.find((p: any) => p.id === after.you).x).toBe(
    before.players.find((p: any) => p.id === before.you).x,
  );
  await page.getByRole("button", { name: "기본값 복원" }).click();
  await page.screenshot({ path: "test-results/settings-v4.png" });
  await page.getByRole("button", { name: "완료", exact: true }).click();
  await expect(page.getByTestId("weapon-stats")).toBeVisible();
  await page.getByRole("button", { name: "나가기", exact: true }).click();
  await expect(page.getByLabel("닉네임", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("V4 3개 PC 해상도·125% UI·성장/사망 화면 표시 재생", async ({ page }) => {
  test.skip(Boolean(process.env.ARENA_URL), "표시 패킷 재생 검사");
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const snapshot = await join(page);
  const me = snapshot.players.find((p: any) => p.id === snapshot.you);
  const fixture = {
    ...snapshot,
    players: [
      {
        ...me,
        nickname: "아주긴모험가이름열여섯자검증",
        hp: 63.25,
        max_hp: 140,
        level: 7,
        exp: 47,
        exp_next: 210,
        kills: 42,
        deaths: 3,
        weapons: ["bullet", "orbit"],
        damage: 23.5,
        cooldown: 0.5,
      },
    ],
    online: 20,
    leaderboard: Array.from({ length: 5 }, (_, i) => ({
      id: i === 2 ? snapshot.you : "rank" + i,
      nickname: i === 2 ? "아주긴모험가이름열여섯자검증" : "모험가" + i,
      kills: i === 2 ? 42 : 50 - i * 4,
      level: 7,
    })),
    choices: [],
    protected: false,
  };
  await replay(page, fixture);
  await expect(page.getByTestId("my-rank")).toHaveText("내 순위 3위");
  await expect(page.locator('.ranking li[aria-current="true"]')).toHaveCount(1);
  await expect(page.getByTestId("player-count")).toHaveText("접속 20명");
  await expect(
    page.getByRole("progressbar", { name: "체력", exact: true }),
  ).toHaveAttribute("aria-valuenow", "63.25");
  await expect(page.getByTestId("experience")).toContainText(
    "다음 레벨까지 163 EXP",
  );
  for (const [width, height] of [
    [1366, 768],
    [1920, 1080],
    [2560, 1440],
  ]) {
    await page.setViewportSize({ width, height });
    for (const scale of [1, 1.25]) {
      await page.evaluate(async (scale) => {
        const url = "/src/shared/preferences.ts";
        (await import(url)).preferences.scale = scale;
      }, scale);
      await page.waitForTimeout(250);
      const hudBoxes = await boxes(page, [
        ".player-panel",
        ".ranking",
        ".session-bar",
        ".weapon-panel",
        ".help",
      ]);
      onScreen(hudBoxes);
      const left = hudBoxes[0],
        right = hudBoxes[1],
        center = hudBoxes[2];
      expect(left.x + left.width).toBeLessThan(center.x);
      expect(center.x + center.width).toBeLessThan(right.x);
      expect(left.x + left.width).toBeLessThan(width * 0.35);
      expect(right.x).toBeGreaterThan(width * 0.65);
      await page.screenshot({
        path: `test-results/hud-v4-${width}-${scale}.png`,
      });
      await page.evaluate(() => {
        const { fixture, publish } = (window as any).__uiV4;
        publish({
          ...fixture,
          choices: ["damage", "haste", "health"],
          offer_id: 77,
          combat_epoch: "v4-ui-replay",
          combat_events: [],
        });
      });
      await expect(page.locator(".upgrade-card")).toHaveCount(3);
      await page.waitForTimeout(200);
      const cardBoxes = await boxes(page, [
        ".upgrade",
        ".upgrade-card:nth-child(1)",
        ".upgrade-card:nth-child(2)",
        ".upgrade-card:nth-child(3)",
      ]);
      onScreen(cardBoxes);
      expect(cardBoxes[1].y).toBeGreaterThan(height * 0.5);
      await expect(page.locator(".upgrade")).toContainText(
        "현재 총알 피해 23.5",
      );
      if (scale === 1)
        await page.screenshot({ path: `test-results/upgrade-v4-${width}.png` });
      await page.evaluate(() => {
        const { fixture, publish } = (window as any).__uiV4;
        publish({
          ...fixture,
          players: fixture.players.map((p: any) => ({
            ...p,
            alive: false,
            hp: 0,
          })),
          choices: [],
          respawn_in: 2.4,
          combat_epoch: "v4-ui-replay",
          combat_events: [],
        });
      });
      await expect(page.getByTestId("death-overlay")).toBeVisible();
      onScreen(await boxes(page, [".death-overlay"]));
      await expect(
        page.getByRole("button", { name: "리스폰 대기 2.4초" }),
      ).toBeDisabled();
      if (scale === 1)
        await page.screenshot({ path: `test-results/death-v4-${width}.png` });
      await page.evaluate(() => {
        const { fixture, publish } = (window as any).__uiV4;
        publish({
          ...fixture,
          choices: [],
          combat_epoch: "v4-ui-replay",
          combat_events: [],
        });
      });
    }
  }
  // 브라우저 확대가 줄이는 CSS viewport와 동등한 크기에서 125% UI를 검사합니다. 실제 확대 메뉴 조작은 아닙니다.
  await page.setViewportSize({ width: 1093, height: 614 });
  await page.waitForTimeout(200);
  onScreen(
    await boxes(page, [
      ".player-panel",
      ".ranking",
      ".session-bar",
      ".weapon-panel",
    ]),
  );
  expect(errors).toEqual([]);
});
