// 역할: V2 플레이어·기존 일반 몬스터 PNG 스프라이트 로더. manifest와 프레임 크기 64를 일치시킵니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import Phaser from "phaser";
import manifest from "../../../public/assets/animations/entity-v2.json";
export { manifest };
export type ActorKind = "player" | "ghoul";
export const textureKey = (kind: ActorKind) => `actor-${kind}-v2`;
// manifest의 실제 플레이어/일반 몬스터 시트를 64×64 프레임으로 로딩합니다.
export function preloadActors(scene: Phaser.Scene) {
  for (const kind of ["player", "ghoul"] as const) {
    scene.load.spritesheet(textureKey(kind), manifest.atlases[kind].url, {
      frameWidth: 64,
      frameHeight: 64,
    });
  }
}
// 이미지 로딩 실패에만 비상 시트 프레임을 제공합니다. 정상 시트를 임시 도형으로 대체하지 않습니다.
export function ensureActorTextures(scene: Phaser.Scene) {
  for (const kind of ["player", "ghoul"] as const) {
    const key = textureKey(kind);
    if (scene.textures.exists(key)) continue;
    console.warn(
      `캐릭터 에셋 로딩 실패: ${manifest.atlases[kind].url}; 비상 대체 이미지 사용`,
    );
    // 파일 로딩 실패 때만 쓰는 복구 경로입니다. 정상 렌더링은 PNG 시트를 사용합니다.
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(kind === "player" ? 0x6ebfac : 0x997060);
    g.fillRect(23, 12, 18, 36);
    g.generateTexture(key, 64, 64);
    g.destroy();
    const texture = scene.textures.get(key);
    for (let i = 0; i < 64; i++) texture.add(i, 0, 0, 0, 64, 64);
  }
}
