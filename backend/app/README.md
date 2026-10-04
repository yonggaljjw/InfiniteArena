# backend/app

애플리케이션 패키지입니다. API는 game을 호출하고 game의 비동기 통계 worker는 persistence.repository를 호출합니다. 게임 상태를 main.py에 구현하지 않습니다.

## 폴더 역할과 유지보수 안내

서버 실행 코드 패키지. main.py는 앱 조립과 작업 수명만 담당합니다.

[프로젝트 루트 안내](../../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [__init__.py](__init__.py) | 서버 실행 코드 패키지. main.py는 앱 조립과 작업 수명만 담당합니다. 파이썬 패키지 진입 표시이며 실행 부작용은 없습니다. |
| [main.py](main.py) | FastAPI 앱의 시작·종료와 REST/WS 라우터 등록. 월드와 통계 저장 작업의 수명은 여기서 관리합니다. |

### 하위 폴더

| 폴더 | 역할 |
|---|---|
| [api](api/README.md) | REST 게스트/건강상태/누적 랭킹과 WebSocket 게스트 인증/게임 요청 진입점. |
| [core](core/README.md) | 서버 설정. .env/환경변수의 타입·제약 조건을 한 곳에서 관리합니다. |
| [game](game/README.md) | 실시간 서버 권위 월드. 좌표·AI·충돌·공격·경험치·강화·리스폰과 표시 이벤트를 결정합니다. |
| [persistence](persistence/README.md) | SQLAlchemy 모델·비동기 세션·계정/통계 저장. 매 tick의 위치를 DB에 저장하지 않습니다. |

### 변경 시 점검

경로·환경변수·의존성을 변경하면 루트 실행 안내도 맞춰 주세요. 과거 검증 결과를 최신 결과로 표시하지 않으며 실행하지 않은 Docker/MySQL/외부 배포 검증은 미실행으로 남깁니다.
