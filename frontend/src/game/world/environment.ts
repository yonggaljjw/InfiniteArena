// 역할: V1 다층 지형·서버 장애물 외형·수관 투명도·먼지·culling. 고정 월드 배경은 한 번만 생성합니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import Phaser from "phaser";
import {
  buildTiles,
  decorations,
  DEPTH,
  footDepth,
  noise,
  TILE,
} from "./layout";
import { ensureEnvironmentTextures } from "./assets";
import type { Snapshot } from "../../shared/protocol";

type Prop = {
  image: Phaser.GameObjects.Image;
  bounds: Phaser.Geom.Rectangle;
  x: number;
  phase: number;
  wind: boolean;
  canopy: boolean;
  footY: number;
};
export class Environment {
  private props: Prop[] = [];
  private maps: Phaser.Tilemaps.Tilemap[] = [];
  private layers: Phaser.Tilemaps.TilemapLayer[] = [];
  private visible: Prop[] = [];
  private lastCull = -1000;
  private populated = false;
  private dust: Phaser.GameObjects.Image[] = [];
  private scenery: Phaser.GameObjects.GameObject[] = [];
  // 고정 타일/장식과 16개의 먼지를 한 번 생성합니다. 서버 장애물 외형은 configure에서 추가합니다.
  constructor(private scene: Phaser.Scene) {
    ensureEnvironmentTextures(scene);
    const data = buildTiles();
    for (const [name, tiles, key, depth] of [
      ["Ground", data.ground, "env-ground", DEPTH.ground],
      ["Detail", data.detail, "env-detail", DEPTH.detail],
    ] as const) {
      const map = scene.make.tilemap({
        data: tiles as number[][],
        tileWidth: TILE,
        tileHeight: TILE,
      });
      const set = map.addTilesetImage(key, key, TILE, TILE, 0, 0, 0)!;
      const layer = map.createLayer(0, set, 0, 0)!;
      layer.setName(name).setDepth(depth).setCullPadding(3, 3);
      if (name === "Detail") layer.setAlpha(0.6);
      this.maps.push(map);
      this.layers.push(layer);
    }
    for (const d of decorations()) {
      const image = scene.add
        .image(d.x, d.y, d.key)
        .setOrigin(0.5, 1)
        .setScale(d.scale)
        .setDepth(DEPTH.foreground + d.y)
        .setTint(0xc5d4cd);
      this.register(image, d.wind, true, d.y);
      const shadow = scene.add
        .image(d.x + 18, d.y - 25, "env-shadow")
        .setDisplaySize(image.displayWidth * 0.95, 54)
        .setDepth(DEPTH.shadow);
      this.register(shadow, false, false, 0);
    }
    // 잔해는 최대 90개를 처음에 고정 배치하며 물리 충돌을 추가하지 않습니다. 먼지 16개는 update에서 재배치합니다.
    for (let i = 0; i < 90; i++) {
      const x = 64 + noise(i, 35) * 3960,
        y = 64 + noise(i, 36) * 3960;
      if (Math.hypot(x - 2048, y - 2048) < 150) continue;
      const rubble = scene.add
        .image(x, y, "env-rubble")
        .setScale(0.14 + noise(i, 37) * 0.1)
        .setDepth(DEPTH.detail + 4)
        .setAlpha(0.7);
      this.register(rubble, false, false, 0);
    }
    for (let i = 0; i < 16; i++)
      this.dust.push(
        scene.add
          .image(0, 0, "env-dust")
          .setDepth(DEPTH.effects)
          .setAlpha(0)
          .setData("seed", i),
      );
  }
  // 이미지의 고정 bounds와 바람 위상을 보관해 culling/가림에 재사용합니다.
  private register(
    image: Phaser.GameObjects.Image,
    wind: boolean,
    canopy: boolean,
    footY: number,
  ) {
    this.props.push({
      image,
      bounds: image.getBounds(),
      x: image.x,
      phase: noise(Math.round(image.x), Math.round(image.y), 23) * Math.PI * 2,
      wind,
      canopy,
      footY,
    });
  }
  // 첫 서버 스냅샷에서 안전구역과 장애물 외형을 한 번 구성합니다. 충돌 사각형을 새로 만들지 않습니다.
  configure(snapshot: Snapshot) {
    if (this.populated) return;
    this.populated = true;
    const s = this.scene,
      z = snapshot.safe_zone;
    // 이동 가능한 안전구역은 표현만 바꾸고 서버 반경은 그대로 유지합니다.
    const ring = s.add
      .circle(z.x, z.y, z.radius, 0x6fa38d, 0.025)
      .setStrokeStyle(2, 0x9fbcb2, 0.32)
      .setDepth(DEPTH.detail + 1);
    const inner = s.add
      .circle(z.x, z.y, z.radius - 10)
      .setStrokeStyle(1, 0x9fbcb2, 0.16)
      .setDepth(DEPTH.detail + 1);
    this.scenery.push(
      ring,
      inner,
      s.add
        .text(z.x, z.y - 55, "SAFE ZONE", {
          fontSize: "10px",
          color: "#a4c1b3",
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.detail + 2),
    );
    for (let index = 0; index < snapshot.obstacles.length; index++) {
      const o = snapshot.obstacles[index],
        base = o.y + o.h;
      // 충돌 범위는 서버 사각형 그대로 표시합니다. 투명 여백이 범위를 바꾸지 않습니다.
      const ground = s.textures.get("env-ground");
      if (!ground.has("footprint")) ground.add("footprint", 0, 224, 32, 32, 32);
      const footprint = s.add
        .tileSprite(
          o.x + o.w / 2,
          o.y + o.h / 2,
          o.w,
          o.h,
          "env-ground",
          "footprint",
        )
        .setDepth(DEPTH.detail + 3)
        .setTint(0x52615c)
        .setName(`ObstacleFootprint-${index}`)
        .setData("collision", { ...o });
      this.scenery.push(footprint);
      const shadow = s.add
        .image(o.x + o.w / 2 + 18, base - 8, "env-shadow")
        .setDisplaySize(o.w + 40, 50)
        .setDepth(DEPTH.shadow);
      this.register(shadow, false, false, 0);
      if (o.w >= o.h) {
        this.ruin("env-wall", o.x + o.w / 2, base, o.w, o.h + 70);
        this.ruin("env-pillar", o.x + 14, base, 36, 100);
        this.ruin(
          "env-pillar",
          o.x + o.w - 14,
          base,
          36,
          noise(index, 2) > 0.5 ? 85 : 115,
        );
        if (index === 0) this.ruin("env-fir", o.x + 25, base, 90, 156);
        else this.ruin("env-dead-tree", o.x + o.w - 30, base, 86, 150);
      } else {
        // 기둥과 나무 본체는 기존 세로 충돌 사각형 위에만 배치합니다.
        this.ruin("env-pillar", o.x + o.w / 2, o.y + 48, o.w, 112);
        this.ruin("env-oak", o.x + o.w / 2, base, o.w + 64, 156);
        this.ruin("env-boulder", o.x + o.w / 2, o.y + o.h / 2, o.w + 12, 70);
      }
    }
  }
  // 본체/윗부분을 나누고 발 높이 depth를 공유하여 엔티티 앞뒤 관계를 자연스럽게 표시합니다.
  private ruin(
    key: string,
    x: number,
    base: number,
    width: number,
    height: number,
  ) {
    const texture = this.scene.textures.get(key),
      source = texture.getSourceImage() as HTMLImageElement;
    const cut = Math.floor(source.height * 0.28);
    if (!texture.has("body")) {
      texture.add("body", 0, 0, cut, source.width, source.height - cut);
      texture.add("crown", 0, 0, 0, source.width, cut);
    }
    const bodyH = (height * (source.height - cut)) / source.height;
    const body = this.scene.add
      .image(x, base, key, "body")
      .setOrigin(0.5, 1)
      .setDisplaySize(width, bodyH)
      .setDepth(footDepth(base));
    const crown = this.scene.add
      .image(x, base - bodyH, key, "crown")
      .setOrigin(0.5, 1)
      .setDisplaySize(width, height - bodyH)
      .setDepth(footDepth(base) + 0.5);
    this.register(body, false, false, base);
    this.register(crown, false, false, base);
  }
  // 100ms 간격으로 화면 주변 장식을 추려 바람/가림을 갱신합니다. 고정 먼지 16개를 재배치합니다.
  update(
    time: number,
    delta: number,
    local?: { x: number; y: number },
    actors: { x: number; y: number }[] = [],
  ) {
    const view = this.scene.cameras.main.worldView;
    if (time - this.lastCull > 100) {
      this.lastCull = time;
      const expanded = new Phaser.Geom.Rectangle(
        view.x - 160,
        view.y - 160,
        view.width + 320,
        view.height + 320,
      );
      this.visible = [];
      for (const p of this.props) {
        const visible = Phaser.Geom.Intersects.RectangleToRectangle(
          expanded,
          p.bounds,
        );
        p.image.setVisible(visible);
        if (visible) this.visible.push(p);
      }
    }
    for (const p of this.visible) {
      if (p.wind) p.image.x = p.x + Math.round(Math.sin(time / 1500 + p.phase));
      const hidden = p.canopy
        ? actors.some((a) => p.bounds.contains(a.x, a.y - 8))
        : local &&
          p.footY > local.y + 16 &&
          p.bounds.contains(local.x, local.y - 8);
      const target = hidden ? (p.canopy ? 0.28 : 0.55) : 1;
      p.image.alpha = Phaser.Math.Linear(
        p.image.alpha,
        target,
        1 - Math.exp(-delta / 120),
      );
    }
    for (let i = 0; i < this.dust.length; i++) {
      const p = this.dust[i],
        phase = time / 9000 + i * 0.73;
      p.setPosition(
        Math.round(view.x + ((noise(i, 1) + phase * 0.015) % 1) * view.width),
        Math.round(view.y + ((noise(i, 2) + phase * 0.01) % 1) * view.height),
      );
      p.setAlpha(0.06 + 0.055 * (1 + Math.sin(time / 1700 + i)));
    }
  }
  // 할당/활성 객체와 이벤트 카운터를 관측용으로 반환합니다. 게임 판정에 사용하지 않습니다.
  stats() {
    return {
      tileLayers: this.layers.length,
      props: this.props.length,
      visibleProps: this.visible.length,
      dust: this.dust.length,
      obstaclesConfigured: this.populated,
    };
  }
  // 소유한 렌더링 객체와 구독을 해제합니다. 화면 전환 뒤 객체가 계속 갱신되지 않게 종료 경로에서 호출합니다.
  destroy() {
    for (const p of this.props) p.image.destroy();
    this.dust.forEach((p) => p.destroy());
    this.scenery.forEach((p) => p.destroy());
    this.maps.forEach((m) => m.destroy());
    this.props = [];
    this.visible = [];
  }
}
