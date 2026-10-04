// 역할: V3 이벤트 표시·중복 방지·효과 상한·240 투사체·객체 재사용·Scene 종료 검사. 일부는 표시 패킷 재생입니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import { test, expect } from "@playwright/test";

// 게스트 입장을 요청하고 첫 서버 스냅샷을 기다립니다. 화면 검사는 확정 응답 이후 시작합니다.
async function join(page: any) {
  let snapshot: any;
  page.on("websocket", (ws: any) =>
    ws.on("framereceived", (e: any) => {
      const d = JSON.parse(String(e.payload));
      if (d.type === "snapshot") snapshot = d;
    }),
  );
  await page.goto("/");
  await page.getByLabel("닉네임").fill("효과검증");
  await page.getByRole("button", { name: "월드 입장" }).click();
  await expect(page.getByText("접속 완료", { exact: true })).toBeVisible();
  await expect.poll(() => Boolean(snapshot?.combat_epoch)).toBe(true);
  return snapshot;
}

test("V3 확정 이벤트 재생·중복 방지·색/형태·EXP·레벨업", async ({ page }) => {
  test.skip(Boolean(process.env.ARENA_URL), "개발 서버 표시 재생 전용");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const snapshot = await join(page);
  const result = await page.evaluate((snapshot) => {
    const game = window.__ARENA_GAME__!,
      s = game.scene.getScene("Arena") as any;
    s.apply = () => {};
    const you = snapshot.you,
      p = s.entities.get(you).sprite,
      tick = snapshot.tick;
    let levelEvents = 0;
    s.events.on("arena:level-up", () => {
      levelEvents++;
    });
    const base = { tick, x: p.x, y: p.y, owner: you };
    const events = [
      {
        ...base,
        id: "fx:1",
        kind: "fire",
        angle: 0,
        weapon: "spread",
        shot_ids: ["shot-own"],
      },
      {
        ...base,
        id: "fx:2",
        kind: "hit",
        target: you,
        target_kind: "player",
        owner: "enemy",
        angle: Math.PI,
        damage: 12.12,
        hp: 87.88,
      },
      {
        ...base,
        id: "fx:3",
        kind: "hit",
        target: "monster",
        target_kind: "monster",
        damage: 15,
        hp: 0,
      },
      {
        ...base,
        id: "fx:4",
        kind: "death",
        target: "monster",
        target_kind: "monster",
      },
      { ...base, id: "fx:5", kind: "experience", amount: 15 },
      { ...base, id: "fx:6", kind: "level_up", level: 2, offer_id: 9 },
    ];
    const projectiles = [
      {
        id: "shot-own",
        x: p.x + 30,
        y: p.y,
        owner: you,
        vx: 480,
        vy: 0,
        kind: "spread",
      },
      {
        id: "shot-enemy",
        x: p.x + 40,
        y: p.y + 10,
        owner: "enemy",
        vx: -480,
        vy: 0,
        kind: "bullet",
      },
    ];
    const packet = {
      ...snapshot,
      combat_epoch: "fx",
      combat_events: events,
      projectiles,
    };
    const before = s.combat.stats().events;
    for (let i = 0; i < 20; i++) s.combat.consume(packet);
    s.combat.update(s.time.now, 16);
    const bullets = [...s.combat.projectiles.active.values()].map((b: any) => [
      b.image.texture.key,
      b.image.rotation,
    ]);
    const active = s.combat.pool.texts
      .filter((t: any) => t.live)
      .map((t: any) => t.text.text);
    const counts = s.combat.stats().events;
    const delta = Object.fromEntries(
      Object.keys(counts).map((k) => [k, counts[k] - before[k]]),
    );
    return {
      delta,
      levelEvents,
      bullets,
      active,
      atlas: game.textures.get("fx-v3").getSourceImage().width,
      stats: s.combat.stats(),
    };
  }, snapshot);
  expect(result.delta).toEqual({
    fire: 1,
    hit: 2,
    death: 1,
    experience: 1,
    level_up: 1,
  });
  expect(result.levelEvents).toBe(1);
  expect(result.atlas).toBe(256);
  expect(result.bullets[0][0]).toBe("bolt-spread");
  expect(result.bullets[1][0]).toBe("bolt-hostile");
  expect(Math.abs(Number(result.bullets[1][1]))).toBeCloseTo(Math.PI);
  expect(result.active).toEqual(
    expect.arrayContaining(["-12.1", "15", "+15 EXP", "LEVEL 2"]),
  );
  await page.screenshot({ path: "test-results/combat-replay-v3.png" });
  expect(errors).toEqual([]);
});

test("V3 240투사체·포화 풀·300회 재사용·소실은 명중 아님", async ({ page }) => {
  test.skip(Boolean(process.env.ARENA_URL), "개발 서버 표시 부하 전용");
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const snapshot = await join(page);
  const result = await page.evaluate((snapshot) => {
    const s = window.__ARENA_GAME__!.scene.getScene("Arena") as any;
    s.apply = () => {};
    const p = s.entities.get(snapshot.you).sprite,
      now = s.time.now;
    const projectile = (id: string) => ({
      id,
      x: p.x + 20,
      y: p.y,
      owner: snapshot.you,
      vx: 480,
      vy: 0,
      kind: "bullet",
    });
    const packets = {
      ...snapshot,
      combat_epoch: "stress",
      combat_events: [],
      projectiles: Array.from({ length: 240 }, (_, i) => projectile("b" + i)),
    };
    s.combat.consume(packets);
    const initial = s.combat.stats();
    const baselineObjects = s.children.length;
    let warmObjects = 0;
    for (let cycle = 0; cycle < 300; cycle++) {
      const tick = snapshot.tick + cycle * 20;
      const events = Array.from({ length: 100 }, (_, i) => ({
        id: `stress:${cycle}:${i}`,
        tick,
        x: p.x,
        y: p.y,
        kind: "hit",
        owner: snapshot.you,
        target: "monster",
        damage: 16,
        angle: 0,
        target_kind: "monster",
      }));
      s.combat.consume({ ...packets, tick, combat_events: events });
      s.combat.update(now + 2000, 16); // repeated virtual expiry; not wall-time play
      if (cycle === 5) warmObjects = s.children.length;
    }
    const peak = s.combat.stats();
    s.combat.consume({
      ...packets,
      tick: snapshot.tick + 6000,
      combat_events: [],
      projectiles: [],
    });
    s.combat.update(now + 2000, 16);
    const after = s.combat.stats();
    const objects = s.children.length;
    const hitCount = after.events.hit;
    s.combat.consume({
      ...packets,
      tick: snapshot.tick + 6001,
      combat_events: [],
      projectiles: [],
    });
    return {
      initial,
      peak,
      after,
      objects,
      warmObjects,
      baselineObjects,
      noFalseHits: s.combat.stats().events.hit === hitCount,
      tweens: s.tweens.getTweens().length,
      timers: s.time._active.length + s.time._pendingInsertion.length,
    };
  }, snapshot);
  expect(result.initial.projectiles.active).toBe(240);
  expect(result.peak.pool.spriteAllocated).toBeLessThanOrEqual(192);
  expect(result.peak.pool.textAllocated).toBeLessThanOrEqual(40);
  expect(result.peak.seen).toBeLessThanOrEqual(2048);
  expect(result.peak.pool.dropped).toBeGreaterThan(0);
  expect(result.after.pool.spriteActive).toBe(0);
  expect(result.after.pool.textActive).toBe(0);
  expect(result.after.projectiles.active).toBe(0);
  expect(result.after.projectiles.allocated).toBe(240);
  expect(result.objects).toBe(result.warmObjects);
  expect(result.noFalseHits).toBe(true);
  expect(result.tweens).toBe(0);
  expect(result.timers).toBe(0);
  expect(errors).toEqual([]);
});

test("V3 Game.destroy에서 Scene 구독·풀·객체 완전 정리", async ({ page }) => {
  let inputs = 0;
  page.on("websocket", (ws) =>
    ws.on("framesent", (e) => {
      try {
        if (JSON.parse(String(e.payload)).type === "input") inputs++;
      } catch {}
    }),
  );
  test.skip(Boolean(process.env.ARENA_URL), "개발 서버 수명 검사");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await join(page);
  await page.evaluate(() => {
    const g = window.__ARENA_GAME__!,
      s = g.scene.getScene("Arena") as any;
    (window as any).__fxDestroyed = s.combat;
    const p = s.entities.get(s.latest.you).sprite;
    s.combat.pool.image(s.time.now, p.x, p.y, [4], 1000, 0.5);
    s.combat.pool.number(s.time.now, p.x, p.y, "16", "#ffe3a0");
    s.combat.projectiles.sync(
      [
        {
          id: "destroy-shot",
          x: p.x,
          y: p.y,
          owner: s.latest.you,
          vx: 480,
          vy: 0,
          kind: "bullet",
        },
      ],
      s.latest.you,
    );
    g.destroy(true);
  });
  await expect
    .poll(() => page.evaluate(() => !window.__ARENA_GAME__))
    .toBe(true);
  const stopped = inputs;
  await page.waitForTimeout(500);
  expect(inputs).toBe(stopped);
  expect(
    await page.evaluate(() => {
      const c = (window as any).__fxDestroyed;
      return [
        c.pool.slots.length,
        c.pool.texts.length,
        c.projectiles.active.size,
        c.stats().listeners,
        c.stats().seen,
      ];
    }),
  ).toEqual([0, 0, 0, 0, 0]);
  expect(errors).toEqual([]);
});
