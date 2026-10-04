# Rendering benchmark

V1과 V2 개발 서버를 각각8081/8080, 동일 FastAPI 서버를8000에 실행한 뒤 frontend에서 `node scripts/benchmark-v2.mjs`를 실행합니다. 두 사본에서 `npm ci`를 별도로 실행해 Vite 캐시를 공유하지 마세요. API의 ALLOWED_ORIGINS에두서버주소를추가합니다.

V1_URL/V2_URL 환경변수로 주소를 지정할 수 있습니다. 결과와 실제 화면은docs/v2-performance.json,docs/benchmark-v1-baseline.png,docs/benchmark-v2.png에저장됩니다. 현재 출력은4초 RAF의단일표본이며서버전투/엔티티수·CPU/GPU가완전히동일한 통제벤치마크가아닙니다. 기록덮어쓰기에유의하세요.

## V3 검증

`node scripts/soak-v3.mjs`는 Vite 8080/FastAPI 8000 실행 상태에서 실제 20개 연결을 120초 유지합니다. 기존 REST/WS 입력만 사용하며 서버 게임 상태를 주입하지 않습니다. 결과는 docs/v3-soak.json과 1초 표본 JSONL에 기록됩니다. SOAK_SECONDS=1800으로 30분 검사를 실행할 수 있습니다. 이 실행의 30분 검사는 미실행입니다.

`node scripts/benchmark-v3.mjs`는 V2 개발 서버 8081과 V3 서버 8080을 차례로 측정합니다. V2_URL/V3_URL로 주소를 바꿀 수 있습니다. 동일 API 서버의 ALLOWED_ORIGINS에 두 주소를 허용하세요. 각 사본의 Vite 캐시를 분리하고 의존성을 설치합니다. 2.2초 예열 후 4초 RAF 표본이며 전투 배치가 완전히 동일한 통제 벤치마크는 아닙니다. docs/v3-performance.json과 실제 화면을 기록합니다. 운영 빌드의 내부 상태 검사는 지원하지 않습니다.

## V4 실제 화면 표본

Vite/FastAPI 실행 상태에서 `node scripts/benchmark-v4.mjs`를 실행합니다. 1366×768/1920×1080/2560×1440에서 실제1플레이어의HUD를 캡처하고2.2초 예열 후4초 RAF를 측정합니다. 결과는docs/v4-performance.json과hud-live-v4-해상도.png입니다. 안전구역의짧은 표본이며 실제GPU/다수 투사체60FPS 보장이 아닙니다.

## 폴더 역할과 유지보수 안내

Playwright 기반 성능/연속 전투 측정 도구. 결과 파일을 docs에 쓰므로 실행 대상을 먼저 확인합니다.

[프로젝트 루트 안내](../../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [benchmark-v2.mjs](benchmark-v2.mjs) | V1/V2 개발 서버의 짧은 RAF 프레임 표본 비교. 전투 상태가 같지 않으므로 GPU 성능 보장이 아닙니다. |
| [benchmark-v3.mjs](benchmark-v3.mjs) | V2/V3 개발 서버의 짧은 RAF 프레임 표본 비교. 측정 결과와 화면을 docs에 저장합니다. |
| [benchmark-v4.mjs](benchmark-v4.mjs) | V4 실제 1인 보호구역의 세 해상도 짧은 RAF 측정. 다수 전투나 장시간 부하 검사가 아닙니다. |
| [soak-v3.mjs](soak-v3.mjs) | 실제 UI 1개와 WS 봇 19개의 연속 전투 측정. ARENA_URL/SOAK_SECONDS로 대상을 지정하며 docs 기록을 갱신합니다. |

### 변경 시 점검

경로·환경변수·의존성을 변경하면 루트 실행 안내도 맞춰 주세요. 과거 검증 결과를 최신 결과로 표시하지 않으며 실행하지 않은 Docker/MySQL/외부 배포 검증은 미실행으로 남깁니다.
