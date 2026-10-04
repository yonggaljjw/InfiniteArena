# frontend

Vue3 + Vite + TypeScript + Phaser3 프로젝트입니다. npm ci, npm run dev, npm run build를 사용합니다. Docker 운영 이미지는 빌드 결과를 Nginx로 제공합니다.

V4 UI는 src/components/와 src/ui/에 있습니다. 서버 게임 상태는 기존 shared/bridge.ui.snapshot, 로컬 표시 설정은 shared/preferences로 관리합니다. docs/phase-v4.md와 design-system-v4.md에 구조·데이터 흐름·제한을 설명했습니다.

## 폴더 역할과 유지보수 안내

Vue 3·Phaser 3 클라이언트와 Vite·Nginx·브라우저 테스트. Docker는 여기서 dist를 만든 뒤 Nginx에 복사합니다.

[프로젝트 루트 안내](../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [.dockerignore](.dockerignore) | Docker 빌드 컨텍스트에서 로컬 의존성/비밀/산출물 제외. |
| [Dockerfile](Dockerfile) | Node 단계에서 dist를 빌드하고 Nginx 단계에는 배포 산출물만 복사합니다. 소스 변경은 이미지 재빌드가 필요합니다. |
| [index.html](index.html) | Vue 마운트 DOM과 module 진입점 HTML. |
| [nginx.conf](nginx.conf) | 배포 프론트 정적 파일과 동일 출처 /api·/ws 프록시. WS Upgrade 헤더와 긴 read timeout을 유지합니다. |
| [package-lock.json](package-lock.json) | npm ci 재현용 의존성 잠금. 직접 주석을 넣거나 손으로 수정하지 말고 npm으로 갱신합니다. |
| [package.json](package.json) | scripts(dev/build/test:e2e), dependencies(Vue/Phaser/font), devDependencies(Vite/TS/Playwright). 버전 변경 시 lock도 갱신합니다. |
| [playwright.config.ts](playwright.config.ts) | 브라우저 회귀 테스트의 기본 주소·단일 worker·시간 제한·PC 뷰포트 설정. |
| [tsconfig.json](tsconfig.json) | compilerOptions/include의 TypeScript 검사 범위와 strict 설정. 렌더링 실행 규칙이 아닙니다. |
| [vite.config.ts](vite.config.ts) | Vue 빌드와 개발 API/WS 프록시 설정. 운영 프록시는 nginx.conf가 담당합니다. |

### 하위 폴더

| 폴더 | 역할 |
|---|---|
| [public](public/README.md) | Vite가 경로를 보존하여 dist로 복사하는 공개 정적 파일. /assets/... URL로 읽습니다. |
| [scripts](scripts/README.md) | Playwright 기반 성능/연속 전투 측정 도구. 결과 파일을 docs에 쓰므로 실행 대상을 먼저 확인합니다. |
| [src](src/README.md) | Vue UI·공유 스냅샷·네트워크·Phaser 렌더링의 소스 루트. main.ts에서 시작합니다. |
| [tests](tests/README.md) | Chromium 회귀 테스트. 실제 플레이와 표시 패킷 재생 테스트를 각각 명시합니다. |

### 변경 시 점검

경로·환경변수·의존성을 변경하면 루트 실행 안내도 맞춰 주세요. 과거 검증 결과를 최신 결과로 표시하지 않으며 실행하지 않은 Docker/MySQL/외부 배포 검증은 미실행으로 남깁니다.

## V5 오디오

src/audio가 실제 Phaser Sound Manager를 중앙화하며 public/assets/audio에 BGM2곡·SFX16종을 두 포맷으로 제공합니다. 기존 런타임 의존성을 유지합니다. [오디오 설계·테스트](../docs/phase-v5.md).
