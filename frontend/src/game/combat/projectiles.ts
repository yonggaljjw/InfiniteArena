// 역할: 서버 투사체 위치·속도·소유자·무기 종류를 이미지로 표시합니다. 목록에서 사라졌다고 명중 효과를 만들지 않습니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import Phaser from "phaser";
import type { PlayerState, ProjectileState } from "../../shared/protocol";
import { DEPTH } from "../world/layout";
interface Bullet {
  image: Phaser.GameObjects.Image;
  tail?: Phaser.GameObjects.Image;
  state: ProjectileState;
  angle: number;
}
export class ProjectileRenderer {
  readonly active = new Map<string, Bullet>();
  private free: Bullet[] = [];
  private allocated = 0;
  private trails = 0;
  private orbit = new Map<string, Phaser.GameObjects.Image>();
  // 이 객체가 소유하는 Scene 참조와 표시 상태를 준비합니다. 종료 시 destroy/reset의 정리 범위를 확인하세요.
  constructor(
    private scene: Phaser.Scene,
    private trailLimit: number,
  ) {}
  // 서버 투사체 ID 목록을 맞추고 사라진 객체를 풀로 반환합니다. 실제 명중은 별도 hit 이벤트로만 표시합니다.
  sync(states: ProjectileState[], you: string) {
    const ids = new Set(states.map((s) => s.id));
    for (const [id, b] of this.active)
      if (!ids.has(id)) {
        b.image.setVisible(false).setActive(false);
        b.tail?.setVisible(false).setActive(false);
        this.active.delete(id);
        this.free.push(b);
      }
    for (const state of states) {
      let b = this.active.get(state.id);
      if (!b) {
        b = this.free.pop();
        if (!b) {
          if (this.allocated >= 240) continue;
          const image = this.scene.add
            .image(state.x, state.y, "bolt-own")
            .setDepth(DEPTH.effects - 2);
          const tail =
            this.trails < this.trailLimit
              ? this.scene.add
                  .image(state.x, state.y, "bolt-own")
                  .setDepth(DEPTH.effects - 3)
              : undefined;
          if (tail) this.trails++;
          b = { image, tail, state, angle: 0 };
          this.allocated++;
        }
        this.active.set(state.id, b);
        b.image.setPosition(state.x, state.y).setActive(true);
        b.tail?.setPosition(state.x, state.y).setActive(true);
      }
      b.angle =
        state.vx !== undefined && state.vy !== undefined
          ? Math.atan2(state.vy, state.vx)
          : Math.atan2(state.y - b.state.y, state.x - b.state.x);
      b.state = state;
      const texture =
        state.owner && state.owner !== you
          ? "bolt-hostile"
          : state.kind === "spread"
            ? "bolt-spread"
            : "bolt-own";
      b.image.setTexture(texture).setRotation(b.angle).setScale(1).setAlpha(1);
      b.tail
        ?.setTexture(texture)
        .setRotation(b.angle)
        .setScale(0.7)
        .setAlpha(0.3);
    }
  }
  // 새 서버 위치를 45ms 기준으로 보간하고 화면 밖 이미지를 숨깁니다. 서버 위치 밖으로 외삽하지 않습니다.
  update(delta: number) {
    const view = this.scene.cameras.main.worldView,
      alpha = 1 - Math.exp(-delta / 45);
    for (const b of this.active.values()) {
      const px = b.image.x,
        py = b.image.y;
      b.image.setPosition(
        Phaser.Math.Linear(px, b.state.x, alpha),
        Phaser.Math.Linear(py, b.state.y, alpha),
      );
      const visible = view.contains(b.image.x, b.image.y);
      b.image.setVisible(visible);
      b.tail
        ?.setPosition(px, py)
        .setVisible(
          visible && Math.hypot(b.image.x - px, b.image.y - py) > 0.5,
        );
    }
  }
  // 서버가 해금한 회전 무기와 orbit_angle을 표시합니다. 중심 위치만 캐릭터 보간 좌표를 사용합니다.
  syncOrbit(
    players: PlayerState[],
    you: string,
    position: (id: string) => { x: number; y: number } | undefined,
  ) {
    const ids = new Set(
      players
        .filter((p) => p.alive && p.weapons.includes("orbit"))
        .map((p) => p.id),
    );
    for (const [id, image] of this.orbit)
      if (!ids.has(id)) {
        image.destroy();
        this.orbit.delete(id);
      }
    for (const p of players) {
      if (!ids.has(p.id)) continue;
      let image = this.orbit.get(p.id);
      if (!image) {
        image = this.scene.add
          .image(p.x, p.y, "orbit-blade")
          .setDepth(DEPTH.effects - 2);
        this.orbit.set(p.id, image);
      }
      const xy = position(p.id) ?? p;
      image
        .setPosition(
          xy.x + Math.cos(p.orbit_angle) * 70,
          xy.y + Math.sin(p.orbit_angle) * 70,
        )
        .setRotation(p.orbit_angle + Math.PI / 2)
        .setTint(p.id === you ? 0xffffff : 0xffb8ad)
        .setVisible(
          this.scene.cameras.main.worldView.contains(image.x, image.y),
        );
    }
  }
  // 할당/활성 객체와 이벤트 카운터를 관측용으로 반환합니다. 게임 판정에 사용하지 않습니다.
  stats() {
    return {
      active: this.active.size,
      allocated: this.allocated,
      free: this.free.length,
      trails: this.trails,
      orbits: this.orbit.size,
      limit: 240,
    };
  }
  // 현재 세션 표시를 비우되 풀 객체는 다음 세션에 재사용할 수 있도록 보존합니다.
  reset() {
    for (const b of this.active.values()) {
      b.image.setVisible(false).setActive(false);
      b.tail?.setVisible(false).setActive(false);
      this.free.push(b);
    }
    this.active.clear();
    for (const image of this.orbit.values()) image.destroy();
    this.orbit.clear();
  }
  // 소유한 렌더링 객체와 구독을 해제합니다. 화면 전환 뒤 객체가 계속 갱신되지 않게 종료 경로에서 호출합니다.
  destroy() {
    for (const b of [...this.active.values(), ...this.free]) {
      b.image.destroy();
      b.tail?.destroy();
    }
    for (const image of this.orbit.values()) image.destroy();
    this.active.clear();
    this.free.length = 0;
    this.orbit.clear();
  }
}
