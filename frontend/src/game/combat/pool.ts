// 역할: 고정 상한 안에서 이미지/텍스트를 재사용합니다. 개별 효과마다 Tween/타이머를 만들지 않습니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import Phaser from "phaser";
import { DEPTH } from "../world/layout";
export type Quality = "low" | "normal" | "high";
export const BUDGETS = {
  low: { sprites: 64, texts: 16, trails: 24, fragments: 2 },
  normal: { sprites: 192, texts: 40, trails: 100, fragments: 4 },
  high: { sprites: 320, texts: 64, trails: 200, fragments: 7 },
};
export interface ImageMotion {
  image: Phaser.GameObjects.Image;
  live: boolean;
  start: number;
  life: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale0: number;
  scale1: number;
  alpha: number;
  frames: number[];
  texture: string;
  angle: number;
  spin: number;
  gravity: number;
}
/** 고정 상한 안에서 필요할 때만 생성하며 만료 객체는 다음 효과에 재사용합니다. */
export class EffectPool {
  readonly slots: ImageMotion[] = [];
  readonly texts: {
    text: Phaser.GameObjects.Text;
    live: boolean;
    start: number;
    life: number;
    x: number;
    y: number;
  }[] = [];
  dropped = 0;
  // Scene과 할당 예산만 보관합니다. 실제 객체는 필요할 때 상한 안에서 생성합니다.
  constructor(
    private scene: Phaser.Scene,
    private budget: { sprites: number; texts: number },
  ) {}
  // 비활성 이미지 슬롯을 재사용하고 상한에 도달하면 새 효과만 생략합니다. 틴트/회전도 초기화합니다.
  image(
    now: number,
    x: number,
    y: number,
    frames: number[],
    life: number,
    scale0: number,
    scale1 = scale0,
    texture = "fx-v3",
    alpha = 1,
  ): ImageMotion | undefined {
    let slot = this.slots.find((s) => !s.live);
    if (!slot) {
      if (this.slots.length >= this.budget.sprites) {
        this.dropped++;
        return;
      }
      slot = {
        image: this.scene.add
          .image(x, y, texture, frames[0])
          .setDepth(DEPTH.effects),
        live: false,
        start: 0,
        life: 1,
        x,
        y,
        vx: 0,
        vy: 0,
        scale0: 1,
        scale1: 1,
        alpha: 1,
        frames,
        texture,
        angle: 0,
        spin: 0,
        gravity: 0,
      };
      this.slots.push(slot);
    }
    Object.assign(slot, {
      live: true,
      start: now,
      life,
      x,
      y,
      vx: 0,
      vy: 0,
      scale0,
      scale1,
      alpha,
      frames,
      texture,
      angle: 0,
      spin: 0,
      gravity: 0,
    });
    slot.image
      .setTexture(texture, frames[0])
      .setPosition(x, y)
      .setScale(scale0)
      .setAlpha(alpha)
      .setRotation(0)
      .clearTint()
      .setVisible(true)
      .setActive(true);
    return slot;
  }
  // 제한된 텍스트 슬롯에 수치 연출을 표시합니다. 글자 객체를 효과마다 무제한 생성하지 않습니다.
  number(
    now: number,
    x: number,
    y: number,
    text: string,
    color: string,
    size = 13,
    life = 550,
  ) {
    let slot = this.texts.find((s) => !s.live);
    if (!slot) {
      if (this.texts.length >= this.budget.texts) {
        this.dropped++;
        return;
      }
      slot = {
        text: this.scene.add
          .text(x, y, "", {
            fontFamily: "monospace",
            fontSize: "13px",
            stroke: "#111a1a",
            strokeThickness: 3,
          })
          .setOrigin(0.5)
          .setDepth(DEPTH.labels + 5),
        live: false,
        start: 0,
        life,
        x,
        y,
      };
      this.texts.push(slot);
    }
    Object.assign(slot, { live: true, start: now, life, x, y });
    slot.text
      .setText(text)
      .setColor(color)
      .setFontSize(size)
      .setPosition(x, y)
      .setAlpha(1)
      .setVisible(true)
      .setActive(true);
  }
  // 공유 프레임 시각으로 위치/프레임/투명도를 계산하고 만료된 슬롯을 재사용 가능 상태로 돌립니다.
  update(now: number) {
    for (const s of this.slots) {
      if (!s.live) continue;
      const p = (now - s.start) / s.life;
      if (p >= 1) {
        s.live = false;
        s.image.setVisible(false).setActive(false);
        continue;
      }
      const seconds = (now - s.start) / 1000;
      s.image
        .setFrame(
          s.frames[
            Math.min(s.frames.length - 1, Math.floor(p * s.frames.length))
          ],
        )
        .setPosition(
          s.x + s.vx * seconds,
          s.y + s.vy * seconds + s.gravity * seconds * seconds,
        )
        .setRotation(s.angle + s.spin * seconds)
        .setScale(Phaser.Math.Linear(s.scale0, s.scale1, p))
        .setAlpha(s.alpha * (1 - p));
    }
    for (const s of this.texts) {
      if (!s.live) continue;
      const p = (now - s.start) / s.life;
      if (p >= 1) {
        s.live = false;
        s.text.setVisible(false).setActive(false);
        continue;
      }
      s.text.setPosition(s.x, s.y - 26 * p).setAlpha(1 - p * p);
    }
  }
  // 할당/활성 객체와 이벤트 카운터를 관측용으로 반환합니다. 게임 판정에 사용하지 않습니다.
  stats() {
    return {
      spriteAllocated: this.slots.length,
      spriteActive: this.slots.filter((s) => s.live).length,
      textAllocated: this.texts.length,
      textActive: this.texts.filter((s) => s.live).length,
      dropped: this.dropped,
      limits: this.budget,
    };
  }
  // 현재 세션 표시를 비우되 풀 객체는 다음 세션에 재사용할 수 있도록 보존합니다.
  reset() {
    for (const s of this.slots) {
      s.live = false;
      s.image.setVisible(false).setActive(false);
    }
    for (const s of this.texts) {
      s.live = false;
      s.text.setVisible(false).setActive(false);
    }
  }
  // 소유한 렌더링 객체와 구독을 해제합니다. 화면 전환 뒤 객체가 계속 갱신되지 않게 종료 경로에서 호출합니다.
  destroy() {
    for (const s of this.slots) s.image.destroy();
    for (const s of this.texts) s.text.destroy();
    this.slots.length = 0;
    this.texts.length = 0;
  }
}
