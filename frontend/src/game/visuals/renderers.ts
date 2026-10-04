// 역할: 플레이어/몬스터 스프라이트·그림자·이름표·HP와 발 위치 depth. 서버 좌표와 그림의 발 좌표는 별개입니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import Phaser from "phaser";
import type { MonsterState, PlayerState } from "../../shared/protocol";
import { DEPTH, footDepth } from "../world/layout";
import { textureKey, type ActorKind } from "./assets";
import { animationKey } from "./animations";
import { EntityVisualState } from "./state";

class ActorRenderer {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly shadow: Phaser.GameObjects.Ellipse;
  readonly bar: Phaser.GameObjects.Rectangle;
  readonly barBack: Phaser.GameObjects.Rectangle;
  readonly visual: EntityVisualState;
  // 스프라이트·그림자·HP 객체를 생성합니다. 서버 중심을 유지하고 그림의 발은 y+16에서 정렬합니다.
  constructor(
    protected scene: Phaser.Scene,
    readonly kind: ActorKind,
    x: number,
    y: number,
  ) {
    this.sprite = scene.add.sprite(x, y, textureKey(kind), 0).setOrigin(0.5);
    // 시트의 발 기준은 (32,48)입니다. 서버 좌표는 기존 캐릭터 중심 그대로 유지합니다.
    this.shadow = scene.add
      .ellipse(x, y + 15, 25, 8, 0x071210, 0.45)
      .setDepth(DEPTH.shadow);
    this.barBack = scene.add
      .rectangle(x, y - 37, 34, 4, 0x12231f)
      .setDepth(DEPTH.labels);
    this.bar = scene.add
      .rectangle(x - 16, y - 37, 32, 2, kind === "player" ? 0x7fdbb5 : 0xc87365)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.labels + 1);
    this.visual = new EntityVisualState(scene.time.now);
  }
  // 위치를 보간한 뒤 방향/포즈·발 y-sort·그림자/HP·화면 culling을 함께 갱신합니다.
  update(
    time: number,
    delta: number,
    x: number,
    y: number,
    hp: number,
    maxHP: number,
    baseSpeed: number,
    tint: number,
  ) {
    const oldX = this.sprite.x,
      oldY = this.sprite.y,
      distance = Math.hypot(x - oldX, y - oldY);
    const teleport = distance > 150;
    const alpha = teleport
      ? 1
      : 1 - Math.exp(-delta / (this.kind === "player" ? 55 : 45));
    this.sprite.setPosition(
      Phaser.Math.Linear(oldX, x, alpha),
      Phaser.Math.Linear(oldY, y, alpha),
    );
    this.visual.motion(
      this.sprite.x - oldX,
      this.sprite.y - oldY,
      delta,
      time,
      teleport,
    );
    const key = animationKey(
      this.kind,
      this.visual.direction,
      this.visual.pose,
    );
    // 완료된 hit/death는 마지막 프레임을 유지하여 매 프레임 재시작되지 않게 합니다.
    if (this.sprite.anims.currentAnim?.key !== key) this.sprite.play(key);
    if (
      this.visual.deathAt !== null &&
      time - this.visual.deathAt >= 500 &&
      this.sprite.anims.isPlaying
    ) {
      const last = this.sprite.anims.currentAnim?.frames.at(-1);
      this.sprite.anims.stop();
      if (last) this.sprite.setFrame(last.frame.name);
    }
    this.sprite.anims.timeScale =
      this.visual.pose === "walk"
        ? Phaser.Math.Clamp(this.visual.speed / baseSpeed, 0.65, 1.65)
        : 1;
    const opacity = this.visual.alpha(time),
      alive = this.visual.deathAt === null;
    this.sprite
      .setAlpha(opacity)
      .setVisible(opacity > 0)
      .setTint(time < this.visual.hitUntil ? 0xffa7a0 : tint)
      .setDepth(footDepth(this.sprite.y + 16));
    this.shadow
      .setPosition(this.sprite.x, this.sprite.y + 15)
      .setAlpha(0.45 * opacity)
      .setScale(0.8 + 0.2 * opacity)
      .setVisible(opacity > 0);
    this.barBack
      .setPosition(this.sprite.x, this.sprite.y - 37)
      .setVisible(alive);
    this.bar
      .setPosition(this.sprite.x - 16, this.sprite.y - 37)
      .setScale(Phaser.Math.Clamp(hp / Math.max(1, maxHP), 0, 1), 1)
      .setVisible(alive);
    // 스프라이트와 이름표/HP는 같은 카메라 기준으로 화면 밖 표시를 생략합니다.
    const view = this.scene.cameras.main.worldView;
    const inView =
      Phaser.Geom.Rectangle.Contains(view, this.sprite.x, this.sprite.y) ||
      Phaser.Geom.Intersects.RectangleToRectangle(
        view,
        new Phaser.Geom.Rectangle(
          this.sprite.x - 40,
          this.sprite.y - 64,
          80,
          90,
        ),
      );
    if (!inView) {
      this.sprite.setVisible(false);
      this.shadow.setVisible(false);
      this.bar.setVisible(false);
      this.barBack.setVisible(false);
    }
    return inView && alive;
  }
  // 소유한 렌더링 객체와 구독을 해제합니다. 화면 전환 뒤 객체가 계속 갱신되지 않게 종료 경로에서 호출합니다.
  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
    this.bar.destroy();
    this.barBack.destroy();
  }
}
export class PlayerRenderer extends ActorRenderer {
  readonly label: Phaser.GameObjects.Text;
  state: PlayerState;
  // 플레이어 스프라이트와 이름표를 생성합니다. 폰트가 뒤늦게 준비되어도 제거된 객체를 다시 만지지 않습니다.
  constructor(scene: Phaser.Scene, state: PlayerState) {
    super(scene, "player", state.x, state.y);
    this.state = state;
    this.label = scene.add
      .text(state.x, state.y - 49, `${state.nickname} · Lv.${state.level}`, {
        fontFamily: "Noto Sans KR",
        fontSize: "11px",
        color: "#e8f4e9",
        stroke: "#10201b",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.labels + 2);
    const label = this.label;
    void document.fonts.load('11px "Noto Sans KR"', state.nickname).then(() => {
      if (label.active)
        label.setText(label.text + " ").setText(label.text.trimEnd());
    });
    if (!state.alive) this.visual.die(scene.time.now);
  }
  // 서버 alive/HP 변화로 피격·사망·리스폰을 표시하고 이름/레벨을 갱신합니다.
  apply(state: PlayerState, now: number) {
    if (!state.alive) this.visual.die(now);
    else if (!this.state.alive) this.visual.respawn(now);
    else if (state.hp < this.state.hp) this.visual.damage(now);
    const text = `${state.nickname} · Lv.${state.level}`;
    if (this.label.text !== text) this.label.setText(text);
    this.state = state;
  }
  // 서버 상태를 보간한 좌표에 스프라이트와 표시 요소를 갱신합니다. 월드의 실제 좌표는 수정하지 않습니다.
  render(
    time: number,
    delta: number,
    x: number,
    y: number,
    local: boolean,
    protectedPlayer: boolean,
  ) {
    const visible = super.update(
      time,
      delta,
      x,
      y,
      this.state.hp,
      this.state.max_hp,
      this.state.speed,
      local ? (protectedPlayer ? 0xbce8d6 : 0xffffff) : 0xe0c5eb,
    );
    this.label
      .setPosition(this.sprite.x, this.sprite.y - 49)
      .setVisible(visible);
  }
  // 소유한 렌더링 객체와 구독을 해제합니다. 화면 전환 뒤 객체가 계속 갱신되지 않게 종료 경로에서 호출합니다.
  override destroy() {
    this.label.destroy();
    super.destroy();
  }
}
export class MonsterRenderer extends ActorRenderer {
  state: MonsterState;
  removed = false;
  // 이 객체가 소유하는 Scene 참조와 표시 상태를 준비합니다. 종료 시 destroy/reset의 정리 범위를 확인하세요.
  constructor(scene: Phaser.Scene, state: MonsterState) {
    super(scene, "ghoul", state.x, state.y);
    this.state = state;
  }
  // 살아 있는 서버 목록에 다시 나타나면 표시 상태를 복원하고 HP 감소를 피격으로 표시합니다.
  apply(state: MonsterState, now: number) {
    if (this.removed) {
      this.removed = false;
      this.visual.respawn(now);
    } else if (state.hp < this.state.hp) this.visual.damage(now);
    this.state = state;
  }
  // 시각 사망 시작 시각을 한 번만 기록해 반복 스냅샷이 사망 애니메이션을 재시작하지 않게 합니다.
  die(now: number) {
    this.removed = true;
    this.visual.die(now);
  }
  // 서버 상태를 보간한 좌표에 스프라이트와 표시 요소를 갱신합니다. 월드의 실제 좌표는 수정하지 않습니다.
  render(time: number, delta: number) {
    super.update(
      time,
      delta,
      this.state.x,
      this.state.y,
      this.state.hp,
      this.state.max_hp,
      85,
      0xffffff,
    );
  }
  // 확정 사망 후 700ms가 지난 몬스터만 제거합니다. AOI 퇴장은 사망으로 추측하지 않습니다.
  expired(now: number) {
    return (
      this.removed &&
      this.visual.deathAt !== null &&
      now - this.visual.deathAt > 700
    );
  }
}
