// 역할: 방향별 idle/walk/hit/death 애니메이션을 한 번만 등록합니다. 상태 범위와 FPS는 manifest를 읽습니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import Phaser from "phaser";
import { manifest, textureKey, type ActorKind } from "./assets";
export const DIRECTIONS = ["down", "left", "right", "up"] as const;
export type Direction = (typeof DIRECTIONS)[number];
export type Pose = "idle" | "walk" | "hit" | "death";
export const animationKey = (
  kind: ActorKind,
  direction: Direction,
  pose: Pose,
) => `${kind}-${direction}-${pose}-v2`;
// 방향 순서와 manifest 포즈 범위로 애니메이션을 등록합니다. 이미 존재하는 키는 재등록하지 않습니다.
export function registerActorAnimations(scene: Phaser.Scene) {
  for (const kind of ["player", "ghoul"] as const)
    for (const [d, direction] of DIRECTIONS.entries()) {
      for (const pose of ["idle", "walk", "hit", "death"] as const) {
        const key = animationKey(kind, direction, pose);
        if (scene.anims.exists(key)) continue;
        const spec = manifest.states[pose],
          start = d * manifest.framesPerDirection + spec.start;
        scene.anims.create({
          key,
          frames: scene.anims.generateFrameNumbers(textureKey(kind), {
            start,
            end: start + spec.count - 1,
          }),
          frameRate: spec.fps,
          repeat: pose === "idle" || pose === "walk" ? -1 : 0,
        });
      }
    }
}
