# scripts

init_env.py는 기존 .env를 덮어쓰지 않고 최초 랜덤 비밀번호를 생성합니다. load_test.py는 REST/WS20명 연결의 짧은 부하를 측정하며 backend Python 의존성이 필요합니다.

V1 에셋 재가공: build_environment_assets.py. Pillow 의존성은 requirements-assets.txt에만 추가했습니다. 일반 게임 실행에는 필요 없습니다.

## 폴더 역할과 유지보수 안내

처음 .env 생성, 실제 REST/WS 부하, V1 환경 에셋 제작 도구.

[프로젝트 루트 안내](../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [build_environment_assets.py](build_environment_assets.py) | V1 원본 PNG를 타일/장식/수관/그림자 파일로 정규화합니다. 실행하면 기존 출력 에셋을 덮어씁니다. |
| [init_env.py](init_env.py) | 기존 .env를 유지하면서 첫 실행용 무작위 DB 비밀번호를 생성합니다. Python 표준 라이브러리만 사용합니다. |
| [load_test.py](load_test.py) | 실제 REST/WS 게스트들의 이동·강화·리스폰과 서버 tick 지연을 측정하는 부하 도구. |
| [requirements-assets.txt](requirements-assets.txt) | V1 에셋 제작용 이미지 의존성. 일반 게임 실행에는 설치할 필요가 없습니다. |

### 변경 시 점검

경로·환경변수·의존성을 변경하면 루트 실행 안내도 맞춰 주세요. 과거 검증 결과를 최신 결과로 표시하지 않으며 실행하지 않은 Docker/MySQL/외부 배포 검증은 미실행으로 남깁니다.
