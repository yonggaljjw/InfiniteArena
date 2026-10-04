// 역할: WASD/방향키를 정수 방향으로 읽습니다. 입력 폼·설정·포커스 이탈 중에는 이동하지 않습니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import Phaser from "phaser";
import { menuState } from "../shared/preferences";
export class MovementInput {
  private keys: Record<string, Phaser.Input.Keyboard.Key>;
  // 브라우저 입력/선택 상자의 WASD·화살표 편집을 막지 않도록 Phaser 키 캡처를 끕니다.
  constructor(scene: Phaser.Scene) {
    // 입력/선택 요소에서 WASD와 방향키 편집을 유지합니다. 전체 화면 게임에는
    // 문서 스크롤이 없어 브라우저 키 기본 동작을 무조건 차단할 필요가 없습니다.
    this.keys = scene.input.keyboard!.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT",
      false,
    ) as Record<string, Phaser.Input.Keyboard.Key>;
  }
  // 설정/입력 폼/포커스 이탈 중에는 [0,0]을 반환합니다. 그 외에는 -1/0/1 정수 방향만 생성합니다.
  read(): [number, number] {
    if (
      menuState.settingsOpen ||
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLSelectElement ||
      !document.hasFocus()
    )
      return [0, 0];
    const k = this.keys;
    return [
      Number(k.D.isDown || k.RIGHT.isDown) -
        Number(k.A.isDown || k.LEFT.isDown),
      Number(k.S.isDown || k.DOWN.isDown) - Number(k.W.isDown || k.UP.isDown),
    ];
  }
}
