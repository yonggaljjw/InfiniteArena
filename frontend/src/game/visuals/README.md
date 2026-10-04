# Entity visuals — Phase V2

assets는 실물PNG와JSON 로딩, animations는 멱등 등록, state는 시각 상태만 담당합니다. renderers에PlayerRenderer/MonsterRenderer가 함께 있으며 공통 위치·접지·바 렌더링을 공유합니다. Scene은 서버 스냅샷을 전달합니다.

서버 중심을Sprite 중심으로 유지하고 프레임 발(32,48)을y+16으로 정렬합니다. 이동/공격/충돌에 새로운 물리 바디를 만들지 않습니다. 죽음/피격/출현 시간은 Phaser 시각 시간이며 서버alive/HP/리스폰을 대체하지 않습니다. 엔티티마다 이벤트/타이머를 추가하지 않고 destroy로모든 표시 객체를 정리합니다.

에셋 실패 도형은 비상 실행 유지용입니다. 프레임 순서·재사용·원본 출처는docs/assets-v2.md를 확인하세요.

## 폴더 역할과 유지보수 안내

V2 플레이어/몬스터 PNG·애니메이션·시각 상태·렌더러. HP/충돌의 최종 권한은 서버입니다.

[프로젝트 루트 안내](../../../../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [animations.ts](animations.ts) | 방향별 idle/walk/hit/death 애니메이션을 한 번만 등록합니다. 상태 범위와 FPS는 manifest를 읽습니다. |
| [assets.ts](assets.ts) | V2 플레이어·기존 일반 몬스터 PNG 스프라이트 로더. manifest와 프레임 크기 64를 일치시킵니다. |
| [renderers.ts](renderers.ts) | 플레이어/몬스터 스프라이트·그림자·이름표·HP와 발 위치 depth. 서버 좌표와 그림의 발 좌표는 별개입니다. |
| [state.ts](state.ts) | 방향·걷기·피격·사망·등장 투명도의 시각 상태. HP·충돌·리스폰 판정을 수행하지 않습니다. |

### 변경 시 점검

게임 데이터는 `network/client.ts → shared/bridge.ts → Vue/Phaser` 흐름을 따릅니다. HP·EXP는 별도로 복제하지 않으며 렌더링 객체의 구독/타이머/객체는 종료 시 정리합니다. `frontend`에서 `npm run build`와 관련 브라우저 테스트를 확인합니다.
