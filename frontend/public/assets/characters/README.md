# Player V2

player-v2.png는64px 프레임64개를 담은512px RGBA 시트입니다. player-source-v2.png는 이미지 생성 원본이며 런타임에서 로드하지 않습니다. 방향 순서Down/Left/Right/Up, 상태순서4Idle/6Walk/2Hit/4Death. 자세한 규격과 프레임 재사용은docs/assets-v2.md, 생성 프롬프트는docs/imagegen-prompts-v2.json.

## 폴더 역할과 유지보수 안내

V2 플레이어 원본 포즈와 512×512 게임 시트. 64×64 프레임으로 로딩합니다.

[프로젝트 루트 안내](../../../../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [player-source-v2.png](player-source-v2.png) | 제작 원본 PNG. 런타임용 출력 파일/가공 방법과 사용 범위는 이 폴더의 에셋 설명을 확인하세요. |
| [player-v2.png](player-v2.png) | 게임에 로딩하는 PNG 리소스. 프레임/크기와 적용 범위는 관련 에셋 명세를 확인하세요. |

### 변경 시 점검

공개 URL은 `/assets/...`입니다. JSON에는 주석을 넣지 말고 이 문서에서 구조를 설명합니다. 원본/프레임 정의/로더를 함께 맞추고 에셋 제작 스크립트 실행은 PNG를 덮어쓸 수 있으므로 결과를 비교합니다. 기존 출처·사용 범위 설명을 유지하세요.
