// 역할: 실제 V5 파일/재생 제한을 한 곳에서 읽습니다. 경로·음량·우선순위 변경은 manifest JSON에서 수행합니다.
import Phaser from "phaser";
import manifest from "../../public/assets/audio/manifest-v5.json";
export { manifest };
export type BgmId = keyof typeof manifest.bgm;
export type SfxId = keyof typeof manifest.sfx;
export const audioKey = (id: string) => `audio-v5-${id}`;

// Phaser가 지원하는 형식을 선택하고 짧은 SFX까지 미리 디코딩합니다. 실패한 파일은 서비스에서 생략합니다.
export function preloadAudio(scene: Phaser.Scene) {
  for (const [id, spec] of Object.entries({
    ...manifest.bgm,
    ...manifest.sfx,
  })) {
    scene.load.audio(audioKey(id), spec.urls);
  }
}
