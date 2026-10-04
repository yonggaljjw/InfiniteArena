// 역할: 입력·서버 스냅샷·V1 환경·V2 캐릭터·V3 효과를 연결하는 Scene. Vue HUD 생성은 담당하지 않습니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import Phaser from "phaser";
import { preloadAudio } from "../audio/manifest";
import { audio } from "../audio/service";
import { bridge, ui } from "../shared/bridge";
import { client } from "../network/client";
import { MovementInput } from "./input";
import { Prediction } from "./prediction";
import { Environment } from "./world/environment";
import { preloadEnvironment } from "./world/assets";
import { preloadCombat, ensureCombatTextures } from "./combat/assets";
import { CombatEffectManager } from "./combat/manager";
import type { Quality } from "./combat/pool";
import type { Snapshot } from "../shared/protocol";
import { preloadActors, ensureActorTextures } from "./visuals/assets";
import { registerActorAnimations } from "./visuals/animations";
import { PlayerRenderer, MonsterRenderer } from "./visuals/renderers";

export class ArenaScene extends Phaser.Scene {
  private entities = new Map<string, PlayerRenderer>();
  private monsters = new Map<string, MonsterRenderer>();
  private combat!: CombatEffectManager;
  private latest?: Snapshot;
  private movement!: MovementInput;
  private environment!: Environment;
  private prediction = new Prediction();
  // 이 객체가 소유하는 Scene 참조와 표시 상태를 준비합니다. 종료 시 destroy/reset의 정리 범위를 확인하세요.
  constructor() {
    super("Arena");
  }
  // V1 환경·V2 캐릭터·V3 효과 파일을 Scene 생성 전에 함께 로딩합니다.
  preload() {
    preloadEnvironment(this);
    preloadActors(this);
    preloadCombat(this);
    preloadAudio(this);
  }
  // 텍스처/효과/환경을 만들고 입력 50ms 송신·스냅샷·리사이즈 구독을 연결합니다. 종료 정리를 한 번만 실행합니다.
  create() {
    ensureActorTextures(this);
    registerActorAnimations(this);
    ensureCombatTextures(this);
    audio.attach(this);
    const selected = new URLSearchParams(window.location.search).get("effects");
    const quality: Quality =
      selected === "low" || selected === "high" ? selected : "normal";
    this.combat = new CombatEffectManager(this, quality);
    const unsubscribeEffects = this.combat.subscribe((e) => {
      audio.combat(e);
      if (e.kind === "hit" && e.target)
        (
          this.entities.get(e.target) ?? this.monsters.get(e.target)
        )?.visual.damage(this.time.now);
      if (e.kind === "death" && e.target_kind === "monster" && e.target)
        this.monsters.get(e.target)?.die(this.time.now);
    });
    this.environment = new Environment(this);
    this.cameras.main.setBounds(0, 0, 4096, 4096);
    this.cameras.main.setRoundPixels(true);
    const resize = () =>
      this.cameras.main.setZoom(
        Math.max(1, this.scale.width / 1800, this.scale.height / 1200),
      );
    resize();
    this.scale.on("resize", resize);
    this.movement = new MovementInput(this);
    // 렌더링 FPS와 입력 송신 주기를 분리합니다.
    const inputTimer = window.setInterval(() => {
      if (ui.playerId) {
        const [dx, dy] = this.movement.read();
        const seq = client.input(dx, dy);
        if (seq !== null) this.prediction.input(seq, dx, dy);
      }
    }, 50);
    const unsubscribe = bridge.subscribe((s) => this.apply(s));
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      this.events.off("shutdown", cleanup);
      this.events.off("destroy", cleanup);
      unsubscribe();
      unsubscribeEffects();
      window.clearInterval(inputTimer);
      this.scale.off("resize", resize);
      audio.detach();
      this.combat.destroy();
      this.environment.destroy();
      for (const e of this.entities.values()) e.destroy();
      for (const e of this.monsters.values()) e.destroy();
      this.entities.clear();
      this.monsters.clear();
      this.latest = undefined;
    };
    this.events.once("shutdown", cleanup);
    this.events.once("destroy", cleanup);
  }
  // 스냅샷에서 본인 예측을 보정한 뒤 엔티티 목록과 확정 효과를 갱신합니다. 다른 세션 패킷은 무시합니다.
  private apply(snapshot: Snapshot) {
    if (!ui.playerId || snapshot.you !== ui.playerId) return;
    this.latest = snapshot;
    const me = snapshot.players.find((p) => p.id === snapshot.you);
    if (me) this.prediction.reconcile(me, snapshot);
    this.environment.configure(snapshot);
    const visible = new Set(snapshot.players.map((p) => p.id));
    for (const [id, e] of this.entities)
      if (!visible.has(id)) {
        e.destroy();
        this.entities.delete(id);
      }
    for (const p of snapshot.players) {
      let e = this.entities.get(p.id);
      if (!e) {
        e = new PlayerRenderer(this, p);
        this.entities.set(p.id, e);
        if (p.id === snapshot.you)
          this.cameras.main.startFollow(e.sprite, true, 0.15, 0.15);
      } else e.apply(p, this.time.now);
    }
    const mids = new Set(snapshot.monsters.map((m) => m.id));
    for (const m of snapshot.monsters) {
      let e = this.monsters.get(m.id);
      if (!e) {
        e = new MonsterRenderer(this, m);
        this.monsters.set(m.id, e);
      } else e.apply(m, this.time.now);
    }
    audio.snapshot(snapshot);
    this.combat.consume(snapshot);
    for (const [id, e] of this.monsters)
      if (!mids.has(id) && !e.removed) {
        e.destroy();
        this.monsters.delete(id);
      }
  }

  // 프레임마다 표시 위치·효과·가림·culling을 갱신합니다. 서버 공격/HP 계산은 수행하지 않습니다.
  update(time: number, delta: number) {
    audio.update(delta);
    // 메뉴 뒤에서도 GameCanvas를 유지하므로 이전 세션의 엔티티/효과만 비웁니다.
    if (!ui.playerId && this.latest) {
      this.cameras.main.stopFollow();
      for (const e of this.entities.values()) e.destroy();
      for (const e of this.monsters.values()) e.destroy();
      this.entities.clear();
      this.monsters.clear();
      this.combat.reset();
      this.latest = undefined;
    }
    for (const [id, e] of this.entities) {
      const tx =
        id === ui.playerId && e.state.alive ? this.prediction.x : e.state.x;
      const ty =
        id === ui.playerId && e.state.alive ? this.prediction.y : e.state.y;
      e.render(
        time,
        delta,
        tx,
        ty,
        id === ui.playerId,
        Boolean(ui.snapshot?.protected),
      );
    }
    const me = this.entities.get(ui.playerId);
    this.combat.update(time, delta);
    if (this.latest)
      this.combat.projectiles.syncOrbit(
        this.latest.players,
        this.latest.you,
        (id) => this.entities.get(id)?.sprite,
      );
    for (const [id, e] of this.monsters) {
      if (e.expired(time)) {
        e.destroy();
        this.monsters.delete(id);
      } else e.render(time, delta);
    }
    this.environment.update(
      time,
      delta,
      me?.sprite.visible ? me.sprite : undefined,
      [...this.entities.values()]
        .filter((e) => e.sprite.visible)
        .map((e) => ({ x: e.sprite.x, y: e.sprite.y })),
    );
    this.registry.set("environmentStats", this.environment.stats());
    this.registry.set("combatStats", this.combat.stats());
  }
}
