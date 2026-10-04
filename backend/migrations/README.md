# backend/migrations

Alembic migration 경로입니다. Docker 시작 명령이 upgrade head를 실행합니다. 스키마 변경 시 새 revision을 추가하세요. 기존0001을 배포 후 임의 변경하지 않습니다.

## 폴더 역할과 유지보수 안내

Alembic 실행 환경과 revision 템플릿. 배포 시작 시 upgrade head를 실행합니다.

[프로젝트 루트 안내](../../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [env.py](env.py) | Alembic과 비동기 DB 엔진을 연결합니다. 모델 import는 메타데이터에 테이블을 등록하기 위해 필요합니다. |
| [script.py.mako](script.py.mako) | 새 Alembic revision을 생성하는 템플릿. 현재 실행 중인 revision이 아닙니다. |

### 하위 폴더

| 폴더 | 역할 |
|---|---|
| [versions](versions/README.md) | 순차 DB 스키마 이력. 기존 적용 revision 대신 새 revision으로 변경을 누적합니다. |

### 변경 시 점검

경로·환경변수·의존성을 변경하면 루트 실행 안내도 맞춰 주세요. 과거 검증 결과를 최신 결과로 표시하지 않으며 실행하지 않은 Docker/MySQL/외부 배포 검증은 미실행으로 남깁니다.
