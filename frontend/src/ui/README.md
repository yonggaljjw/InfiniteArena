# 화면 공간 UI 스타일

tokens.css가 V4 공통 색상/패널/간격/모션을 정의하고 game-ui.css가 Vue UI에 적용합니다. main의 --ui-scale과 --ui-font가 함께 바뀝니다. Phaser 월드 zoom·좌표·텍스처에 영향을 주지 않습니다. 문서는 docs/design-system-v4.md입니다.

## 폴더 역할과 유지보수 안내

V4 디자인 토큰과 화면 배치 CSS. Vue의 화면 공간 UI를 꾸미며 Phaser 월드 depth와 별개입니다.

[프로젝트 루트 안내](../../../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [game-ui.css](game-ui.css) | V4 메뉴·HUD·카드·사망·설정의 스타일과 PC 반응형 배치. 가운데 전투 시야와 클릭 전달을 유지합니다. |
| [tokens.css](tokens.css) | UI 공통 색상·여백·크기·전환·그림자 토큰. HP/EXP/금색 강조의 기준은 여기서 바꿉니다. |

### 변경 시 점검

게임 데이터는 `network/client.ts → shared/bridge.ts → Vue/Phaser` 흐름을 따릅니다. HP·EXP는 별도로 복제하지 않으며 렌더링 객체의 구독/타이머/객체는 종료 시 정리합니다. `frontend`에서 `npm run build`와 관련 브라우저 테스트를 확인합니다.

## V5 추가

game-ui.css의 오디오 fieldset·range·활성화 안내 스타일은 기존 V4 토큰을 사용합니다. 기존 HUD·메뉴 레이아웃을 바꾸지 않습니다.
