# frontend/public/assets/tiles

ground-v1.png는32px52타일,details-v1.png는32px4타일입니다. 지형 경계 mask와 잔디 변형은 layout.ts에서 선택합니다.

## 폴더 역할과 유지보수 안내

V1 32px 지형 타일과 디테일 시트. 경계 mask와 index는 world/layout.ts에서 선택합니다.

[프로젝트 루트 안내](../../../../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [details-v1.png](details-v1.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |
| [ground-v1.png](ground-v1.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |

### 변경 시 점검

공개 URL은 `/assets/...`입니다. JSON에는 주석을 넣지 말고 이 문서에서 구조를 설명합니다. 원본/프레임 정의/로더를 함께 맞추고 에셋 제작 스크립트 실행은 PNG를 덮어쓸 수 있으므로 결과를 비교합니다. 기존 출처·사용 범위 설명을 유지하세요.
