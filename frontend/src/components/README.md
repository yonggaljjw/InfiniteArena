# Vue 게임 UI

GameCanvas는 기존 Phaser 수명을 관리합니다. JoinPanel은 메뉴/입장, GameHud는 본인 snapshot과 HUD 조합을 담당합니다. UpgradeSelection·DeathOverlay는 기존 WS 메시지만 보내며 서버 응답 전 상태를 바꾸지 않습니다. GameSettings는 화면 표시 설정과 접근성/포커스를 담당합니다. ui/에는 게이지/랭킹/무기/아이콘을 묶었습니다.

HP/EXP/레벨/무기/랭킹은 shared/bridge의 ui.snapshot 한 곳에서 옵니다. 로컬 표시 설정은 shared/preferences, 표시용 명칭은 shared/presentation에 있습니다. 자세한 흐름과 책임은 docs/phase-v4.md입니다.

## 폴더 역할과 유지보수 안내

화면 단위 Vue 컴포넌트. 메인 메뉴·HUD·강화·사망·설정과 Phaser 캔버스 수명을 관리합니다.

[프로젝트 루트 안내](../../../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [DeathOverlay.vue](DeathOverlay.vue) | 서버 사망 상태·세션 기록·리스폰 대기 표시. 재생성은 서버 응답으로 확정합니다. |
| [GameCanvas.vue](GameCanvas.vue) | Vue와 Phaser 수명 연결. 폰트 준비 후 게임을 만들고 컴포넌트 제거 시 렌더링 자원을 해제합니다. |
| [GameHud.vue](GameHud.vue) | 서버 스냅샷에서 본인 상태를 읽어 HUD·강화 선택·사망 화면을 조합합니다. HP를 별도 상태로 복제하지 않습니다. |
| [GameSettings.vue](GameSettings.vue) | 표시 설정 대화상자. Tab 포커스 순환과 Escape 닫기를 제공하며 멀티플레이 월드는 멈추지 않습니다. |
| [JoinPanel.vue](JoinPanel.vue) | 닉네임 입력과 게스트 입장 메뉴. 중복 클릭을 막고 REST/WS 오류를 공통 안내에 전달합니다. |
| [UpgradeSelection.vue](UpgradeSelection.vue) | 서버가 제공한 choices와 offer_id만 보내는 강화 카드. 클릭 직후 능력치를 임의로 올리지 않습니다. |

### 하위 폴더

| 폴더 | 역할 |
|---|---|
| [ui](ui/README.md) | HUD 내부의 공유 아이콘·HP/EXP·TOP5·무기 표시 컴포넌트. 서버 값을 표시하는 역할입니다. |

### 변경 시 점검

게임 데이터는 `network/client.ts → shared/bridge.ts → Vue/Phaser` 흐름을 따릅니다. HP·EXP는 별도로 복제하지 않으며 렌더링 객체의 구독/타이머/객체는 종료 시 정리합니다. `frontend`에서 `npm run build`와 관련 브라우저 테스트를 확인합니다.

## V5 설정

GameSettings.vue가 Master/BGM/SFX 0~100 슬라이더·전체 음소거·초기화를 추가합니다. 재생은 audio/service.ts 하나가 담당하며 컴포넌트는 소리 객체를 생성하지 않습니다.
