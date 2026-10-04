# frontend/src/game

createGame은 Phaser 설정, scene은 기존 서버 스냅샷/예측/보간/카메라 연결, input은 키 상태, prediction은 미확인 입력 재실행과 서버 위치 보정입니다. 위치는 서버가 결정합니다.

world/는V1 환경 로딩·지형·장식, visuals/는V2 실제 스프라이트·방향/상태·표시 객체를 담당합니다. 네트워크·이동·전투 규칙은변경하지 않았습니다.

V3 combat/는서버확정이벤트·공유이펙트풀·투사체PNG를담당합니다. Scene은입력/예측/환경/캐릭터와구독을연결합니다. 서버권위물리/보상은클라이언트에서새로계산하지않습니다.

## 폴더 역할과 유지보수 안내

Phaser 설정·Scene·키 입력·예측 보정과 V1/V2/V3 렌더링 모듈.

[프로젝트 루트 안내](../../../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [createGame.ts](createGame.ts) | Phaser 게임 생성과 PC 화면 크기 대응. pixelArt와 roundPixels로 도트 확대를 선명하게 유지합니다. |
| [input.ts](input.ts) | WASD/방향키를 정수 방향으로 읽습니다. 입력 폼·설정·포커스 이탈 중에는 이동하지 않습니다. |
| [prediction.ts](prediction.ts) | 본인 이동 입력을 먼저 보여 주고 서버 ack 이후 미확인 입력을 재적용합니다. 최종 좌표 권한은 서버에 있습니다. |
| [scene.ts](scene.ts) | 입력·서버 스냅샷·V1 환경·V2 캐릭터·V3 효과를 연결하는 Scene. Vue HUD 생성은 담당하지 않습니다. |

### 하위 폴더

| 폴더 | 역할 |
|---|---|
| [combat](combat/README.md) | V3 확정 전투 이벤트와 투사체 렌더링. 풀·중복 제거·화면 밖 효과 생략·객체 정리를 관리합니다. |
| [visuals](visuals/README.md) | V2 플레이어/몬스터 PNG·애니메이션·시각 상태·렌더러. HP/충돌의 최종 권한은 서버입니다. |
| [world](world/README.md) | V1 타일/장식 생성·레이어/depth·장애물 외형·수관 가림·culling/먼지. |

### 변경 시 점검

게임 데이터는 `network/client.ts → shared/bridge.ts → Vue/Phaser` 흐름을 따릅니다. HP·EXP는 별도로 복제하지 않으며 렌더링 객체의 구독/타이머/객체는 종료 시 정리합니다. `frontend`에서 `npm run build`와 관련 브라우저 테스트를 확인합니다.

## V5 연결

scene.ts가 audio 프리로드·attach/update/detach를 호출하고 기존 CombatEffectManager의 중복 제거된 이벤트를 전달합니다. 게임 판정과 Scene 애니메이션은 유지합니다.
