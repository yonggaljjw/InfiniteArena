// 역할: 본인 이동 입력을 먼저 보여 주고 서버 ack 이후 미확인 입력을 재적용합니다. 최종 좌표 권한은 서버에 있습니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import type { PlayerState, Snapshot } from "../shared/protocol";
export class Prediction {
  x = 2048;
  y = 2048;
  private id = "";
  private pending: { seq: number; dx: number; dy: number }[] = [];
  private obstacles: Snapshot["obstacles"] = [];
  private speed = 220;
  private size = 4096;
  private alive = true;
  // 서버 좌표로 되돌린 뒤 처리 완료 seq보다 큰 입력만 재적용합니다. 사망/ID 변경 시 미확인 입력을 비웁니다.
  reconcile(player: PlayerState, snapshot: Snapshot) {
    if (this.id !== player.id || !player.alive || !this.alive)
      this.pending = [];
    this.id = player.id;
    this.speed = player.speed;
    this.size = snapshot.size;
    this.alive = player.alive;
    this.obstacles = snapshot.obstacles;
    this.x = player.x;
    this.y = player.y;
    this.pending = this.pending.filter((i) => i.seq > player.seq);
    for (const input of this.pending) this.move(input.dx, input.dy);
  }
  // 아직 서버가 처리하지 않은 입력을 최대 8개 보관하고 50ms 이동을 즉시 표시합니다.
  input(seq: number, dx: number, dy: number) {
    if (!this.alive) return;
    this.pending.push({ seq, dx, dy });
    this.pending = this.pending.slice(-8);
    this.move(dx, dy);
  }
  // 서버와 같은 반경 12·축별 충돌·정규화 이동을 적용합니다. 고정 50ms 가정은 송신 주기와 함께 변경해야 합니다.
  private move(dx: number, dy: number) {
    const length = Math.hypot(dx, dy);
    if (!length) return;
    const blocked = (x: number, y: number) =>
      this.obstacles.some(
        (o) =>
          o.x - 12 < x &&
          x < o.x + o.w + 12 &&
          o.y - 12 < y &&
          y < o.y + o.h + 12,
      );
    const nx = Math.min(
      this.size - 12,
      Math.max(12, this.x + (dx / length) * this.speed * 0.05),
    );
    const ny = Math.min(
      this.size - 12,
      Math.max(12, this.y + (dy / length) * this.speed * 0.05),
    );
    if (!blocked(nx, this.y)) this.x = nx;
    if (!blocked(this.x, ny)) this.y = ny;
  }
}
