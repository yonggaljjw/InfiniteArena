# Animation manifest

entity-v2.json은PNGURL,64px 프레임 크기,방향·상태 순서/fps,원본 포즈 매핑,검사한프레임bounds를 제공합니다. Vite JSON import로Asset Loader와Animation Registry가읽습니다. tools/build_entity_atlases.py 재실행시갱신되므로 수동수정하지 마세요.

## 폴더 역할과 유지보수 안내

V2 캐릭터 프레임·방향·포즈 범위·FPS 명세. entity-v2.json과 로더/등록 코드를 함께 점검합니다.

[프로젝트 루트 안내](../../../../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [entity-v2.json](entity-v2.json) | frameSize/columns/rows/directions/framesPerDirection/states/atlases. 애니메이션 순서와 실제 PNG 프레임을 연결합니다. |

### 변경 시 점검

공개 URL은 `/assets/...`입니다. JSON에는 주석을 넣지 말고 이 문서에서 구조를 설명합니다. 원본/프레임 정의/로더를 함께 맞추고 에셋 제작 스크립트 실행은 PNG를 덮어쓸 수 있으므로 결과를 비교합니다. 기존 출처·사용 범위 설명을 유지하세요.
