// 역할: V4 실제 1인 보호구역의 세 해상도 짧은 RAF 측정. 다수 전투나 장시간 부하 검사가 아닙니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import { chromium } from "playwright";
import fs from "node:fs";
const output = new URL("../../docs/", import.meta.url);
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1366, height: 768 },
});
const page = await context.newPage(),
  errors = [],
  results = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto(process.env.ARENA_URL ?? "http://127.0.0.1:8080");
  await page.locator("canvas").waitFor();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: new URL("menu-live-v4.png", output).pathname });
  await page.getByLabel("닉네임", { exact: true }).fill("통합화면검증");
  await page.getByRole("button", { name: "월드 입장", exact: true }).click();
  await page.getByText("접속 완료", { exact: true }).waitFor();
  for (const [width, height] of [
    [1366, 768],
    [1920, 1080],
    [2560, 1440],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(2200);
    const sample = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const frames = [],
            started = performance.now();
          let last = started;
          // RAF 간격을 모아 짧은 FPS/지연 표본을 계산합니다. 서버 tick 지연이나 GPU 성능 보장 값이 아닙니다.
          function frame(now) {
            frames.push(now - last);
            last = now;
            if (now - started < 4000) requestAnimationFrame(frame);
            else {
              const ordered = [...frames].sort((a, b) => a - b);
              const game = window.__ARENA_GAME__,
                scene = game?.scene.getScene("Arena");
              resolve({
                fps: (frames.length * 1000) / (now - started),
                frameMedianMs: ordered[Math.floor(ordered.length * 0.5)],
                frameP95Ms: ordered[Math.floor(ordered.length * 0.95)],
                durationMs: now - started,
                renderer: game?.renderer.type,
                objects: scene?.children.length,
                environment: game?.registry.get("environmentStats"),
                combat: game?.registry.get("combatStats"),
                domElements: document.querySelectorAll("*").length,
              });
            }
          }
          requestAnimationFrame(frame);
        }),
    );
    await page.screenshot({
      path: new URL(`hud-live-v4-${width}.png`, output).pathname,
    });
    results.push({ viewport: [width, height], ...sample });
  }
  const report = {
    browser: "Chromium134 headless",
    method:
      "One actual live player in the protected zone; 2.2-second warm-up + 4-second RAF per viewport. UI100%. Not a GPU/60FPS or sustained combat benchmark.",
    results,
    pageErrors: errors,
  };
  fs.writeFileSync(
    new URL("v4-performance.json", output),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  if (errors.length) throw new Error("Browser errors observed");
} finally {
  await context.close();
  await browser.close();
}
