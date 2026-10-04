# backend/tests

pytest 테스트입니다. conftest.py가 임시 SQLite를 만들므로 운영 MySQL에는 접근하지 않습니다. 이동·순서·무기·성장·사망·리스폰·보호·AOI·게스트·잘못된 패킷을 검사합니다.

## 폴더 역할과 유지보수 안내

임시 SQLite를 사용하는 서버 규칙·통신·입력 검증 테스트. 실제 MySQL 검증과는 구분합니다.

[프로젝트 루트 안내](../../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [__init__.py](__init__.py) | 임시 SQLite를 사용하는 서버 규칙·통신·입력 검증 테스트. 실제 MySQL 검증과는 구분합니다. 파이썬 패키지 진입 표시이며 실행 부작용은 없습니다. |
| [conftest.py](conftest.py) | 테스트 전용 임시 SQLite와 세션 단위 스키마 생성·정리. 실제 MySQL 데이터에 접근하지 않습니다. |
| [test_combat.py](test_combat.py) | 서버 명중·성장·PvP·보호·무기·입력 상한·강화 중복 적용 방지 회귀 검사. |
| [test_combat_events.py](test_combat_events.py) | 실제 서버 상태 변화와 전투 효과 이벤트가 일치하는지 검사. 표시 이벤트로 게임 상태를 변경하지 않습니다. |
| [test_movement.py](test_movement.py) | 이동 정규화·맵 경계·오래된 입력·시퀀스·잘못된 입력과 중복 입장 검사. |
| [test_network.py](test_network.py) | 실제 FastAPI REST/WS 두 세션으로 게스트 입장과 상대 위치 전달을 검사합니다. |
| [test_security.py](test_security.py) | WS Origin·토큰·패킷 크기·필드 타입·메시지 빈도 및 중복 연결 제한 검사. |

### 변경 시 점검

실제 서버 플레이 검증과 표시 패킷 재생 검증을 구분하세요. 임시 DB와 종료 정리를 유지하고 과거 측정 JSON을 새 테스트 실행으로 간주하지 않습니다. 브라우저 테스트는 실제 FastAPI와 Vite를 함께 실행한 뒤 수행합니다.
