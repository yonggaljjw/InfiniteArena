// 역할: V2/V3 개발 서버의 짧은 RAF 프레임 표본 비교. 측정 결과와 화면을 docs에 저장합니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import { chromium } from "playwright";
import fs from "node:fs";
const output = new URL("../../docs/", import.meta.url);
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const results = [];
try {
  for (const [name, url] of [
    ["v2-baseline", process.env.V2_URL ?? "http://127.0.0.1:8081"],
    ["v3", process.env.V3_URL ?? "http://127.0.0.1:8080"],
  ]) {
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
      }),
      page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(url);
    await page.getByLabel("닉네임").fill("성능" + name.replaceAll("-", ""));
    await page.getByRole("button", { name: "월드 입장" }).click();
    await page.getByText("접속 완료", { exact: true }).waitFor();
    await page.waitForTimeout(2200);
    const sample = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const samples = [];
          const start = performance.now();
          let last = start;
          // RAF 간격을 모아 짧은 FPS/지연 표본을 계산합니다. 서버 tick 지연이나 GPU 성능 보장 값이 아닙니다.
          function frame(now) {
            samples.push(now - last);
            last = now;
            if (now - start < 4000) requestAnimationFrame(frame);
            else {
              const s = [...samples].sort((a, b) => a - b);
              resolve({
                frames: samples.length,
                durationMs: now - start,
                fps: (samples.length * 1000) / (now - start),
                frameMsMedian: s[Math.floor(s.length * 0.5)],
                frameMsP95: s[Math.floor(s.length * 0.95)],
              });
            }
          }
          requestAnimationFrame(frame);
        }),
    );
    const environment = await page.evaluate(
      () => window.__ARENA_GAME__?.registry.get("environmentStats") ?? null,
    );
    const renderer = await page.evaluate(
      () => window.__ARENA_GAME__?.renderer.type ?? null,
    );
    await page.screenshot({
      path: new URL(`benchmark-${name}.png`, output).pathname,
    });
    results.push({
      name,
      ...sample,
      environment,
      renderer,
      pageErrors: errors,
    });
    await context.close();
    await new Promise((resolve) => setTimeout(resolve, 5500));
  }
  const report = {
    viewport: [1280, 800],
    browser: "Chromium 134 headless",
    method:
      "단일 활성 페이지에서 2.2초 예열 후 requestAnimationFrame 4초 표본. 서버 전투 상태와 배치는 완전히 동일하지 않음. GPU 하드웨어 성능 보장 아님.",
    results,
  };
  fs.writeFileSync(
    new URL("v3-performance.json", output),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
