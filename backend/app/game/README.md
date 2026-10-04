# backend/app/game

entities.py는 Player, combat.py는 Monster/Projectile와 피해·충돌 함수, movement.py는 이동, map.py는 공유 맵 충돌 정보, progression.py는 성장, spatial.py는 공간 분할, protocol.py는 입력 스키마, world.py는 시스템 실행 순서와 snapshot을 관리합니다.

V3 combat_events.py는권위규칙의결과를관측하는유한journal입니다. World의hurt/발사/기존gain_exp호출후표시용정보를기록합니다. 입력/충돌/AI/데미지/보상조건은변경하지않습니다. UUID관측ID는게임엔티티ID를소비하지않습니다.

## 폴더 역할과 유지보수 안내

실시간 서버 권위 월드. 좌표·AI·충돌·공격·경험치·강화·리스폰과 표시 이벤트를 결정합니다.

[프로젝트 루트 안내](../../../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [__init__.py](__init__.py) | 실시간 서버 권위 월드. 좌표·AI·충돌·공격·경험치·강화·리스폰과 표시 이벤트를 결정합니다. 파이썬 패키지 진입 표시이며 실행 부작용은 없습니다. |
| [combat.py](combat.py) | 몬스터·투사체 상태와 방어력/선분 명중 계산. 화면 효과가 아닌 서버 판정에 쓰입니다. |
| [combat_events.py](combat_events.py) | 서버가 확정한 전투 결과를 V3 화면 효과용으로 기록합니다. 이 기록이 데미지나 보상을 결정하지 않습니다. |
| [entities.py](entities.py) | 한 생존 세션의 플레이어 상태. 이동 입력, 전투 능력치, 강화 대기, 연결 유예 정보를 함께 보관합니다. |
| [map.py](map.py) | 공통 월드의 장애물 사각형과 안전구역 정의. 스냅샷으로 클라이언트에도 동일 좌표를 전달합니다. |
| [movement.py](movement.py) | 서버 권위 이동. 대각선 속도 정규화, 맵 경계, 반경 12의 장애물 충돌을 적용합니다. |
| [progression.py](progression.py) | 서버 경험치·레벨·강화 규칙. 프론트 설명 문구를 바꾸어도 실제 증가량은 여기서 결정됩니다. |
| [protocol.py](protocol.py) | 클라이언트가 보낼 수 있는 WS 요청 스키마. 좌표·공격력 등 임의 추가 필드는 거부합니다. |
| [spatial.py](spatial.py) | 공격 후보 검색용 공간 격자. 사각형 후보 검색 후 실제 거리/충돌은 월드에서 다시 판정합니다. |
| [world.py](world.py) | 공유 월드의 단일 서버 권위 시뮬레이션. 이동→몬스터→자동 공격→회전 무기→투사체 순서를 유지합니다. |

### 변경 시 점검

서버가 최종 권한을 가진 좌표·HP·공격·보상을 먼저 확인하세요. 프로토콜 필드 변경은 `frontend/src/shared/protocol.ts`, 이동 변경은 클라이언트 예측, 성장 변경은 카드 설명과 함께 검토합니다. `backend`에서 `python -m pytest -q`로 기존 규칙 검사를 실행합니다.
