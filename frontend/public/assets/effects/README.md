# V3 effect atlas

combat-v3.png는4×4의64px셀로구성됩니다. source-v3.png는내장Imagegen생성원본이며런타임은미로딩합니다. manifest-v3.json의프레임정의와docs/assets-v3.md를확인하세요. 시간/좌표연출은combat/pool.ts에서관리하고게임규칙과독립적입니다.

## 폴더 역할과 유지보수 안내

V3 효과 원본과 256×256 시트 및 프레임 명세. hit/death/EXP/level_up에 연결됩니다.

[프로젝트 루트 안내](../../../../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [combat-v3.png](combat-v3.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [manifest-v3.json](manifest-v3.json) | frameSize/columns/rows/frames/sourceSize. 각 V3 효과 종류가 사용하는 실제 frame index. |
| [source-v3.png](source-v3.png) | 제작 원본 PNG. 런타임용 출력 파일/가공 방법과 사용 범위는 이 폴더의 에셋 설명을 확인하세요. |

### 변경 시 점검

공개 URL은 `/assets/...`입니다. JSON에는 주석을 넣지 말고 이 문서에서 구조를 설명합니다. 원본/프레임 정의/로더를 함께 맞추고 에셋 제작 스크립트 실행은 PNG를 덮어쓸 수 있으므로 결과를 비교합니다. 기존 출처·사용 범위 설명을 유지하세요.
