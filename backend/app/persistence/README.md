# backend/app/persistence

database.py는 비동기 engine/session, models.py는 guest_accounts, repository.py는 게스트 토큰 해시 인증과 누적 통계 저장입니다. 위치/총알은 저장하지 않습니다.

## 폴더 역할과 유지보수 안내

SQLAlchemy 모델·비동기 세션·계정/통계 저장. 매 tick의 위치를 DB에 저장하지 않습니다.

[프로젝트 루트 안내](../../../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [__init__.py](__init__.py) | SQLAlchemy 모델·비동기 세션·계정/통계 저장. 매 tick의 위치를 DB에 저장하지 않습니다. 파이썬 패키지 진입 표시이며 실행 부작용은 없습니다. |
| [database.py](database.py) | 비동기 DB 엔진·세션 팩토리·ORM 기반 클래스. 실제 스키마 생성은 Alembic이 담당합니다. |
| [models.py](models.py) | guest_accounts ORM 모델. 접속 토큰 해시와 누적 기록만 저장하며 실시간 좌표는 저장하지 않습니다. |
| [repository.py](repository.py) | 게스트 토큰 생성/인증과 누적 킬·데스·최고 레벨 저장. SQL 처리는 이 계층에서 수행합니다. |

### 변경 시 점검

경로·환경변수·의존성을 변경하면 루트 실행 안내도 맞춰 주세요. 과거 검증 결과를 최신 결과로 표시하지 않으며 실행하지 않은 Docker/MySQL/외부 배포 검증은 미실행으로 남깁니다.
