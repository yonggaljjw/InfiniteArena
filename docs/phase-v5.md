# Phase V5 — 실제 BGM·효과음 통합

## 기존 코드와 범위

V1 환경 Scene/레이어, V2 스프라이트 렌더러, V3 CombatEffectManager, V4 Vue 설정·HUD와 bridge를 분석한 뒤 프론트엔드에만 오디오를 연결했습니다. 서버는 이미 ID/tick/epoch가 있는 fire/hit/death/experience/level_up을 전달합니다. 일반 몬스터 한 종류, 기본 총알·확산탄·회전 무기가 존재합니다. 경험치는 처치 직후 지급하므로 수집 구슬이나 새 게임 규칙을 만들지 않습니다.

서버 API/WS·이동·AI·공격력·충돌·경험치·강화·리스폰 규칙은 수정하지 않았습니다. 실제 파일별 변경은 v5-changes.json, 백엔드/기존 PNG 보존은 v5-preservation.json에 기록합니다. 기존 V1~V4 문서의 검증은 당시 기록이며 이번 검증과 구분합니다.

## 구조와 데이터 흐름

- `audio/manifest.ts`: 실제 JSON의 18개 ID와 URL·볼륨·우선순위를 읽고 Phaser Loader로 프리로드합니다.
- `audio/service.ts`: 단일 서비스가 Phaser Sound Manager의 음악2객체와 종류별 SFX 풀을 소유합니다. Vue는 별도 플레이어를 만들지 않습니다.
- `audio/settings.ts`: 로컬 설정은 서버 스냅샷과 분리합니다. 손상된 저장 값을 검사하고 기본값으로 복원합니다.
- `game/scene.ts`: preload → attach → 매 프레임 update → shutdown detach. 스냅샷을 snapshot에, V3 중복 제거 후 전투 이벤트를 combat에 전달합니다.
- `GameSettings.vue`: 반응형 설정만 편집합니다. App.vue는 잠금 안내와 사운드 활성화 버튼을 표시합니다.

WebSocket → bridge의 서버 스냅샷 → Scene → 기존 V3 이벤트 ID 중복 제거/8tick 유효기간 → audio.combat → 거리·쿨다운·우선순위 검사 → Phaser Sound. 로컬 HP 감소를 별도 추측해 중복 피격음을 만들지 않습니다. UI 클릭은 중앙 DOM 이벤트로 처리합니다.

## 음악·브라우저 정책

메뉴·월드 두 곡은 32초,22,050Hz 스테레오이며 루프합니다. 낮은 드론·마이너 화성·플럭·짧은 잔향을 원본 합성하고 월드 곡에 절제된 저음 드럼을 추가했습니다. 30ms 경계 테이퍼를 적용하고 압축 후 파형 경계를 확인합니다. 완전한 오케스트라 녹음이나 사람이 믹싱한 상업 음원이라고 주장하지 않습니다.

같은 곡은 재시작하지 않습니다. 월드 입장/퇴장에900ms 교차 페이드를 적용하고 사라진 곡을 정지합니다. 중요한 피격·레벨업·강화·처치음 동안 BGM만 짧게55%로 부드럽게 낮춥니다. 설정 숫자는 바꾸지 않습니다.

최초 사용자 pointerdown/keydown/클릭 이후 컨텍스트 활성화를 요청합니다. 잠금 중에도 게임은 실행되며 놓친 소리를 쌓지 않습니다. 실패 시 안내하고 다음 입력에서 재시도합니다. 탭이 hidden이면 BGM seek를 유지해 pause하고 SFX는 stop합니다. 활성화했던 탭의 복귀 시 resume하며 누락 전투음을 몰아 재생하지 않습니다. 단순 창 blur와 실제 hidden은 구분합니다.

**Intense Combat 음악은 미구현입니다.** 발사 횟수만으로 안정적인 교전 강도를 판정하지 않습니다. 사용자 요구의 우선 범위인 Main Menu/World Exploration부터 완성하며 추후 별도 곡과 최소 유지시간/진입·해제 기준이 필요합니다.

## 효과음 연결표

| 실제 입력/서버 상태 | ID | 조건 |
|---|---|---|
| fire | shot / spread | 서버 무기, 월드 좌표 거리 감쇠; 본인·타인 동일 발사 음색 |
| monster hit | monster_hit / heavy_hit / orbit | 회전 무기 구분, 실제 소모 HP25이상 강한 명중음 |
| 내 피격 | player_hit | 명중 이벤트 target이 본인, 최고 우선순위 |
| 다른 플레이어 피격 | pvp_hit | 플레이어 target, 거리 감쇠 |
| 일반 몬스터 death | monster_death | 실제 사망 이벤트, 거리 감쇠 |
| 내 death | player_death | 실제 사망 확정 |
| 내 공격으로 타 플레이어 death | pvp_kill | 서버 owner/target, 보상 제한 중 처치도 사망 사건 자체는 표현 |
| 내 experience | experience | 서버 직접 지급 이벤트 |
| 내 level_up | level_up | 서버 확정 이벤트와 기존 V4 카드 표시가 같은 스냅샷에서 처리 |
| 강화 카드 클릭 | ui_click | 선택 요청, 성공음과 구분 |
| 강화 성공 | upgrade | 본인 생존 세션, 클릭한 제안 offer_id의 다음 번호 확정,3초 제한 |
| 리스폰 성공 | respawn | 서버 본인 alive false→true, 버튼 클릭만으로 성공 처리 안 함 |
| 버튼 클릭 | ui_click | 활성화된 실제 사용자 입력, disabled 제외 |
| 강화 카드 진입 | ui_hover | 짧은 소리,130ms 간격; 카드 내부 이동 제외 |

새 강력/특수 몬스터, 보호 성공음, 새 스킬은 서버에 없으므로 만들지 않았습니다. 회전 무기는 기존 hit 이벤트를 사용하며 별도 가짜 fire를 만들지 않습니다. 강화 pending은 사망·플레이어 변경·3초 초과 시 삭제하여 리스폰의 offer 증가를 강화 성공으로 오인하지 않습니다.

## 실제 파일·출처

`frontend/public/assets/audio/bgm/{menu,world}.{ogg,mp3}` 및 `sfx/`의16종: shot,spread,orbit,monster_hit,heavy_hit,player_hit,pvp_hit,monster_death,player_death,pvp_kill,experience,level_up,upgrade,respawn,ui_click,ui_hover.

총36파일,1,159,700bytes. `manifest-v5.json`에 길이·샘플레이트·채널·원본 peak/RMS·재생 제한·파일 SHA256을 기록합니다. 생성 도구는 `tools/build_audio_assets.py`, 제작 전용 NumPy는 `tools/requirements-audio.txt`, 인코더는 FFmpeg(libvorbis/libmp3lame)입니다. 일반 게임 실행에는 제작 도구를 실행할 필요가 없습니다.

외부 샘플·녹음·기존 곡을 사용하지 않은 원본 합성입니다. 이 생성 음원의 게임/상업적 사용·수정·재배포를 허용하며 출처 표시를 요구하지 않습니다. 적용 범위는 [음원 README](../frontend/public/assets/audio/README.md)에 한정합니다. 외부 라이선스 취득을 주장하지 않습니다.

Phaser가 OGG 지원 시 OGG, 미지원이면 MP3를 선택합니다. 네트워크 로딩 실패가 다음 포맷으로 자동 재시도되는 구조는 아닙니다. 누락 SFX 생략, 가능한 BGM 사용, 전부 실패 시 게임을 계속하는 정책입니다. 둘 다 제공되는 실제 파일을 ZIP과 production dist에 포함합니다.

## 설정·성능·정리

Master80%,BGM40%,SFX70%,Mute false 기본값.0~100 슬라이더와 체크박스는 이미 재생 중인 채널에도 즉시 적용합니다. `infinite-arena-audio-v5` localStorage에 저장하고 유효 타입/범위를 검사합니다. 기존 UI 초기화는 사운드 기본값도 복원합니다. 설정 대화상자는 기존 스크롤과 키보드 포커스 순환을 유지합니다.

전역 활성 SFX12개, 종류별1~2개, 총 할당 상한25개입니다. 소리는 재사용하고 완료마다 JS 타이머/Tween을 생성하지 않습니다. 같은 ID 쿨다운65~800ms 범위(실제 값은 manifest), 거리90px 이내 원음량·650px 이상 생략·중간 제곱 감쇠. 전역 포화 시 새 소리의 우선순위보다 낮은 가장 오래된 소리만 선점합니다. 같은 종류 상한은 무조건 준수합니다. WebAudio 출력에 단일 compressor를 연결해 동시 출력 피크를 제한하며 HTML5Audio 대체 환경은 이 제한기 대신 동일 풀/볼륨 상한만 적용합니다.

숨긴 탭·음소거·볼륨0·잠금·캐시 누락은 효과음을 큐에 쌓지 않습니다. detach는 모든 음악/SFX, Vue watchers, DOM/unlocked listeners를 제거하고 compressor 경로를 복원합니다. Phaser Game 자체 리소스 해제는 기존 GameCanvas가 수행합니다. Decode 메모리는 약11~12MiB 추가되며 60FPS 성능 목표의 장시간 측정은 아직 하지 않았습니다.

## 실행·재현

프로젝트 루트에서:

```bash
cp .env.example .env
docker compose up --build -d
```

Windows PowerShell은 `Copy-Item .env.example .env`. http://localhost:8080 에서 활성화 버튼/입장 버튼을 누른 후 설정의 세 볼륨과 음소거를 확인하세요. 탭을 숨겼다가 돌아오고, 나가기→재입장으로 음악 중복을 확인합니다. 이 환경의 Docker/MySQL 기동은 미실행입니다.

실제 두 브라우저(일반/시크릿 또는 별도 브라우저)에서 다른 닉네임으로 입장하고 안전구역 밖에서 약100~150px 간격으로 교전하세요. 각자의 피격·사망·처치음, 먼 플레이어의 발사음 감쇠를 확인합니다. 몬스터 사냥 후 레벨업 카드 클릭음과 서버 확정음, 사망3초 후 리스폰 성공음을 확인하세요.

로컬 개발 테스트는 기존 operations.md의 FastAPI8000/Vite8080을 먼저 실행한 후:

```bash
cd frontend
npm ci
npx playwright install chromium
npm run build
# 백엔드 가상환경을 활성화하거나 ARENA_PYTHON을 해당 Python의 절대 경로로 지정
npx playwright test
# 오디오만 검사
npx playwright test audio-v5.spec.ts
```

오디오 검사는 자체 실제 FastAPI/Vite 프로세스와 SQLite·고정 RNG83을 생성하고 종료합니다. 서버 상태/공격력/보상을 주입하지 않고 가상 키보드 입력만 제어합니다. 전체 기존 테스트 일부는 기본8080 서버가 필요합니다. `ARENA_URL` 지정 시 내부 모듈 분석 테스트는 생략됩니다. 서버 단위 테스트는 `cd backend && python -m pytest -q`.

## 검증 결과와 한계

최종 수치는 v5-validation.json에 기록합니다. 이번 실행에서 서버23개, 기존13개+V5오디오6개의 Chromium 테스트19개, TypeScript/Vite production 빌드가 통과했습니다. 테스트 작성만을 통과로 간주하지 않습니다. 음원36개 파일 존재·SHA256·FFmpeg 실제 디코딩·비영점 PCM·루프 경계 검증은 통과했습니다. Chromium에서 Phaser master 출력의 AudioContext running 및 analyser 비영점 RMS를 측정하고 음소거 RMS0을 확인합니다. 이는 isPlaying 플래그만 검사하는 것이 아니라 실제 디코딩된 신호의 출력을 검사합니다. 사람이 스피커/헤드폰으로 직접 청취한 평가는 **미실행**입니다.

탭 검사는 document.hidden/visibilitychange 정책 재생으로 숨김·복귀 경로를 확인하며 OS의 실제 배경탭 오디오 정책 시험을 대신하지 않습니다.300회 풀 재사용은30분 플레이를 대신하지 않습니다. Chrome/Edge 설치판, 실제 사용자 장치 청취,30분 이상 플레이, Docker/MySQL, 외부 배포는 미실행입니다. 기존 Phaser 포함 번들 크기 경고는 유지되며 오디오 런타임 라이브러리는 추가하지 않았습니다.

운영용 dist에서도 실제18개 음원의 HTTP 로딩, 메뉴→32초 루프 경계→월드 음악 출력, 음소거 RMS0, 메뉴 복귀 후 BGM 한 곡 유지, pageerror0을 확인했습니다. 실제 출력 수치는 v5-production-output.json에 있습니다. 검증은 사람의 청취를 대신하지 않습니다.

**완료 판정:** Main Menu/World BGM,16종 실제 SFX,이벤트 연결·설정·재생 제한·실패 대체·기존 회귀검증을 완료했습니다. 선택적 Intense Combat BGM과 위의 미실행 검증은 완료로 표시하지 않습니다.

## 수정·추가 파일 목록

수정: `README.md`, `docs/README.md`, `frontend/README.md`, `frontend/public/README.md`, `frontend/public/assets/README.md`, `frontend/src/App.vue`, `frontend/src/README.md`, `frontend/src/components/GameSettings.vue`, `frontend/src/components/README.md`, `frontend/src/game/README.md`, `frontend/src/game/scene.ts`, `frontend/src/ui/README.md`, `frontend/src/ui/game-ui.css`, `frontend/tests/README.md`, `tools/README.md`.

추가 소스/도구: `frontend/src/audio/{manifest,service,settings}.ts`, `frontend/tests/audio-v5.spec.ts`, `tools/build_audio_assets.py`, `tools/requirements-audio.txt`. 추가 리소스는 `audio/manifest-v5.json`과 OGG/MP3 36개입니다. 신규4폴더 README, V5 설계·검증/보존/변경 JSON과 실제 설정 화면도 포함합니다. 상세 전체 경로는 `v5-changes.json`을 확인하세요.
