// 역할: 실제 Phaser AudioContext 출력과 V5 연결/설정/풀 제한을 검사합니다.
// 표시 패킷 재생 검사는 실제 처치/성장 검사와 구분합니다. Chrome/Edge 설치판 검증으로 간주하지 않습니다.
import { expect, type Page } from "@playwright/test";
import { test } from "./support/isolatedArena";

async function inspect(page: Page) {
  return page.evaluate(async () => {
    const path = "/src/audio/service.ts";
    return (await import(path)).audio.stats();
  });
}
async function output(page: Page) {
  return page.evaluate(async () => {
    const sound = window.__ARENA_GAME__!.sound as any,
      context: AudioContext = sound.context;
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    sound.masterVolumeNode.connect(analyser);
    await new Promise((resolve) => setTimeout(resolve, 70));
    const values = new Float32Array(2048);
    analyser.getFloatTimeDomainData(values);
    sound.masterVolumeNode.disconnect(analyser);
    analyser.disconnect();
    return {
      state: context.state,
      rms: Math.sqrt(
        values.reduce((sum, value) => sum + value * value, 0) / values.length,
      ),
    };
  });
}
async function enter(page: Page, url: string) {
  await page.goto(url);
  if (!process.env.ARENA_URL)
    await expect
      .poll(async () => (await inspect(page)).status)
      .not.toBe("loading");
  await page.getByLabel("닉네임", { exact: true }).fill("오디오검증");
  await page.getByRole("button", { name: "월드 입장", exact: true }).click();
  await expect(page.getByText("접속 완료", { exact: true })).toBeVisible();
  await expect(page.locator(".game-menu-shell")).not.toBeVisible();
}

test("V5 실제 BGM 출력·교차 페이드·볼륨/음소거·저장·메뉴 복귀", async ({
  page,
  arenaUrl,
}) => {
  test.skip(Boolean(process.env.ARENA_URL), "개발 참조와 실제 출력 분석 전용");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(arenaUrl);
  await expect.poll(async () => (await inspect(page)).status).toBe("locked");
  expect((await inspect(page)).bgm.every((track: any) => !track.playing)).toBe(
    true,
  );
  await page.getByRole("button", { name: "클릭하여 사운드 활성화" }).click();
  await expect
    .poll(
      async () =>
        (await inspect(page)).bgm.filter((track: any) => track.playing).length,
    )
    .toBe(1);
  await page.waitForTimeout(1100);
  const menuSignal = await output(page);
  expect(menuSignal.state).toBe("running");
  expect(menuSignal.rms).toBeGreaterThan(0.001);
  await page.getByLabel("닉네임", { exact: true }).fill("음악검증");
  await page.getByRole("button", { name: "월드 입장", exact: true }).click();
  await expect(page.getByText("접속 완료", { exact: true })).toBeVisible();
  await expect.poll(async () => (await inspect(page)).desired).toBe("world");
  await page.waitForTimeout(1100);
  expect(
    (await inspect(page)).bgm
      .filter((track: any) => track.playing)
      .map((track: any) => track.id),
  ).toEqual(["world"]);
  const worldSignal = await output(page);
  expect(worldSignal.rms).toBeGreaterThan(0.001);
  await page.getByRole("button", { name: "설정", exact: true }).click();
  for (const [name, value] of [
    ["전체 볼륨", "50"],
    ["배경음악 볼륨", "25"],
    ["효과음 볼륨", "30"],
  ]) {
    await page
      .getByLabel(name, { exact: false })
      .filter({ hasNot: page.locator("[type=checkbox]") })
      .evaluate((element: HTMLInputElement, value) => {
        element.value = value;
        element.dispatchEvent(new Event("input", { bubbles: true }));
      }, value);
  }
  await expect
    .poll(
      async () =>
        (await inspect(page)).bgm.find((track: any) => track.id === "world")!
          .volume,
    )
    .toBe(0.25);
  expect(
    await page.evaluate(() => (window.__ARENA_GAME__!.sound as any).volume),
  ).toBe(0.5);
  await page.getByLabel("전체 음소거", { exact: true }).check();
  expect((await output(page)).rms).toBe(0);
  await page.screenshot({ path: "test-results/settings-v5.png" });
  await page.getByRole("button", { name: "완료", exact: true }).click();
  await page.getByRole("button", { name: "나가기", exact: true }).click();
  await page.waitForTimeout(1100);
  expect(
    (await inspect(page)).bgm
      .filter((track: any) => track.playing)
      .map((track: any) => track.id),
  ).toEqual(["menu"]);
  await page.reload();
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await expect(page.getByLabel("전체 음소거", { exact: true })).toBeChecked();
  await expect(page.locator("#audio-master")).toHaveValue("50");
  await expect(page.locator("#audio-bgm")).toHaveValue("25");
  await expect(page.locator("#audio-sfx")).toHaveValue("30");
  await page.getByLabel("전체 음소거", { exact: true }).uncheck();
  await page.getByRole("button", { name: "완료", exact: true }).click();
  await page.waitForTimeout(1100);
  expect((await output(page)).rms).toBeGreaterThan(0.001);
  expect(errors).toEqual([]);
});

test("V5 실제 몬스터 처치·EXP/레벨업·서버 강화 확정음", async ({
  page,
  arenaUrl,
}) => {
  test.skip(Boolean(process.env.ARENA_URL), "독립 seed83 실제 서버 전용");
  test.setTimeout(50000);
  await enter(page, arenaUrl);
  await page.evaluate(() => {
    (window.__ARENA_GAME__!.scene.getScene("Arena") as any).movement.read =
      () => [0, -1];
  });
  await page.waitForTimeout(1050);
  await page.evaluate(() => {
    (window.__ARENA_GAME__!.scene.getScene("Arena") as any).movement.read =
      () => [0, 0];
  });
  await expect(page.locator(".upgrade-card")).toHaveCount(3, {
    timeout: 30000,
  });
  const played = (await inspect(page)).played;
  for (const id of [
    "shot",
    "monster_hit",
    "monster_death",
    "experience",
    "level_up",
  ])
    expect(played[id as keyof typeof played]).toBeGreaterThan(0);
  await page.locator(".upgrade-card").first().click();
  await expect
    .poll(async () => (await inspect(page)).played.upgrade ?? 0)
    .toBe(1);
  expect((await inspect(page)).played.ui_click).toBeGreaterThan(0);
  const signal = await output(page);
  expect(signal.state).toBe("running");
  expect(signal.rms).toBeGreaterThan(0.001);
});

test("V5 실제 2인 PvP 피격·처치·사망·리스폰 사운드", async ({
  browser,
  arenaUrl,
}) => {
  test.skip(
    Boolean(process.env.ARENA_URL),
    "독립 실제 서버와 개발 입력 드라이버 검사",
  );
  test.setTimeout(50000);
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const pages = await Promise.all(contexts.map((context) => context.newPage()));
  const packets: any[] = [],
    deaths: any[] = [];
  try {
    for (const [i, page] of pages.entries()) {
      page.on("websocket", (ws) =>
        ws.on("framereceived", (e) => {
          const packet = JSON.parse(String(e.payload));
          if (packet.type === "snapshot") packets[i] = packet;
          for (const event of packet.combat_events ?? [])
            if (event.kind === "death" && event.target_kind === "player")
              deaths.push(event);
        }),
      );
      await enter(page, arenaUrl);
    }
    await expect.poll(() => packets.filter(Boolean).length).toBe(2);
    const ids = packets.map((packet) => packet.you);
    // 두 가상 키보드로 안전구역에서 충분히 떨어진 북쪽의 근접 좌표까지 이동합니다. 서버 좌표/HP/피해값은 주입하지 않습니다.
    // 몬스터보다 서로가 가까운 배치를 만들어 실제 서버의 최근접 자동 공격을 검증합니다.
    await Promise.all(
      pages.map((page, i) =>
        page.evaluate(
          (goal) => {
            const scene = window.__ARENA_GAME__!.scene.getScene("Arena") as any;
            scene.movement.read = () => {
              const p = scene.latest.players.find(
                (p: any) => p.id === scene.latest.you,
              );
              const dx = goal.x - p.x,
                dy = goal.y - p.y,
                distance = Math.hypot(dx, dy);
              return [
                Math.abs(dx) > 5 ? Math.sign(dx) : 0,
                Math.abs(dy) > 5 ? Math.sign(dy) : 0,
              ];
            };
          },
          { x: 2048 + i * 20, y: 1000 },
        ),
      ),
    );
    await expect
      .poll(
        () =>
          deaths.some(
            (e) =>
              ids.includes(e.owner) &&
              ids.includes(e.target) &&
              e.owner !== e.target,
          ),
        { timeout: 25000 },
      )
      .toBe(true);
    const event = deaths.find(
      (e) =>
        ids.includes(e.owner) && ids.includes(e.target) && e.owner !== e.target,
    );
    const winner = ids.indexOf(event.owner),
      loser = ids.indexOf(event.target);
    await expect
      .poll(async () => (await inspect(pages[winner])).played.pvp_kill ?? 0)
      .toBeGreaterThan(0);
    const winSounds = (await inspect(pages[winner])).played,
      loseSounds = (await inspect(pages[loser])).played;
    expect(winSounds.pvp_hit).toBeGreaterThan(0);
    expect(loseSounds.player_hit).toBeGreaterThan(0);
    expect(loseSounds.player_death).toBeGreaterThan(0);
    await pages[loser]
      .getByRole("button", { name: "다시 생존하기", exact: true })
      .click({ timeout: 10000 });
    await expect
      .poll(async () => (await inspect(pages[loser])).played.respawn ?? 0)
      .toBeGreaterThan(0);
  } finally {
    for (const context of contexts) await context.close();
  }
});

test("V5 이벤트 중복·거리 감쇠·우선순위·반복/동시 상한·탭 정책·해제", async ({
  page,
  arenaUrl,
}) => {
  test.skip(Boolean(process.env.ARENA_URL), "표시 재생과 수명 검사 전용");
  await enter(page, arenaUrl);
  const result = await page.evaluate(async () => {
    const path = "/src/audio/service.ts",
      { audio } = await import(path);
    const scene = window.__ARENA_GAME__!.scene.getScene("Arena") as any;
    const packet = scene.latest,
      p = packet.players.find((p: any) => p.id === packet.you),
      tick = packet.tick;
    scene.apply = () => {}; // 실제 전투와 표시 재생을 분리합니다.
    const event = {
      id: "sound-once",
      tick,
      kind: "hit",
      target: p.id,
      target_kind: "player",
      owner: "other",
      x: p.x,
      y: p.y,
      damage: 12,
    };
    const before = audio.stats().played.player_hit ?? 0;
    for (let i = 0; i < 50; i++)
      scene.combat.consume({
        ...packet,
        combat_epoch: "sound-replay",
        combat_events: [event],
      });
    const once = (audio.stats().played.player_hit ?? 0) - before;
    const tooFar = audio.play("shot", 651);
    // 종류별 제한을 확인한 후 모든 종류의 동시 요청으로 전역 상한을 검사합니다.
    for (let i = 0; i < 200; i++) audio.play("monster_death");
    for (const id of [
      "shot",
      "spread",
      "orbit",
      "monster_hit",
      "heavy_hit",
      "pvp_hit",
      "monster_death",
      "player_death",
      "pvp_kill",
      "experience",
      "level_up",
      "upgrade",
      "respawn",
      "ui_click",
      "ui_hover",
    ])
      audio.play(id);
    const stress = audio.stats();
    const nearVoice = (audio as any).voices.find((v: any) => v.id === "shot");
    const nearGain = nearVoice?.gain;
    for (const voice of (audio as any).voices) voice.sound.stop();
    (audio as any).last.clear();
    audio.play("shot", 370);
    const farGain = (audio as any).voices.find(
      (v: any) => v.id === "shot",
    ).gain;
    // 재사용 300회는 가상 요청 루프이며 30분 실제 플레이가 아닙니다.
    for (let i = 0; i < 300; i++) {
      for (const voice of (audio as any).voices) voice.sound.stop();
      (audio as any).last.clear();
      audio.play("shot");
    }
    const allocated = audio.stats().allocated;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    const hidden = audio.stats();
    delete (document as any).hidden;
    document.dispatchEvent(new Event("visibilitychange"));
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const visible = audio.stats();
    window.__ARENA_GAME__!.destroy(true);
    await new Promise((resolve) => setTimeout(resolve, 150));
    return {
      once,
      tooFar,
      nearGain,
      farGain,
      stress,
      allocated,
      hidden,
      visible,
      final: audio.stats(),
    };
  });
  expect(result.once).toBe(1);
  expect(result.tooFar).toBe(false);
  expect(result.farGain).toBeLessThan(result.nearGain);
  expect(result.stress.active).toBeLessThanOrEqual(12);
  expect(result.stress.dropped).toBeGreaterThan(100);
  expect(result.allocated).toBeLessThanOrEqual(result.stress.allocatedLimit);
  expect(result.hidden.active).toBe(0);
  expect(result.hidden.bgm.every((track: any) => !track.playing)).toBe(true);
  expect(result.visible.bgm.filter((track: any) => track.playing)).toHaveLength(
    1,
  );
  expect(result.final.allocated).toBe(0);
  expect(result.final.bgm).toHaveLength(0);
});

test("V5 음원 로딩 실패에도 실제 게임과 설정 유지", async ({
  page,
  arenaUrl,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/assets/audio/**", (route) =>
    /\.(ogg|mp3)(?:\?|$)/.test(route.request().url())
      ? route.abort()
      : route.continue(),
  );
  await enter(page, arenaUrl);
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await expect(
    page.getByText("오디오를 사용할 수 없습니다. 게임은 계속됩니다.", {
      exact: false,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

// OGG를 지원하지 않는 브라우저 조건에서 실제 MP3 다운로드·디코딩·출력을 확인합니다.
test("V5 MP3 대체 포맷의 실제 출력", async ({ page, arenaUrl }) => {
  test.skip(Boolean(process.env.ARENA_URL), "개발 출력 분석 전용");
  await page.addInitScript(() => {
    const original = HTMLMediaElement.prototype.canPlayType;
    HTMLMediaElement.prototype.canPlayType = function (type) {
      return /ogg/i.test(type) ? "" : original.call(this, type);
    };
  });
  const loaded: string[] = [];
  page.on("response", (response) => {
    if (/\.(mp3|ogg)$/.test(response.url()) && response.ok())
      loaded.push(response.url());
  });
  await page.goto(arenaUrl);
  await page.getByRole("button", { name: "클릭하여 사운드 활성화" }).click();
  await page.waitForTimeout(1100);
  expect(loaded.filter((url) => url.endsWith(".mp3"))).toHaveLength(18);
  expect(loaded.some((url) => url.endsWith(".ogg"))).toBe(false);
  expect((await output(page)).rms).toBeGreaterThan(0.001);
});
