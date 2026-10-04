// 역할: Phaser 게임 생성과 PC 화면 크기 대응. pixelArt와 roundPixels로 도트 확대를 선명하게 유지합니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import Phaser from "phaser";
import { ArenaScene } from "./scene";
declare global {
  interface Window {
    __ARENA_GAME__?: Phaser.Game;
  }
}
// 지정한 DOM에 리사이즈 가능한 Phaser 게임을 생성합니다. 개발 검사 참조는 운영 빌드에 노출하지 않습니다.
export function createGame(parent: HTMLElement) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#10221f",
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth,
      height: parent.clientHeight,
    },
    scene: [ArenaScene],
  });
  if (import.meta.env.DEV) {
    window.__ARENA_GAME__ = game;
    game.events.once("destroy", () => {
      delete window.__ARENA_GAME__;
    });
  }
  return game;
}
