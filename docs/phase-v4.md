# Phase V4 — 게임 전용 UI/UX

## 현재 구조 분석

V3까지 App.vue는 GameCanvas/JoinPanel/GameHud를 조합하고, GameHud 하나가 상단 웹 내비게이션·progress·랭킹·강화·사망을 모두 렌더링했습니다. 녹색 버튼/둥근 패널과 화면 전체 폭의 헤더가 월드를 가렸고 무기 이름은 서버 코드 문자열이었습니다. 공유 reactive `ui`와 snapshot bridge는 이미 있으며 별도 Pinia 게임 상태를 만드는 이유가 없습니다.

V4는 서버 소스·API/WS 스키마·월드/캐릭터/전투 렌더러를 그대로 유지하고 화면 공간 UI만 역할별로 구성했습니다. Phaser 입력이 닉네임의 WASD 편집을 막지 않도록 키 캡처를 끄고, 설정 중 게임 이동 입력은0으로 보냅니다. 이동 속도·충돌·전투 판정은 변하지 않습니다.

## 구현과 컴포넌트

| 실제 경로(frontend/src 기준) | 역할 |
|---|---|
| App.vue | Canvas/메뉴/HUD/설정/오류 조합, UI 크기·동작 감소 적용 |
| components/GameHud.vue | 스냅샷의 본인 조회, HUD/강화/사망 구성 |
| components/JoinPanel.vue | 게임 로고·닉네임·입장·설정·실제 접속 안내 |
| components/ui/VitalBars.vue | HP/EXP 수치·게이지·다음 레벨 잔여EXP, 둘을 함께 관리 |
| components/ui/Leaderboard.vue | 서버 상위5명·접속 인원·ID로 본인 강조·목록 밖 안내 |
| components/ui/WeaponPanel.vue | 실제 해금 무기·총알 피해·공격 간격·이동·보호 상태 |
| components/ui/GameIcon.vue | 직접 작성한 SVG 게임 아이콘 |
| components/UpgradeSelection.vue | 서버 choices/offer_id에 따른3카드·중복 클릭 방지·응답 대기 |
| components/DeathOverlay.vue | 실제 최종레벨·세션 PvP 처치/사망·서버 리스폰 대기·중복 요청 방지 |
| components/GameSettings.vue | UI 크기·UI 동작 감소·능력치 표시, 모달 키보드/포커스 |
| shared/presentation.ts | 서버 선택 ID의 표시 이름/설명·무기 이름·현재 스탯 표시 |
| shared/preferences.ts | 검증된 로컬 표시 설정과 설정 열림 상태 |
| ui/tokens.css / ui/game-ui.css | 공통 디자인 토큰·화면·해상도·모션 |
| style.css | 전체 화면과 스타일 가져오기 |
| game/input.ts | 설정/입력 편집 시 이동0·native WASD 편집 허용 |
| network/client.ts | 기존 통신 유지, 429/서버 오류 안내와 성공/퇴장 시 오래된 오류 정리 |

무의미하게 각 아이콘이나 게이지를 개별 모듈로 늘리지 않았습니다. 서버 상태는 ui.snapshot 한 군데이며 GameHud에서 computed로 본인을 조회합니다. V4 전체 수정/추가 파일은 docs/v4-changes.json, 바이너리를 제외한 전체 실제 코드는 별도 Source 문서에 경로별로 포함됩니다.

## 데이터 흐름과 진실의 기준

서버 snapshot → 기존 ArenaClient → bridge.publish → reactive ui.snapshot → Vue computed/props → HUD/랭킹/강화/사망 순서입니다. 같은 bridge의 Scene 구독은 기존 Phaser 이동/캐릭터/전투 효과를 갱신합니다. Vue가 자체 HP·EXP·레벨·랭킹 복제 상태를 만들지 않습니다. Phaser 렌더링 객체·보간 상태도 Vue 설정에 저장하지 않습니다.

| 화면 | 실제 서버 필드·처리 |
|---|---|
| HP | hp/max_hp. 음수 HP를 바/숫자에서0으로 한정, 숫자는 기존처럼 올림, aria-valuenow는 실제 수치 |
| EXP | exp/exp_next, 잔여량은 max(0,exp_next-exp) |
| 레벨/이름 | players 중 id===playerId의 level/nickname |
| 랭킹 점수 | leaderboard.kills/level. 서버는 PvP 처치 우선·레벨 다음 순으로 상위5명만 제공 |
| 내 순위 | 제공된5명 중 ID 위치. 외부라면 '상위5위 밖'; 전체 순위를 추측하지 않음 |
| 접속 인원 | online |
| 무기/능력치 | weapons/damage/cooldown/speed. damage는 총알 피해임을 표시 |
| 보호 | snapshot.protected와 본인 alive |
| 강화 | 서버 choices만 렌더링, 원래 choice ID/offer_id를 upgrade_selected로 전송 |
| 사망 | alive=false, level/kills/deaths. kills는 세션 PvP 처치, NPC 처치 수/생존시간은 미제공 |
| 리스폰 | 서버 respawn_in===0과 접속 완료 때 기존 respawn 메시지. 서버의3초 정책 유지 |

무기 레벨·스킬 쿨다운별 진행률·강화 등급·생존 시간은 제공되지 않아 만들지 않았습니다. 대신 무기 해금과 실제 현재 능력치만 보여 줍니다. 카드의 다크 판타지 이름은 표시용 이름이며 규칙과 choice ID는 바뀌지 않습니다.

강화/리스폰은 요청을 보내면 중복 클릭을 억제하고 서버 응답을 기다립니다. 강화는 새로운 offer_id, 리스폰은 alive 전환으로 갱신합니다. 3초 동안 확인되지 않으면 재시도할 수 있는 오류를 표시합니다. 서버 스냅샷을 낙관적으로 바꾸거나 실제 보상을 먼저 지급하지 않습니다. 전환 애니메이션 중 오래된 버튼도 현재 authoritative 상태를 검사합니다.

## 설정과 입력

UI 크기90/100/115/125%, UI 동작 감소, 상세 능력치 표시를 localStorage에 검증해서 저장합니다. 저장이 금지되거나 JSON이 손상되어도 기본값으로 실행합니다. 설정값은 서버에 전송되지 않으며 게임 상태와 별개입니다. 설정 화면 동안 월드의 시간·전투·다른 사용자 이동은 계속됩니다. 방향키는 설정의 native select를 조작할 수 있으며 Phaser가 preventDefault하지 않습니다.

별도 사운드 설정이나 효과 품질 메뉴는 추가하지 않았습니다. V3 효과 품질은 기존 ?effects=low|normal|high를 계속 사용합니다.

## 실행 및 재현

압축을 풀고 compose.yaml 폴더에서 PowerShell:

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

macOS/Linux는 첫 줄을 cp .env.example .env로 바꾸세요. http://localhost:8080에 일반/시크릿 창으로 접속합니다. Docker 없이 실행하는 방법과 필요한 의존성은 operations.md와 각 폴더 README에 있습니다. MySQL 대신 SQLite로 수행한 검사를 MySQL 검증이라고 주장하지 않습니다.

Vite8080/FastAPI8000 실행 상태의 자동 검증:

```bash
# backend
python -m pytest -q
# frontend
npm ci
npm run build
npx playwright install chromium
npx playwright test
```

V4 추가 테스트는 a-growth-ui.spec.ts(실제 NPC 처치·EXP·레벨업·카드 선택), ui-v4.spec.ts(메뉴/설정/서버 데이터와3해상도·UI125%·사망 표시 재생)입니다. ui-v4의 표시 재생은 테스트 페이지의 bridge 출력만 고정하며 서버 World를 바꾸지 않습니다. 실제 사망/리스폰·PvP·이동·회귀는 별도 기존 테스트로 검사합니다. ARENA_URL 지정 시 개발용 내부 상태/패킷 재생 검사는 건너뜁니다.

## 아직 남은 한계

실제 GPU/저사양·모바일·30분 안정성·Docker/MySQL·외부 HTTPS/WSS는 이번 환경에서 미검증입니다. V3에서 60FPS 목표 미달이었고, V4가60FPS를 달성했다고 주장하지 않습니다. 극단적인 축소 화면/모바일 입력은 초기 PC 범위 밖입니다. 메뉴/사망 중에도 서버 월드가 계속 진행되며, 설정을 열었다고 안전/일시정지 상태가 되지 않습니다. 상위5명 밖의 정확한 순위·무기 레벨·생존 시간은 서버 계약이 추가되어야 구현할 수 있습니다.

성장과 PvP 검사는 tests/support/isolatedArena.ts가 별도 FastAPI/Vite와 임시 SQLite를 시작하고 종료합니다. 이전 테스트의 살아남은 몬스터가 결과를 좌우하지 않도록 각각 새로운 World로 검사하며 서버 규칙/엔티티·보상 상태를 주입하지 않습니다. 테스트 서버에만 난수 seed83을 고정해 기존 생성 규칙의 동일한 사례를 재현합니다. 일반 실행의 난수 정책은 바뀌지 않습니다. 포트·Vite 캐시·DB는 테스트가 소유한 임시 공간으로 분리하고 종료 시 정리합니다.

이 두 검사에는 백엔드 의존성이 설치된 Python이 필요합니다. Python 가상환경을 활성화한 터미널에서 frontend 테스트를 실행하거나 ARENA_PYTHON을 지정하세요.

```powershell
# 프로젝트 루트에서 Windows 가상환경 경로 예시
$env:ARENA_PYTHON = (Resolve-Path backend/.venv/Scripts/python.exe).Path
cd frontend
npx playwright test
```

Linux/macOS는 `export ARENA_PYTHON=/absolute/path/backend/.venv/bin/python`입니다. 기존 Vite8080/FastAPI8000은 나머지 회귀 테스트를 위해 실행해 둡니다.

## 완료 기준과 V1~V4 통합 결과

**V4 요청 범위의 UI 코드·디자인 시스템 구현과 로컬 통합 검증 완료입니다. 전체 운영 검증 완료를 뜻하지 않습니다.**

| 단계/조건 | 실제 결과 |
|---|---|
| V1 맵 | 기존 PNG·다층 레이어·장애물 좌표·culling/재사용 및 PNG 실패 대체 검사 통과 |
| V2 캐릭터 | 실제 시트·4방향/Idle·Hit·Death·리스폰·AOI 정리 검사 통과 |
| V3 전투 | 실제 두 플레이어 PvP·확정 이벤트·ID 중복 방지·240투사체/3만 이벤트 표시 재생·풀 포화·종료 회수 검사 통과 |
| V4 HUD/데이터 | 실제 HP/EXP·접속·랭킹·무기 연결, 표시 패킷의3위 본인 강조·기존 스냅샷 참조 검사 통과 |
| V4 메뉴/설정 | WASD 닉네임 편집·Tab 순환/Escape·포커스 복원·설정 저장·UI 입력0·세계 tick 진행 검사 통과 |
| V4 성장 | 별도 실제 서버 seed83에서 NPC 처치→EXP/레벨업→서버3카드→중복 클릭 요청1회→스탯 변화 검사 통과 |
| V4 사망/리스폰 | 실제 서버 사망·사망 UI·3초 대기/리스폰과 V2 스프라이트 회복 검사 통과. 생존시간은 미제공이라 미표시 |
| 해상도 | 1366×768/1920×1080/2560×1440, 각UI100%/125%의HUD/3카드/사망 화면 경계·배치 검사 통과 |
| 전투 시야 | 해당 해상도에서 상단 좌/중/우 패널 분리, 좌/우 패널의 중앙35~65% 가림 없음, 강화 카드 본체가 화면 중심 아래에 위치 |
| 브라우저 확대 등가 | 1093×614 CSS viewport와UI125% HUD 경계 검사 통과. 실제 브라우저 메뉴 확대 조작은 미실행 |
| 백엔드 회귀 | pytest23개 통과(0.56초). 의존성 deprecation 경고1개 |
| 전체 브라우저 회귀 | Chromium134 headless13개 통과(약1.3분). 무작위/공유 월드에 의존했던 성장/PvP 검사는 각 새 서버와 고정 난수로 재현 가능하게 수정 |
| 코드 보존 | V3 대비112개 파일(backend44개 포함) 바이트 동일. 모든 서버 소스/스키마·V1~V3 에셋·월드/전투 렌더러 유지 |
| 운영/장시간 | Docker/MySQL·외부WSS·30분 안정성·실제GPU/모바일은 미실행 |

형식적인 리팩토링에 그치지 않고 전체 폭의 웹 헤더/녹색 웹 버튼/둥근 폼을 게임 패널·좌우 HUD·하단 무기·금색 카드·로고 메뉴로 실제 교체했습니다. 스크린샷은 아래 설명을 따라 실제/표시 재생을 구분합니다.

- menu-live-v4.png, hud-live-v4-해상도.png: 실제 입장/서버 HUD 화면.
- upgrade-applied-live-v4.png: 실제 레벨업 카드 선택 후 서버가 변경한 스탯 화면. 카드 시연용 재생 화면과 구분합니다.
- death-live-v4.png: 실제 서버 사망 화면.
- upgrade-v4-1366.png, death-v4-1366.png, hud-v4-1366-1.25.png: 명시적인 표시 패킷 재생. 높은 레벨/긴 이름/5명 랭킹/낮은HP/125% 배치를 보기 위한 UI 검사이며 실제 해당 전투 성과를 주장하지 않습니다.
- settings-v4.png: 실제 설정 UI/기본값 복원 화면.

V3의20연결120초 결과는 이전 단계의 기록으로 유지했으며 V4에서 다시 수행했다고 주장하지 않습니다. 이번 통합 검사는13개 브라우저 회귀와 실제3해상도 표본입니다.

## 현재 버전의 실제 렌더링 표본

실제1플레이어가 안전구역에서 정상 REST/WS로 접속한 상태에서 각 해상도2.2초 예열 후4초 RAF를 측정했습니다. Chromium134 headless, UI100%, WebGL renderer2이며 이 실행 환경의 GPU 가속 수준을 실제 사용자 PC와 동일하다고 가정하지 않습니다.

| 해상도 | RAF FPS | 중앙 프레임 간격 | p95 프레임 간격 |
|---|---:|---:|---:|
| 1366×768 | 52.10 | 16.7ms | 33.3ms |
| 1920×1080 | 26.70 | 33.4ms | 50.1ms |
| 2560×1440 | 17.17 | 66.6ms | 66.7ms |

페이지 오류0, DOM 요소93개였습니다. 60FPS는 달성하지 못했고, 특히1440p는 이 환경에서 느립니다. 이는 안전구역의짧은 표본이며 다수 투사체 전투 성능이나 실제GPU의 결과가 아닙니다. 렌더링 해상도/품질 최적화와 실기기 측정은 후속 성능 작업입니다. UI 고급화 완료와60FPS 달성은 구분합니다. 원시 결과는v4-performance.json, 재현 스크립트는frontend/scripts/benchmark-v4.mjs입니다.

최종 타입 검사/프로덕션 빌드가 통과했습니다(6.04초). Phaser 포함 JS gzip 약387KB/CSS 약31.8KB이며 큰 chunk 경고는 남아 있습니다.
