# Combat visuals V3

manager는서버combat_events를소비해구독자와표시책임에전달합니다. effects에는HitEffect/DamageNumber/DeathEffect/ExperienceEffect가공존하고pool은공통수명·상한·재사용을담당합니다. projectiles는실제Snapshot좌표/vx/vy/owner로만보간·회전합니다. assets는실물PNG로더입니다.

클라이언트충돌/데미지/EXP/투사체전진시뮬레이션을추가하지 않습니다. 사라진투사체에Hit를만들지않고AOI퇴장을Death로추정하지않습니다. Timer/Tween/개별애니메이션이벤트를반복등록하지않습니다. 이벤트ID최대2048,서버epoch변경시초기화,늦은이벤트는생략합니다. Scene종료시destroy와구독해제가필수입니다.

docs/phase-v3.md와assets-v3.md에프로토콜·품질한도·검증·한계를기록했습니다.

## 폴더 역할과 유지보수 안내

V3 확정 전투 이벤트와 투사체 렌더링. 풀·중복 제거·화면 밖 효과 생략·객체 정리를 관리합니다.

[프로젝트 루트 안내](../../../../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [assets.ts](assets.ts) | V3 효과 시트와 투사체·입자 PNG 로더. 실제 이미지와 64px 효과 프레임 정의를 연결합니다. |
| [effects.ts](effects.ts) | 확정 hit/death/experience/level_up 이벤트의 작은 연출. EXP 표현은 수집 가능한 월드 아이템이 아닙니다. |
| [manager.ts](manager.ts) | 서버 combat_events 중복 제거·유효 시간·화면 범위 검사 후 효과를 분배합니다. 예측 명중을 생성하지 않습니다. |
| [pool.ts](pool.ts) | 고정 상한 안에서 이미지/텍스트를 재사용합니다. 개별 효과마다 Tween/타이머를 만들지 않습니다. |
| [projectiles.ts](projectiles.ts) | 서버 투사체 위치·속도·소유자·무기 종류를 이미지로 표시합니다. 목록에서 사라졌다고 명중 효과를 만들지 않습니다. |

### 변경 시 점검

게임 데이터는 `network/client.ts → shared/bridge.ts → Vue/Phaser` 흐름을 따릅니다. HP·EXP는 별도로 복제하지 않으며 렌더링 객체의 구독/타이머/객체는 종료 시 정리합니다. `frontend`에서 `npm run build`와 관련 브라우저 테스트를 확인합니다.
