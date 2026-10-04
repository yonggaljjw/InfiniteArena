# HUD 표현 컴포넌트

VitalBars는 HP/EXP를 함께, Leaderboard는 서버 상위5명과 내 위치를, WeaponPanel은 실제 무기/능력치/보호를 표시합니다. GameIcon은 자체 작성한24px SVG이며 장식용 aria-hidden입니다. 새로운 게임 상태를 저장하지 않고 props 또는 공유 ui.snapshot으로 계산합니다.

## 폴더 역할과 유지보수 안내

HUD 내부의 공유 아이콘·HP/EXP·TOP5·무기 표시 컴포넌트. 서버 값을 표시하는 역할입니다.

[프로젝트 루트 안내](../../../../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [GameIcon.vue](GameIcon.vue) | 직접 작성한 SVG 경로를 공유하는 UI 아이콘. 알 수 없는 키는 crest로 표시합니다. |
| [Leaderboard.vue](Leaderboard.vue) | 스냅샷 TOP5 랭킹. 본인 ID로 강조하고 목록 밖의 정확한 순위는 추측하지 않습니다. |
| [VitalBars.vue](VitalBars.vue) | 서버 HP·EXP 수치와 접근성 속성을 표시합니다. 게이지 전환은 CSS 표현이며 실제 값은 즉시 갱신됩니다. |
| [WeaponPanel.vue](WeaponPanel.vue) | 서버가 해금한 무기·총알 피해·공격 간격·이동 속도와 보호 상태 표시. 무기 레벨을 임의로 만들지 않습니다. |

### 변경 시 점검

게임 데이터는 `network/client.ts → shared/bridge.ts → Vue/Phaser` 흐름을 따릅니다. HP·EXP는 별도로 복제하지 않으며 렌더링 객체의 구독/타이머/객체는 종료 시 정리합니다. `frontend`에서 `npm run build`와 관련 브라우저 테스트를 확인합니다.
