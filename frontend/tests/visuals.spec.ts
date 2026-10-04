// 역할: V2 실제 PNG·방향별 상태·피격·사망·리스폰·AOI 정리 검사. 일부 시각 상태는 재생합니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import { test, expect } from "@playwright/test";

test("V2 실제 PNG·4방향 애니메이션·피격·사망·리스폰·정리", async ({ page }) => {
  test.setTimeout(60000);
  test.skip(Boolean(process.env.ARENA_URL), "개발 서버의 렌더러 검사 전용");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let playerId = "";
  page.on("websocket", (ws) =>
    ws.on("framereceived", (e) => {
      const d = JSON.parse(String(e.payload));
      if (d.type === "welcome") playerId = d.player_id;
    }),
  );
  await page.goto("/");
  await page.getByLabel("닉네임").fill("기사검증");
  await page.getByRole("button", { name: "월드 입장" }).click();
  await expect(page.getByText("접속 완료", { exact: true })).toBeVisible();
  await expect.poll(() => playerId).not.toBe("");
  await page.evaluate((id) => {
    window.__ARENA_GAME__!.registry.set("visualTestPlayerId", id);
  }, playerId);
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(
          (window.__ARENA_GAME__!.scene.getScene("Arena") as any).entities.size,
        ),
      ),
    )
    .toBe(true);
  const assets = await page.evaluate(() => {
    const g = window.__ARENA_GAME__!,
      s = g.scene.getScene("Arena") as any,
      e = s.entities.get(
        window.__ARENA_GAME__!.registry.get("visualTestPlayerId"),
      ) as any;
    return {
      player: g.textures.get("actor-player-v2").getSourceImage().width,
      monster: g.textures.get("actor-ghoul-v2").getSourceImage().width,
      frame: e.sprite.frame.width,
      animations: ["player", "ghoul"].flatMap((k) =>
        ["down", "left", "right", "up"].flatMap((d) =>
          ["idle", "walk", "hit", "death"].map((p) => {
            const a = g.anims.get(`${k}-${d}-${p}-v2`);
            return [a.frames.length, a.repeat];
          }),
        ),
      ),
    };
  });
  expect(assets.player).toBe(512);
  expect(assets.monster).toBe(512);
  expect(assets.frame).toBe(64);
  expect(assets.animations).toHaveLength(32);
  for (let i = 0; i < 32; i += 4)
    expect(assets.animations.slice(i, i + 4)).toEqual([
      [4, -1],
      [6, -1],
      [2, 0],
      [4, 0],
    ]);
  // 표시 패킷 재생은 이전 테스트에서 쌓인 실제 전투 상태와 분리합니다.
  await page.evaluate(() => {
    (window.__ARENA_GAME__!.scene.getScene("Arena") as any).apply = () => {};
  });
  await page.bringToFront();
  await page.locator("canvas").click({ position: { x: 640, y: 400 } });
  for (const [key, direction] of [
    ["KeyD", "right"],
    ["KeyS", "down"],
    ["KeyA", "left"],
    ["KeyW", "up"],
  ]) {
    await page.keyboard.down(key);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const e = (
            window.__ARENA_GAME__!.scene.getScene("Arena") as any
          ).entities.get(
            window.__ARENA_GAME__!.registry.get("visualTestPlayerId"),
          ) as any;
          return [e.visual.direction, e.visual.pose];
        }),
      )
      .toEqual([direction, "walk"]);
    await page.keyboard.up(key);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window.__ARENA_GAME__!.scene.getScene("Arena") as any
            ).entities.get(
              window.__ARENA_GAME__!.registry.get("visualTestPlayerId"),
            ).visual.pose,
        ),
      )
      .toBe("idle");
  }
  // 시각 계층에만 상태 전이를 재생합니다. 실제 서버에서 처치한 결과로 해석하지 않으며
  // 서버 전투 판정은 별도 회귀 테스트로 검사합니다.
  const hit = await page.evaluate(() => {
    const s = window.__ARENA_GAME__!.scene.getScene("Arena") as any;
    s.apply = () => {};
    const e = s.entities.get(
      window.__ARENA_GAME__!.registry.get("visualTestPlayerId"),
    ) as any;
    e.apply({ ...e.state, hp: e.state.hp - 10 }, s.time.now);
    e.render(s.time.now, 16, e.sprite.x, e.sprite.y, true, false);
    return e.visual.pose;
  });
  expect(hit).toBe("hit");
  await page.waitForTimeout(260);
  await page.evaluate(() => {
    const s = window.__ARENA_GAME__!.scene.getScene("Arena") as any,
      e = s.entities.get(
        window.__ARENA_GAME__!.registry.get("visualTestPlayerId"),
      ) as any;
    e.apply({ ...e.state, hp: 0, alive: false }, s.time.now);
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window.__ARENA_GAME__!.scene.getScene("Arena") as any).entities.get(
            window.__ARENA_GAME__!.registry.get("visualTestPlayerId"),
          ).visual.pose,
      ),
    )
    .toBe("death");
  await page.waitForTimeout(850);
  expect(
    await page.evaluate(() => {
      const e = (
        window.__ARENA_GAME__!.scene.getScene("Arena") as any
      ).entities.get(
        window.__ARENA_GAME__!.registry.get("visualTestPlayerId"),
      ) as any;
      return {
        visible: e.sprite.visible,
        bar: e.bar.visible,
        playing: e.sprite.anims.isPlaying,
      };
    }),
  ).toEqual({ visible: false, bar: false, playing: false });
  await page.evaluate(() => {
    const s = window.__ARENA_GAME__!.scene.getScene("Arena") as any,
      e = s.entities.get(
        window.__ARENA_GAME__!.registry.get("visualTestPlayerId"),
      ) as any;
    e.apply({ ...e.state, hp: 100, alive: true }, s.time.now);
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window.__ARENA_GAME__!.scene.getScene("Arena") as any).entities.get(
            window.__ARENA_GAME__!.registry.get("visualTestPlayerId"),
          ).sprite.visible,
      ),
    )
    .toBe(true);
  await page.waitForTimeout(350);
  expect(
    await page.evaluate(
      () =>
        (window.__ARENA_GAME__!.scene.getScene("Arena") as any).entities.get(
          window.__ARENA_GAME__!.registry.get("visualTestPlayerId"),
        ).sprite.alpha,
    ),
  ).toBe(1);
  // 엔티티 제거 시 렌더링 객체는 해제하지만 공통 애니메이션 정의는 유지합니다.
  const cleanup = await page.evaluate(() => {
    const s = window.__ARENA_GAME__!.scene.getScene("Arena") as any,
      e = s.entities.get(
        window.__ARENA_GAME__!.registry.get("visualTestPlayerId"),
      ) as any;
    const objects = [e.sprite, e.shadow, e.label, e.bar, e.barBack];
    e.destroy();
    s.entities.clear();
    return objects.every((o) => !o.active);
  });
  expect(cleanup).toBe(true);
  expect(errors).toEqual([]);
});

test("V2 몬스터 피격·사망 정리와 AOI 퇴장 구분", async ({ page }) => {
  test.skip(Boolean(process.env.ARENA_URL), "개발 서버의 렌더러 검사 전용");
  let snapshot: any;
  page.on("websocket", (ws) =>
    ws.on("framereceived", (e) => {
      const d = JSON.parse(String(e.payload));
      if (d.type === "snapshot") snapshot = d;
    }),
  );
  await page.goto("/");
  await page.getByLabel("닉네임").fill("몬스터검증");
  await page.getByRole("button", { name: "월드 입장" }).click();
  await expect
    .poll(() => snapshot?.monsters.length ?? 0, { timeout: 15000 })
    .toBeGreaterThan(0);
  await page.evaluate(() => {
    const s = window.__ARENA_GAME__!.scene.getScene("Arena") as any;
    s.replay = s.apply.bind(s);
    s.apply = () => {};
  });
  const sample = snapshot.monsters[0],
    id = sample.id;
  const hit = await page.evaluate(
    ({ id }) => {
      const s = window.__ARENA_GAME__!.scene.getScene("Arena") as any,
        e = s.monsters.get(id);
      e.apply({ ...e.state, hp: e.state.hp - 5 }, s.time.now);
      e.render(s.time.now, 16);
      return e.visual.pose;
    },
    { id },
  );
  expect(hit).toBe("hit");
  await page.evaluate((id) => {
    const s = window.__ARENA_GAME__!.scene.getScene("Arena") as any;
    s.monsters.get(id).die(s.time.now);
  }, id);
  await expect
    .poll(() =>
      page.evaluate(
        (id) =>
          (window.__ARENA_GAME__!.scene.getScene("Arena") as any).monsters.has(
            id,
          ),
        id,
      ),
    )
    .toBe(false);
  // AOI 밖으로 나간 몬스터는 즉시 제거합니다. 사망 이벤트가 없으므로 시체를 만들지 않습니다.
  const me = snapshot.players.find((p: any) => p.id === snapshot.you);
  const outside = { ...sample, id: "aoi-visual-test", x: me.x + 1000, y: me.y };
  const cleanup = await page.evaluate(
    ({ snapshot, outside }) => {
      const s = window.__ARENA_GAME__!.scene.getScene("Arena") as any;
      s.replay({ ...snapshot, monsters: [outside] });
      const renderer = s.monsters.get(outside.id),
        objects = [
          renderer.sprite,
          renderer.shadow,
          renderer.bar,
          renderer.barBack,
        ];
      s.replay({ ...snapshot, monsters: [] });
      return {
        removed: !s.monsters.has(outside.id),
        destroyed: objects.every((o) => !o.active),
      };
    },
    { snapshot, outside },
  );
  expect(cleanup).toEqual({ removed: true, destroyed: true });
});
