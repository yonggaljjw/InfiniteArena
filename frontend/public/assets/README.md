# frontend/public/assets

V1 환경은manifest-v1.json,docs/assets-v1.md. V2 플레이어·일반 몬스터는animations/entity-v2.json,docs/assets-v2.md. PNG와재가공 원본이실제로포함되며 런타임은완성시트만로드합니다.

V3 전투에셋은effects/manifest-v3.json,docs/assets-v3.md. 생성원본과완성PNG를실제로포함하며ember는현재미사용입니다.

## 폴더 역할과 유지보수 안내

V1/V2/V3 PNG와 생성 명세. 원본 이미지와 게임 로딩용 출력 파일을 함께 보관합니다.

[프로젝트 루트 안내](../../../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [manifest-v1.json](manifest-v1.json) | source/source_size/ground/details/props. V1 이미지 제작 산출물의 크기와 경로 기록. |

### 하위 폴더

| 폴더 | 역할 |
|---|---|
| [ambient](ambient/README.md) | V1 환경용 작은 먼지/접지 그림자 PNG. 서버 물리와 무관합니다. |
| [animations](animations/README.md) | V2 캐릭터 프레임·방향·포즈 범위·FPS 명세. entity-v2.json과 로더/등록 코드를 함께 점검합니다. |
| [characters](characters/README.md) | V2 플레이어 원본 포즈와 512×512 게임 시트. 64×64 프레임으로 로딩합니다. |
| [effects](effects/README.md) | V3 효과 원본과 256×256 시트 및 프레임 명세. hit/death/EXP/level_up에 연결됩니다. |
| [environment](environment/README.md) | V1 환경 원본 아틀라스와 무충돌 나무 수관. 독립 수관은 장식이며 장애물 추가가 아닙니다. |
| [monsters](monsters/README.md) | 기존 일반 몬스터의 V2 원본/시트. 서버에 없는 빠른/강력 몬스터 종류는 구현하지 않았습니다. |
| [particles](particles/README.md) | V3 파편/불티 PNG. 효과 풀의 상한 안에서 재사용합니다. |
| [projectiles](projectiles/README.md) | V3 본인·타인·확산탄·회전 무기 PNG. 종류와 소유자는 서버 상태에서 읽습니다. |
| [props](props/README.md) | V1 나무·바위·기둥·벽·잔해 PNG. 충돌하는 본체는 서버 장애물 좌표에 맞춰 배치합니다. |
| [tiles](tiles/README.md) | V1 32px 지형 타일과 디테일 시트. 경계 mask와 index는 world/layout.ts에서 선택합니다. |

### 변경 시 점검

공개 URL은 `/assets/...`입니다. JSON에는 주석을 넣지 말고 이 문서에서 구조를 설명합니다. 원본/프레임 정의/로더를 함께 맞추고 에셋 제작 스크립트 실행은 PNG를 덮어쓸 수 있으므로 결과를 비교합니다. 기존 출처·사용 범위 설명을 유지하세요.

## V5 추가

[audio/](audio/README.md)에 실제 원본 합성 BGM/SFX OGG/MP3, manifest, 출처·사용 범위를 보관합니다. 기존 PNG는 변경하지 않습니다.
