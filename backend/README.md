# backend

FastAPI 서버입니다. app/main.py는 조립·수명 관리, api는 REST/WS, game은 게임 규칙, persistence는 SQLAlchemy DB 접근입니다. 기본 Docker 실행 시 Alembic을 먼저 실행하고 workers=1로 실행합니다. requirements.txt는 실제 테스트에 사용한 호환 버전을 고정합니다.

## 폴더 역할과 유지보수 안내

FastAPI 서버·게임 규칙·영속화·마이그레이션·서버 테스트. Docker는 이 폴더를 빌드 컨텍스트로 사용합니다.

[프로젝트 루트 안내](../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [.dockerignore](.dockerignore) | Docker 빌드 컨텍스트에서 로컬 의존성/비밀/산출물 제외. |
| [Dockerfile](Dockerfile) | 서버 의존성을 설치하고 비특권 사용자로 Alembic 마이그레이션 후 단일 uvicorn worker를 실행합니다. |
| [alembic.ini](alembic.ini) | Alembic migration 경로 설정. 실제 DB URL은 migrations/env.py가 환경변수에서 읽습니다. |
| [arena.db](arena.db) | 폴더의 보조 설정/자료. 변경 시 이 폴더 역할과 실행 명령을 함께 확인하세요. |
| [requirements.txt](requirements.txt) | 서버·마이그레이션·SQLite 테스트의 고정 의존성. 수정 후 Docker 빌드와 서버 테스트를 확인합니다. |

### 하위 폴더

| 폴더 | 역할 |
|---|---|
| [app](app/README.md) | 서버 실행 코드 패키지. main.py는 앱 조립과 작업 수명만 담당합니다. |
| [migrations](migrations/README.md) | Alembic 실행 환경과 revision 템플릿. 배포 시작 시 upgrade head를 실행합니다. |
| [tests](tests/README.md) | 임시 SQLite를 사용하는 서버 규칙·통신·입력 검증 테스트. 실제 MySQL 검증과는 구분합니다. |

### 변경 시 점검

경로·환경변수·의존성을 변경하면 루트 실행 안내도 맞춰 주세요. 과거 검증 결과를 최신 결과로 표시하지 않으며 실행하지 않은 Docker/MySQL/외부 배포 검증은 미실행으로 남깁니다.
