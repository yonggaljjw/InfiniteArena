// 역할: 방향·걷기·피격·사망·등장 투명도의 시각 상태. HP·충돌·리스폰 판정을 수행하지 않습니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import type { Direction, Pose } from "./animations";
// 가장 큰 이동 축으로 4방향을 고릅니다. 미세 움직임/정지에서는 이전 방향을 유지합니다.
export function facing(dx: number, dy: number, previous: Direction): Direction {
  if (Math.abs(dx) + Math.abs(dy) < 0.01) return previous;
  return Math.abs(dx) > Math.abs(dy)
    ? dx > 0
      ? "right"
      : "left"
    : dy > 0
      ? "down"
      : "up";
}
/** 화면 상태만 관리하며 HP·충돌·피해·리스폰의 권한은 서버에 있습니다. */
export class EntityVisualState {
  direction: Direction = "down";
  pose: Pose = "idle";
  speed = 0;
  hitUntil = 0;
  deathAt: number | null = null;
  spawnAt: number;
  // 등장 시각만 보관하고 시각 상태를 시작합니다. 서버 체력/좌표는 소유하지 않습니다.
  constructor(now: number) {
    this.spawnAt = now;
  }
  // 살아 있는 시각 상태에만 200ms 피격 포즈/틴트를 적용합니다. 체력 계산은 하지 않습니다.
  damage(now: number) {
    if (this.deathAt === null) this.hitUntil = now + 200;
  }
  // 시각 사망 시작 시각을 한 번만 기록해 반복 스냅샷이 사망 애니메이션을 재시작하지 않게 합니다.
  die(now: number) {
    if (this.deathAt === null) {
      this.deathAt = now;
      this.hitUntil = 0;
      this.pose = "death";
    }
  }
  // 서버의 생존 복구에 따라 시각 사망/피격 시각만 초기화합니다. 실제 HP를 회복시키지 않습니다.
  respawn(now: number) {
    this.deathAt = null;
    this.hitUntil = 0;
    this.spawnAt = now;
    this.pose = "idle";
    this.speed = 0;
  }
  // 보간 이동 속도로 idle/walk를 고르고 death→hit 우선순위를 유지합니다. 큰 순간이동은 걷기로 표현하지 않습니다.
  motion(
    dx: number,
    dy: number,
    delta: number,
    now: number,
    teleport: boolean,
  ) {
    this.speed = teleport
      ? 0
      : (Math.hypot(dx, dy) * 1000) / Math.max(delta, 1);
    if (this.deathAt !== null) {
      this.pose = "death";
      return;
    }
    if (now < this.hitUntil) {
      this.pose = "hit";
      return;
    }
    if (this.speed > 8) this.direction = facing(dx, dy, this.direction);
    this.pose = this.speed > 8 ? "walk" : "idle";
  }
  // 등장 시 짧게 밝아지고 사망 끝부분에서 사라지는 투명도를 계산합니다. 상태 판정용 값이 아닙니다.
  alpha(now: number) {
    if (this.deathAt !== null)
      return Math.max(0, Math.min(1, (700 - (now - this.deathAt)) / 200));
    return Math.min(1, 0.25 + (now - this.spawnAt) / 280);
  }
}
