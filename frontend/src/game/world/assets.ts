// 역할: V1 환경 PNG 키와 경로. 대체 텍스처는 파일 로딩 실패 시에만 사용합니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import Phaser from "phaser";
const ROOT = "/assets";
export const ASSETS: Record<string, string> = {
  "env-ground": `${ROOT}/tiles/ground-v1.png`,
  "env-detail": `${ROOT}/tiles/details-v1.png`,
  "env-fir": `${ROOT}/props/fir-v1.png`,
  "env-oak": `${ROOT}/props/oak-v1.png`,
  "env-dead-tree": `${ROOT}/props/dead-tree-v1.png`,
  "env-boulder": `${ROOT}/props/boulder-v1.png`,
  "env-pillar": `${ROOT}/props/pillar-v1.png`,
  "env-wall": `${ROOT}/props/wall-v1.png`,
  "env-rubble": `${ROOT}/props/rubble-v1.png`,
  "env-fir-canopy": `${ROOT}/environment/fir-canopy-v1.png`,
  "env-oak-canopy": `${ROOT}/environment/oak-canopy-v1.png`,
  "env-dust": `${ROOT}/ambient/dust-v1.png`,
  "env-shadow": `${ROOT}/ambient/shadow-v1.png`,
};
// V1 환경 키/PNG 경로를 로더에 한 번 등록합니다.
export function preloadEnvironment(scene: Phaser.Scene) {
  for (const [key, path] of Object.entries(ASSETS)) scene.load.image(key, path);
}
// 누락된 환경 PNG에만 대체 타일/장식을 제공합니다. 정상 월드는 실제 PNG를 사용합니다.
export function ensureEnvironmentTextures(scene: Phaser.Scene) {
  // PNG 로딩 실패 시만 사용하는 실행 유지 경로입니다. 정상 화면은 PNG를 사용합니다.
  for (const key of Object.keys(ASSETS)) {
    if (scene.textures.exists(key)) continue;
    console.warn(
      `환경 에셋 로딩 실패: ${ASSETS[key]}; 간단한 대체 텍스처 사용`,
    );
    const g = scene.make.graphics({ x: 0, y: 0 });
    if (key === "env-ground") {
      for (let i = 0; i < 52; i++) {
        g.fillStyle(
          [0x20372c, 0x3c362b, 0x394746, 0x293b30][
            i < 4 ? 0 : 1 + Math.floor((i - 4) / 16)
          ],
        );
        g.fillRect((i % 13) * 32, Math.floor(i / 13) * 32, 32, 32);
      }
      g.generateTexture(key, 416, 128);
    } else if (key === "env-detail") {
      g.fillStyle(0x526247, 0.35);
      for (let i = 0; i < 4; i++) g.fillRect(i * 32 + 12, 12, 8, 8);
      g.generateTexture(key, 128, 32);
    } else if (key === "env-dust") {
      g.fillStyle(0xaabb99);
      g.fillRect(0, 0, 2, 2);
      g.generateTexture(key, 3, 3);
    } else {
      g.fillStyle(key.includes("canopy") ? 0x24442e : 0x48564f, 0.7);
      g.fillRect(4, 4, 56, 56);
      g.generateTexture(key, 64, 64);
    }
    g.destroy();
  }
}
