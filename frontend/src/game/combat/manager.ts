// 역할: 서버 combat_events 중복 제거·유효 시간·화면 범위 검사 후 효과를 분배합니다. 예측 명중을 생성하지 않습니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import Phaser from "phaser";
import type { CombatEvent, Snapshot } from "../../shared/protocol";
import { EffectPool, BUDGETS, type Quality } from "./pool";
import {
  HitEffect,
  DamageNumber,
  DeathEffect,
  ExperienceEffect,
} from "./effects";
import { manifest } from "./assets";
import { ProjectileRenderer } from "./projectiles";

export class CombatEffectManager {
  readonly projectiles: ProjectileRenderer;
  readonly pool: EffectPool;
  private seen = new Map<string, number>();
  private listeners = new Set<(e: CombatEvent) => void>();
  private epoch = "";
  private hit: HitEffect;
  private numbers: DamageNumber;
  private death: DeathEffect;
  private experience: ExperienceEffect;
  private lastShake = -1000;
  private counts: Record<CombatEvent["kind"], number> = {
    fire: 0,
    hit: 0,
    death: 0,
    experience: 0,
    level_up: 0,
  };
  private skipped = 0;
  // 효과 품질별 예산으로 공유 풀과 투사체 렌더러를 생성합니다.
  constructor(
    private scene: Phaser.Scene,
    readonly quality: Quality = "normal",
  ) {
    const budget = BUDGETS[quality];
    this.pool = new EffectPool(scene, budget);
    this.projectiles = new ProjectileRenderer(scene, budget.trails);
    this.hit = new HitEffect(this.pool, budget.fragments);
    this.numbers = new DamageNumber(this.pool);
    this.death = new DeathEffect(this.pool);
    this.experience = new ExperienceEffect(this.pool);
  }
  // 효과 이벤트 구독 해제 함수를 반환합니다. Scene 종료 시 반드시 호출하여 누적 구독을 막습니다.
  subscribe(fn: (e: CombatEvent) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  // 서버 epoch/이벤트 ID로 중복 제거하고 8tick이 지난 연출과 화면 밖 효과를 생략합니다.
  consume(snapshot: Snapshot) {
    const epoch = snapshot.combat_epoch ?? "legacy";
    if (this.epoch !== epoch) {
      this.seen.clear();
      this.pool.reset();
      this.projectiles.reset();
      this.epoch = epoch;
    }
    this.projectiles.sync(snapshot.projectiles, snapshot.you);
    const now = this.scene.time.now;
    for (const [id, t] of this.seen) if (now - t > 2200) this.seen.delete(id);
    for (const e of snapshot.combat_events ?? []) {
      if (this.seen.has(e.id)) continue;
      this.seen.set(e.id, now);
      // 0.4초 이벤트 이력으로 일부 스냅샷 소실을 보완합니다.
      // 이보다 오래된 이벤트 ID는 확인하되 뒤늦은 피격 연출을 재생하지 않습니다.
      if (snapshot.tick - e.tick > 8) {
        this.skipped++;
        continue;
      }
      this.counts[e.kind]++;
      for (const listener of this.listeners) listener(e);
      const personal =
        e.owner === snapshot.you &&
        (e.kind === "experience" || e.kind === "level_up");
      const view = this.scene.cameras.main.worldView;
      if (
        !personal &&
        !new Phaser.Geom.Rectangle(
          view.x - 64,
          view.y - 64,
          view.width + 128,
          view.height + 128,
        ).contains(e.x, e.y)
      ) {
        this.skipped++;
        continue;
      }
      if (e.kind === "fire") {
        const angle = e.angle ?? 0,
          p = this.pool.image(
            now,
            e.x + Math.cos(angle) * 14,
            e.y + Math.sin(angle) * 14 - 6,
            manifest.frames.muzzle,
            130,
            0.38,
            0.15,
          );
        if (p) {
          p.angle = angle;
          if (e.owner !== snapshot.you) p.image.setTint(0xffa49a);
        }
      } else if (e.kind === "hit") {
        this.hit.show(e, now, snapshot.you);
        this.numbers.show(e, now, snapshot.you);
        if (
          e.target === snapshot.you &&
          this.quality !== "low" &&
          now - this.lastShake > 400
        ) {
          this.scene.cameras.main.shake(70, 0.0012);
          this.lastShake = now;
        }
      } else if (e.kind === "death") this.death.show(e, now);
      else {
        const p = snapshot.players.find((p) => p.id === snapshot.you);
        this.experience.show(
          personal && p ? { ...e, x: p.x, y: p.y } : e,
          now,
          snapshot.you,
        );
        if (e.kind === "level_up" && e.owner === snapshot.you)
          this.scene.events.emit("arena:level-up", {
            id: e.id,
            level: e.level,
            offerId: e.offer_id,
          });
      }
    }
    // 표시 재생이나 비정상 이벤트 이력에도 중복 확인 메모리가 상한을 넘지 않게 합니다.
    while (this.seen.size > 2048)
      this.seen.delete(this.seen.keys().next().value!);
  }
  // 프레임마다 표시 위치·효과·가림·culling을 갱신합니다. 서버 공격/HP 계산은 수행하지 않습니다.
  update(now: number, delta: number) {
    this.projectiles.update(delta);
    this.pool.update(now);
  }
  // 할당/활성 객체와 이벤트 카운터를 관측용으로 반환합니다. 게임 판정에 사용하지 않습니다.
  stats() {
    return {
      quality: this.quality,
      pool: this.pool.stats(),
      projectiles: this.projectiles.stats(),
      seen: this.seen.size,
      seenLimit: 2048,
      events: { ...this.counts },
      skipped: this.skipped,
      listeners: this.listeners.size,
      tweens: 0,
    };
  }
  // 현재 세션 표시를 비우되 풀 객체는 다음 세션에 재사용할 수 있도록 보존합니다.
  reset() {
    this.seen.clear();
    this.pool.reset();
    this.projectiles.reset();
    this.epoch = "";
  }
  // 소유한 렌더링 객체와 구독을 해제합니다. 화면 전환 뒤 객체가 계속 갱신되지 않게 종료 경로에서 호출합니다.
  destroy() {
    this.listeners.clear();
    this.seen.clear();
    this.projectiles.destroy();
    this.pool.destroy();
  }
}
