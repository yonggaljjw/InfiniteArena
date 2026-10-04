// 역할: V1 PNG·레이어·서버 충돌 좌표·culling·대체 경로 회귀 검사.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import { test, expect } from "@playwright/test";

test("V1 환경: PNG, 레이어, 충돌 좌표, culling, 객체 재사용", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.text().includes("환경 에셋 로딩 실패")) errors.push(m.text());
  });
  const response = await page.request.get("/assets/tiles/ground-v1.png");
  expect(response.status()).toBe(200);
  expect((await response.body()).subarray(1, 4).toString()).toBe("PNG");
  await page.goto("/");
  await page.getByLabel("닉네임").fill("환경검증");
  await page.getByRole("button", { name: "월드 입장" }).click();
  await expect(page.getByText("접속 완료", { exact: true })).toBeVisible();
  if (!process.env.ARENA_URL) {
    // 개발 서버 한정 게임 참조입니다. 운영 빌드는 전역 참조를 노출하지 않습니다.
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.__ARENA_GAME__?.registry.get("environmentStats")
              ?.obstaclesConfigured,
        ),
      )
      .toBe(true);
    const inspect = () =>
      page.evaluate(() => {
        const game = window.__ARENA_GAME__!,
          s = game.scene.getScene("Arena");
        return {
          stats: game.registry.get("environmentStats"),
          layers: ["Ground", "Detail"].map((n) =>
            Boolean(s.children.getByName(n)),
          ),
          footprints: [0, 1, 2].map((i) =>
            s.children
              .getByName(`ObstacleFootprint-${i}`)!
              .getData("collision"),
          ),
          frame: game.textures.get("env-ground").getSourceImage()!.width,
        };
      });
    const sorting = await page.evaluate(() => {
      const s = window.__ARENA_GAME__!.scene.getScene("Arena") as any;
      const actor = [...s.entities.values()][0] as any;
      return { depth: actor.sprite.depth, foot: actor.sprite.y + 16 };
    });
    expect(sorting.depth).toBeCloseTo(10000 + sorting.foot, 5);
    const faded = await page.evaluate(() => {
      const s = window.__ARENA_GAME__!.scene.getScene("Arena") as any;
      const environment = s.environment;
      const canopy = environment.visible.find((p: any) => p.canopy);
      if (!canopy) return null;
      const position = {
        x: canopy.bounds.centerX,
        y: canopy.bounds.centerY + 8,
      };
      environment.update(performance.now(), 600, position, [position]);
      return canopy.image.alpha;
    });
    expect(faded).not.toBeNull();
    expect(faded).toBeLessThan(0.35);
    const before = await inspect();
    expect(before.stats.tileLayers).toBe(2);
    expect(before.stats.visibleProps).toBeLessThan(before.stats.props);
    expect(before.layers).toEqual([true, true]);
    expect(before.frame).toBe(416);
    expect(before.footprints).toEqual([
      { x: 1700, y: 1800, w: 180, h: 64 },
      { x: 2300, y: 2180, w: 64, h: 180 },
      { x: 1960, y: 2500, w: 240, h: 64 },
    ]);
    await page.waitForTimeout(1200);
    expect((await inspect()).stats.props).toBe(before.stats.props);
    // 카메라가 맵 끝으로 이동해도 지형 레이어를 다시 생성하지 않습니다.
    await page.evaluate(() => {
      const s = window.__ARENA_GAME__!.scene.getScene("Arena");
      s.cameras.main.stopFollow();
      s.cameras.main.setScroll(0, 0);
    });
    await page.waitForTimeout(300);
    expect((await inspect()).stats.props).toBe(before.stats.props);
  }
  await page.screenshot({ path: "test-results/environment-v1-edge.png" });
  expect(errors).toEqual([]);
});

test("환경 PNG 로딩 실패 시에도 입장과 렌더링 유지", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/assets/**/*.png", (route) => route.abort());
  await page.goto("/");
  await page.getByLabel("닉네임").fill("대체경로");
  await page.getByRole("button", { name: "월드 입장" }).click();
  await expect(page.getByText("접속 완료", { exact: true })).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  if (!process.env.ARENA_URL)
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.__ARENA_GAME__?.registry.get("environmentStats")
              ?.obstaclesConfigured,
        ),
      )
      .toBe(true);
  expect(errors).toEqual([]);
});
