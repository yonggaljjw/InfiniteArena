// 역할: V3 효과 시트와 투사체·입자 PNG 로더. 실제 이미지와 64px 효과 프레임 정의를 연결합니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import Phaser from "phaser";
import manifest from "../../../public/assets/effects/manifest-v3.json";
export { manifest };
export const COMBAT_TEXTURES: Record<string, string> = {
  "bolt-own": "/assets/projectiles/own-bolt-v3.png",
  "bolt-hostile": "/assets/projectiles/hostile-bolt-v3.png",
  "bolt-spread": "/assets/projectiles/spread-bolt-v3.png",
  "orbit-blade": "/assets/projectiles/orbit-blade-v3.png",
  "fx-shard": "/assets/particles/shard-v3.png",
  "fx-ember": "/assets/particles/ember-v3.png",
};
// 실제 효과 시트를 64px 프레임으로, 투사체/입자를 개별 PNG로 등록합니다.
export function preloadCombat(scene: Phaser.Scene) {
  scene.load.spritesheet("fx-v3", "/assets/effects/combat-v3.png", {
    frameWidth: 64,
    frameHeight: 64,
  });
  for (const [key, url] of Object.entries(COMBAT_TEXTURES))
    scene.load.image(key, url);
}
// 누락 텍스처에만 대체 이미지를 생성합니다. 정상 PNG의 프레임/화풍을 덮어쓰지 않습니다.
export function ensureCombatTextures(scene: Phaser.Scene) {
  for (const key of ["fx-v3", ...Object.keys(COMBAT_TEXTURES)]) {
    if (scene.textures.exists(key)) continue;
    console.warn(`전투 에셋 로딩 실패: ${key}; 비상 효과 사용`);
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffe9bb);
    g.fillRect(28, 30, 8, 4);
    g.generateTexture(key, 64, 64);
    g.destroy();
    if (key === "fx-v3")
      for (let i = 0; i < 16; i++)
        scene.textures.get(key).add(i, 0, 0, 0, 64, 64);
  }
}
