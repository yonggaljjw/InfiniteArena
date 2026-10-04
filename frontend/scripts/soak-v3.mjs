// 역할: 실제 UI 1개와 WS 봇 19개의 연속 전투 측정. ARENA_URL/SOAK_SECONDS로 대상을 지정하며 docs 기록을 갱신합니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
// 실제 UI 1개와 브라우저 WS 봇 19개를 사용합니다. 서버 상태를 직접 주입하지 않습니다.
import { chromium } from "playwright";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const output = fileURLToPath(new URL("../../docs/", import.meta.url));
const url = process.env.ARENA_URL ?? "http://127.0.0.1:8080";
const duration = Number(process.env.SOAK_SECONDS ?? 120);
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  }),
  page = await context.newPage();
fs.writeFileSync(output + "v3-soak-samples.jsonl", "");
const errors = [],
  samples = [];
let mainSocket = false,
  mainBytes = 0;
page.on("pageerror", (e) => errors.push(e.message));
page.on("websocket", (ws) => {
  if (!ws.url().endsWith("/ws") || mainSocket) return;
  mainSocket = true;
  ws.on("framereceived", (e) => {
    mainBytes += Buffer.byteLength(String(e.payload));
  });
});
try {
  await page.goto(url);
  await page.getByLabel("닉네임").fill("연속전투");
  await page.getByRole("button", { name: "월드 입장" }).click();
  await page.getByText("접속 완료", { exact: true }).waitFor();
  await page.waitForFunction(() =>
    window.__ARENA_GAME__?.registry.get("combatStats"),
  );
  await page.evaluate(async () => {
    const m = (window.__arenaSoak = {
      bytes: 0,
      snapshots: 0,
      botErrors: [],
      bots: [],
      peakOnline: 0,
      frames: 0,
      started: performance.now(),
      frameMs: [],
      last: performance.now(),
    });
    // RAF 간격을 모아 짧은 FPS/지연 표본을 계산합니다. 서버 tick 지연이나 GPU 성능 보장 값이 아닙니다.
    function frame(t) {
      m.frames++;
      m.frameMs.push(t - m.last);
      if (m.frameMs.length > 240) m.frameMs.shift();
      m.last = t;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    for (let i = 0; i < 19; i++) {
      const r = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: "관측봇" + i }),
      });
      if (!r.ok) throw new Error("guest " + r.status);
      const guest = await r.json(),
        ws = new WebSocket(location.origin.replace(/^http/, "ws") + "/ws");
      const bot = { ws, timer: null, seq: 0, offer: -1, respawning: false };
      m.bots.push(bot);
      await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
      });
      ws.onmessage = (event) => {
        m.bytes += new TextEncoder().encode(event.data).length;
        const s = JSON.parse(event.data);
        if (s.type === "welcome") {
          bot.seq = s.next_seq;
          bot.timer = setInterval(() => {
            if (ws.readyState === 1) {
              const a = (i * Math.PI * 2) / 19;
              ws.send(
                JSON.stringify({
                  v: 1,
                  type: "input",
                  seq: bot.seq++,
                  dx: Math.round(Math.cos(a)),
                  dy: Math.round(Math.sin(a)),
                }),
              );
            }
          }, 50);
        } else if (s.type === "snapshot") {
          m.snapshots++;
          m.peakOnline = Math.max(m.peakOnline, s.online);
          const p = s.players.find((p) => p.id === s.you);
          if (p.alive) bot.respawning = false;
          if (p.alive && s.choices.length && bot.offer !== s.offer_id) {
            bot.offer = s.offer_id;
            ws.send(
              JSON.stringify({
                v: 1,
                type: "upgrade_selected",
                offer_id: s.offer_id,
                choice: s.choices[0],
              }),
            );
          }
          if (!p.alive && s.respawn_in === 0 && !bot.respawning) {
            bot.respawning = true;
            ws.send(JSON.stringify({ v: 1, type: "respawn" }));
          }
        } else if (s.type === "error")
          m.botErrors.push(s.message ?? JSON.stringify(s));
      };
      ws.onerror = () => m.botErrors.push("bot socket error");
      ws.send(JSON.stringify({ v: 1, type: "join", token: guest.token }));
    }
  });
  await page.bringToFront();
  await page.keyboard.down("d");
  const started = Date.now();
  while (Date.now() - started < duration * 1000) {
    await page.waitForTimeout(1000);
    const sample = await page.evaluate(() => {
      const g = window.__ARENA_GAME__,
        s = g?.scene.getScene("Arena"),
        m = window.__arenaSoak,
        p = s?.latest?.players.find((p) => p.id === s.latest.you);
      const dt = [...m.frameMs].sort((a, b) => a - b);
      return {
        seconds: (performance.now() - m.started) / 1000,
        objects: s?.children.length,
        stats: s?.combat.stats(),
        alive: p?.alive,
        choices: s?.latest?.choices.length ?? 0,
        respawn: s?.latest?.respawn_in ?? 0,
        fps: (m.frames * 1000) / (performance.now() - m.started),
        frameP95: dt[Math.floor(dt.length * 0.95)],
        heap: performance.memory?.usedJSHeapSize ?? null,
      };
    });
    samples.push(sample);
    fs.appendFileSync(
      output + "v3-soak-samples.jsonl",
      JSON.stringify(sample) + "\n",
    );
    // DOM 대기 중 서버 상태가 바뀔 수 있어 현재 버튼이 있을 때만 클릭합니다.
    // 사망으로 사라졌으면 다음 표본에서 다시 확인합니다.
    if (!sample.alive && sample.respawn === 0)
      await page
        .getByRole("button", { name: "다시 생존하기", exact: true })
        .evaluateAll((nodes) => nodes[0]?.click());
    else if (sample.alive && sample.choices)
      await page
        .locator(".upgrade button")
        .first()
        .evaluateAll((nodes) => nodes[0]?.click());
    if (samples.length % 20 === 0)
      console.log(
        JSON.stringify({
          seconds: Math.round(sample.seconds),
          fps: sample.fps,
          pool: sample.stats.pool,
          events: sample.stats.events,
        }),
      );
  }
  await page.keyboard.up("d");
  const network = await page.evaluate(() => {
    const m = window.__arenaSoak;
    for (const b of m.bots) {
      clearInterval(b.timer);
      b.ws.close();
    }
    return {
      bytes: m.bytes,
      snapshots: m.snapshots,
      peakOnline: m.peakOnline,
      botErrors: m.botErrors,
      frames: m.frames,
    };
  });
  const health = await (
    await page.request.get(new URL("/api/health", url).href)
  ).json();
  await page.screenshot({ path: output + "soak-v3.png" });
  // 실제 Scene 종료가 효과 풀과 이벤트 구독을 해제하는지 확인합니다.
  await page.evaluate(() => {
    window.__soakRefs = window.__ARENA_GAME__.scene.getScene("Arena").combat;
  });
  await page.getByRole("button", { name: "나가기", exact: true }).click();
  await page.waitForTimeout(300);
  const leave = await page.evaluate(() => {
    const g = window.__ARENA_GAME__,
      s = g.scene.getScene("Arena");
    return {
      canvasPreserved: Boolean(g),
      players: s.entities.size,
      monsters: s.monsters.size,
      stats: s.combat.stats(),
    };
  });
  await page.evaluate(() => {
    window.__ARENA_GAME__.destroy(true);
  });
  await page.waitForTimeout(300);
  const cleanup = await page.evaluate(() => {
    const c = window.__soakRefs;
    return {
      gameDestroyed: !window.__ARENA_GAME__,
      images: c.pool.slots.length,
      texts: c.pool.texts.length,
      active: c.projectiles.active.size,
      listeners: c.stats().listeners,
      seen: c.stats().seen,
    };
  });
  const report = {
    durationSeconds: duration,
    method:
      "Real 1 Chromium renderer + 19 browser WebSocket bots; 1-second sampled object/FPS counters, SQLite; not 30-minute stability or GPU guarantee.",
    viewport: [1280, 800],
    network: {
      ...network,
      mainBytes,
      bytesPerClientSecond: (network.bytes + mainBytes) / (20 * duration),
    },
    health,
    leave,
    cleanup,
    pageErrors: errors,
    samples,
  };
  fs.writeFileSync(output + "v3-soak.json", JSON.stringify(report, null, 2));
  if (
    errors.length ||
    network.botErrors.length ||
    network.peakOnline !== 20 ||
    leave.players ||
    leave.monsters ||
    leave.stats.pool.spriteActive ||
    leave.stats.pool.textActive ||
    leave.stats.projectiles.active ||
    leave.stats.seen ||
    !cleanup.gameDestroyed ||
    cleanup.images ||
    cleanup.texts ||
    cleanup.active ||
    cleanup.listeners ||
    cleanup.seen
  )
    throw new Error("soak/cleanup checks failed");
  console.log(
    JSON.stringify({
      saved: "docs/v3-soak.json",
      network: report.network,
      cleanup,
      health,
      pageErrors: errors,
    }),
  );
} finally {
  await context.close();
  await browser.close();
}
