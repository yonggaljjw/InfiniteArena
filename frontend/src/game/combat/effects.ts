// 역할: 확정 hit/death/experience/level_up 이벤트의 작은 연출. EXP 표현은 수집 가능한 월드 아이템이 아닙니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import type { CombatEvent } from "../../shared/protocol";
import { EffectPool } from "./pool";
import { manifest } from "./assets";
export class DamageNumber {
  // 이 객체가 소유하는 Scene 참조와 표시 상태를 준비합니다. 종료 시 destroy/reset의 정리 범위를 확인하세요.
  constructor(private pool: EffectPool) {}
  // 서버 실제 HP 감소량을 본인 피해/본인 공격만 숫자로 표시하여 군중의 가독성을 유지합니다.
  show(e: CombatEvent, now: number, you: string) {
    if (e.damage === undefined) return;
    if (e.target === you)
      this.pool.number(
        now,
        e.x,
        e.y - 23,
        `-${Number(e.damage.toFixed(1))}`,
        "#ff887c",
        15,
      );
    else if (e.owner === you)
      this.pool.number(
        now,
        e.x,
        e.y - 23,
        `${Number(e.damage.toFixed(1))}`,
        "#ffe3a0",
      );
    // 본인과 무관한 PvP 피해 숫자는 생략하여 군중 속 시야를 유지합니다.
  }
}
export class HitEffect {
  // 이 객체가 소유하는 Scene 참조와 표시 상태를 준비합니다. 종료 시 destroy/reset의 정리 범위를 확인하세요.
  constructor(
    private pool: EffectPool,
    private fragments: number,
  ) {}
  // 확정 명중 좌표에 섬광/제한된 파편과 서버 피격 방향 힌트를 표시합니다.
  show(e: CombatEvent, now: number, you: string) {
    const spark = this.pool.image(
      now,
      e.x,
      e.y - 6,
      manifest.frames.hit,
      170,
      0.52,
      0.8,
    );
    if (spark) spark.image.setTint(e.target === you ? 0xff8f82 : 0xffffff);
    const angle = e.angle ?? 0;
    for (let i = 0; i < this.fragments; i++) {
      const p = this.pool.image(
        now,
        e.x,
        e.y,
        [0],
        270,
        0.6,
        0.25,
        "fx-shard",
        0.9,
      );
      if (p) {
        const a = angle + (i - (this.fragments - 1) / 2) * 0.55;
        p.vx = Math.cos(a) * 75;
        p.vy = Math.sin(a) * 75;
        p.gravity = 75;
        p.spin = i % 2 ? 8 : -8;
      }
    }
    // 작은 방향 표시는 서버가 준 피격 방향 힌트이며 추가 명중 판정이 아닙니다.
    if (e.angle !== null && e.angle !== undefined) {
      const p = this.pool.image(
        now,
        e.x - Math.cos(angle) * 22,
        e.y - Math.sin(angle) * 22,
        [0],
        180,
        0.65,
        0.3,
        "bolt-hostile",
        0.9,
      );
      if (p) p.angle = angle;
    }
  }
}
export class DeathEffect {
  // 이 객체가 소유하는 Scene 참조와 표시 상태를 준비합니다. 종료 시 destroy/reset의 정리 범위를 확인하세요.
  constructor(private pool: EffectPool) {}
  // 서버 target_kind에 따라 플레이어/몬스터 소멸 프레임과 지속 시간을 구분합니다.
  show(e: CombatEvent, now: number) {
    const player = e.target_kind === "player";
    this.pool.image(
      now,
      e.x,
      e.y - 8,
      player ? manifest.frames.playerDeath : manifest.frames.monsterDeath,
      player ? 620 : 420,
      player ? 0.8 : 0.65,
      player ? 1.05 : 0.9,
    );
  }
}
export class ExperienceEffect {
  // 이 객체가 소유하는 Scene 참조와 표시 상태를 준비합니다. 종료 시 destroy/reset의 정리 범위를 확인하세요.
  constructor(private pool: EffectPool) {}
  // 본인에게 직접 지급된 EXP/레벨업만 연출합니다. 서버에 없는 수집 구슬을 만들지 않습니다.
  show(e: CombatEvent, now: number, you: string) {
    if (e.owner !== you) return;
    if (e.kind === "experience") {
      const wisp = this.pool.image(
        now,
        e.x - 17,
        e.y + 8,
        manifest.frames.experience,
        350,
        0.38,
        0.05,
      );
      if (wisp) {
        wisp.vx = 48;
        wisp.vy = -24;
      }
      this.pool.number(
        now,
        e.x,
        e.y - 68,
        `+${e.amount ?? 0} EXP`,
        "#a8f2c9",
        12,
        620,
      );
    } else {
      this.pool.image(
        now,
        e.x,
        e.y + 12,
        manifest.frames.levelUp,
        700,
        0.65,
        1.4,
      );
      this.pool.number(
        now,
        e.x,
        e.y - 94,
        `LEVEL ${e.level ?? "UP"}`,
        "#ffe7a6",
        15,
        900,
      );
    }
  }
}
