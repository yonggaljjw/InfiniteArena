# Phase V1 — 다층 맵 및 환경 개선

## 완료 판정

**V1 환경 구현과 이 환경의 회귀·브라우저 검증 완료. V2 캐릭터/몬스터 개선은 미구현입니다.**

4096×4096 좌표계,32×32 타일,이동 속도,캐릭터·몬스터 텍스처,서버 게임 규칙,WS 프로토콜,입력 예측/충돌,HUD 디자인은 유지했습니다. 백엔드 모든 파일을 최초 제공 ZIP과 바이트 비교한 결과 변경0개입니다. 캐릭터·몬스터는 레이어에 맞춰 표시 depth만 바뀌었습니다.

## 실제 변경 파일

| 경로 | 변경 내용 |
|---|---|
| frontend/src/game/scene.ts | PNG preload, Environment 연결, 발 위치 y-sort, 이름/HP 가독성 depth |
| frontend/src/game/createGame.ts | 개발 환경 한정 진단 참조. 운영 빌드에는 전역 게임 참조 없음 |
| frontend/src/game/world/assets.ts | 실제 PNG 로딩과 실패 시 대체 텍스처 |
| frontend/src/game/world/layout.ts | 공통 depth, 결정적 지형·장식 배치 |
| frontend/src/game/world/environment.ts | Phaser 타일맵2개,폐허·수관·그림자·culling·가림·먼지 |
| frontend/tests/environment.spec.ts | PNG·레이어·충돌 좌표·객체 재사용·카메라 끝·fallback 검사 |
| frontend/playwright.config.ts | 테스트를1 worker로 실행하여 공유 월드 테스트 간 간섭 억제 |
| frontend/public/assets/** | 실제 PNG14개,manifest,출처 문서 |
| scripts/build_environment_assets.py | 원본 atlas에서 재생성 가능한 타일·prop 가공 |
| scripts/requirements-assets.txt | 에셋 재가공 전용 Pillow 의존성. 일반 실행에는 불필요 |
| docs/phase-v1.md / docs/assets-v1.md | 구현·성능·에셋·라이선스·한계 |
| docs/benchmark-before.png / benchmark-v1.png | 실제 브라우저 변경 전후 화면 |
| docs/v1-performance.json | 실제 렌더링 표본 |
| README 및 새 폴더별 README | V1 사용·완료 상태 |

## 레이어와 depth

| 레이어 | 구현과 순서 |
|---|---|
| Ground | 원본 PNG에서 만든52개32px 타일. Phaser TilemapLayer,depth -200000 |
| Detail | PNG 풀·낙엽·뿌리·파편 타일4개. 별도 TilemapLayer,depth -180000 |
| Shadow | 실제 shadow PNG,depth -150000. 충돌과 무관 |
| Obstacle | 서버 사각형의 석재 바닥 범위 + 석벽/기둥/나무. 본체 depth 10000+지면 발 위치 |
| Entity | 기존 플레이어·몬스터,depth 10000+y+16. 현재32px 스프라이트 발 위치 기준 |
| Foreground | 폐허 윗부분은 본체 depth+0.5,높은 무충돌 수관은20000+y |
| Environmental Effects | 먼지16개를 재사용,depth30000. 기존 총알은29999에서 가독성 유지 |
| Label | 이름/HP바 depth40000. 월드 엔티티를 알아볼 수 있도록 유지 |

폐허는 실제 PNG의 본체와 윗부분을 나눈 frame으로 렌더링합니다. 캐릭터가 구조물 뒤에서 가려지면 구조물 투명도를0.55까지 부드럽게 조정합니다. 수관 아래에는 밑동이 없는 통행 가능한 장식이며 플레이어가 가려지면0.28까지 낮춥니다. 새 단단한 나무/바위 충돌체는 추가하지 않았습니다.

## 서버 충돌과 일치시키는 방법

snapshot.obstacles의 x/y/w/h를 그대로 사용하여 바닥 점유 범위를 표시합니다. 외곽 사각형은 `(1700,1800,180,64)`, `(2300,2180,64,180)`, `(1960,2500,240,64)`입니다. 실제 이동 제한과12px 캐릭터 여유는 기존 backend map.py와 frontend prediction.ts가 그대로 담당합니다.

나무와 유적 본체의 밑동은 기존 점유 범위에만 배치합니다. 수관·그림자·낙엽·자갈·작은 붕괴 잔해는 장식이며 충돌하지 않습니다. 지붕·가지가 점유 범위 밖으로 돌출되어도 새 충돌은 없습니다. 그림의 모든 픽셀이 물리 충돌이라는 뜻은 아닙니다. 이동 가능한 수관을 새로운 벽으로 오해하지 않도록 밑동을 제거하고 가림을 완화했습니다.

안전구역 서버 반경90은 바뀌지 않았습니다. 주변 석재 광장은155 반경의 시각 지형일 뿐 안전구역을 확대하지 않습니다.

## 지형과 배치

흙길은 두 개의 완만한 곡선으로 이어집니다. 중앙 석재 광장과 다른 폐허 구역,잎이 쌓인 숲 패치가 있습니다. 동일 terrain의 이웃 관계로 네 방향16개 경계 mask를 선택해2~5px 디더링으로 전이를 표현합니다. 잔디는4개 변형을 사용합니다.

클라이언트 좌표 hash로 장식과 타일을 선택하므로 모든 브라우저가 동일 지형을 봅니다. 이는 서버에 새로운 게임 상태를 추가하지 않는 시각 배치입니다. 지형과 그림자는 게임 Scene마다 한 번 만들고 반복 snapshot에 재생성하지 않습니다.

## 실제 에셋

Imagegen으로 투명 PNG 원본을 생성해 사용했습니다. 생성 결과는1254×1254이며 이를 직접 조사한 뒤32px 타일과 개별 prop로 가공했습니다. 요청한1024px와 다르게 나온 원본을1024px라고 주장하지 않았습니다.

- tiles/ground-v1.png:416×128,52개32px 타일
- tiles/details-v1.png:128×32,4개32px 투명 장식 타일
- environment/source-atlas-v1.png:1254×1254 실제 생성 원본
- environment/fir-canopy-v1.png / oak-canopy-v1.png:통행 가능한 수관
- props/fir-v1.png,oak-v1.png,dead-tree-v1.png,boulder-v1.png,pillar-v1.png,wall-v1.png,rubble-v1.png
- ambient/shadow-v1.png:64×32 알파 그림자, dust-v1.png:3×3 먼지 기능 텍스처

경로는 모두 `frontend/public/assets/` 아래입니다. 출처와 정확한 생성 prompt·가공 방법은 assets-v1.md를 확인하세요. 외부 게임/타일팩 에셋을 다운로드하거나 복제하지 않았습니다. PNG가 없거나 로딩 실패해도 대체 텍스처로 게임이 실행되며 console에 경고가 나타납니다. 대체 텍스처는 V1 품질 완료 화면으로 간주하지 않습니다.

## 실행

압축을 풀어 compose.yaml 폴더에서 Windows PowerShell:

```powershell
# 기존 .env가 있다면 유지하세요. 최초 설치 때만 복사합니다.
Copy-Item .env.example .env
docker compose up --build -d
```

기존 실행 프로젝트 업데이트:

```powershell
docker compose up --build -d frontend
```

DB/서버 코드는 변경하지 않았으며 별도 migration은 필요 없습니다. frontend Dockerfile은 Vite가 public의 실제 PNG를 dist로 복사하는 기존 구조를 사용합니다. http://localhost:8080에서 접속합니다.

## 두 브라우저 수동 검증

1. 일반 창과 시크릿 창에서 닉네임을 입력합니다.
2. 석재 광장·길·그림자·유적·수관이 두 화면에서 같은 위치인지 확인합니다.
3. A를 이동시키면 B 화면에서도 A가 움직여야 합니다.
4. 사각형 장애물 대신 보이는 폐허에 접근합니다. 기존3개 점유 범위를 통과하면 실패입니다.
5. 구조물 앞뒤로 걸으며 몸체의 y-sort를 확인합니다. 가지/수관에 가려질 때는 투명도가 낮아져야 합니다.
6. 맵 가장자리까지 이동하고 화면 크기를 바꿔 지형이 끊기거나 비어 보이는지 확인합니다.
7. 재접속·퇴장,사냥·레벨업·리스폰을 확인합니다. V1에서 규칙이 달라졌다면 실패입니다.

## 수행한 검증

- 기존 서버 pytest14개 통과
- TypeScript/Vue/Phaser 프로덕션 빌드 통과
- Chromium 브라우저 E2E3개 통과:환경 레이어/좌표/재사용/맵 끝,PNG 실패 대체,두 브라우저 이동/재접속/퇴장
- 실제 서버 snapshot과 표시 충돌 범위3개를 비교
- 전체 backend 파일을 최초ZIP과 비교하여 변경0개 확인
- PNG14개를 실제 파일/해상도/알파 검사
- 맵 초기화 후 반복 snapshot에도 props 개수 고정 확인
- 실제 변경 전후 스크린샷 확인

**미실행:** Docker 실제 기동,MySQL 운영 환경,외부 HTTPS/WSS,다양한 실제 GPU/모바일,장시간 프레임 드랍 측정. V1에서 서버를 바꾸지 않았지만 이 항목을 검증 완료로 표시하지 않습니다.

## 렌더링 성능과 제한

같은1280×800 Chromium headless의 활성 페이지에서2.2초 예열 후4초 RAF 표본을 측정했습니다.

| 표본 | 변경 전 | V1 |
|---|---:|---:|
| RAF 평균 FPS | 47.0 | 37.9 |
| 프레임 간격 중앙값 | 16.7ms | 33.3ms |
| 프레임 간격95백분위 | 33.4ms | 33.4ms |

V1에서 렌더링 비용이 늘어 평균 FPS가 약19% 낮아졌습니다. 장식 밀도를 줄이고 전체 props361개 중 당시57개만 표시했으며 먼지는16개로 제한했습니다. 기본 TilemapLayer culling과 장식의100ms 간격 화면 범위 culling을 사용합니다. 물리 body는 추가하지 않았습니다.

측정한 것은 브라우저 RAF이며 게임의 모든 프레임 처리시간이나 실제 GPU 성능 보장이 아닙니다. 서버의 몬스터 수와 카메라 위치가 완전히 같지 않고 표본도 짧습니다. **60FPS 유지나 성능 무변화를 주장하지 않습니다.** 실제 사용자 GPU에서 장시간 이동·전투 측정이 필요하며 필요하면 장식 품질 옵션·atlas batch·배경 chunk 캐시를 후속으로 검토합니다.

## 변경 전후와 남은 시각적 한계

이전:격자 잔디,단일 배경,단색 사각형 장애물.

현재:PNG52타일 지형과 변형·경계,석재 광장/흙길/잎 패치,투명 detail,나무 수관과 폐허,그림자,발 위치 정렬,가림 완화,바람/먼지.

생성 아틀라스의 경계 작은 조각은 가공 스크립트에서 제거했지만 수작업 게임 타일셋처럼 모든 실루엣/전이 조합을 정교하게 다듬은 수준은 아닙니다. 지형은 결정적 생성이며 Tiled에서 편집하는 JSON 맵은 아직 없습니다. 실시간 조명/normal map,완전한 autotile 모서리,복잡한 실내 지붕은 없습니다. 캐릭터·몬스터·전투·HUD가 기존 단순 도트/스타일인 것은 **V2~V4를 진행하지 않은 의도된 범위**입니다.
