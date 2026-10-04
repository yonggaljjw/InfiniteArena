# Phase V3 — 전투 효과와 타격감

V1 환경·V2 캐릭터를 유지한 V3 구현입니다. UI 전체 개편(V4)은 진행하지 않았습니다.

## 기존 구조와 변경 이유

V2 Scene은 스냅샷의{id,x,y}만 받아 원형 총알을 생성하고 지수 보간했습니다. 회전 무기도 단일 원이었습니다. HP 감소는 캐릭터 틴트/Hit로 표현했지만 공격 주체·피격 방향·개별 보상 이벤트는 없었습니다. 몬스터 사망은 AOI 내부에서 사라진 경우를 추정했습니다. 기존events는PvP 킬 피드용 문자열이었습니다.

V3는 서버의 실제 발사·hurt·사망·gain_exp 이후에 관측 이벤트를 추가했습니다. 몬스터 소실 추정을 제거하고 확정death가 있을 때만 V2 사망 모션과 V3 소멸 PNG를 재생합니다. TTL/벽 충돌/관심 영역 이탈로 총알이 사라지는 것은 Hit로 처리하지 않습니다.

## 실제 구현

- 총구 섬광: 생성 PNG의2프레임,130ms. 서버의 한 발사 행동(확산탄3발도1회)에 한 번만 생성합니다.
- 투사체: 본인 기본 공격은 금색 화살, 본인 확산탄은 청록색 갈래, 타인의 위협 투사체는 밝은 외곽선을 가진 붉은 창입니다. 색뿐 아니라 끝 형태가 다릅니다. 서버vx/vy로회전하고 기존45ms 지수 보간을 유지합니다. 잔상은 이전에 실제 표시한 좌표이며 충돌/궤적을 새로 계산하지 않습니다.
- 회전 무기: 기존70반경·서버orbit_angle을 유지한 초승달 PNG. 살아있는 해당 무기 보유 플레이어의 아이콘을 표시하며 새 타격 판정은 없습니다.
- 명중: 서버hit의 위치·입사각에 Hit Spark2프레임·작은 조각·방향 표식을 적용합니다. V2 Hit/짧은 틴트도연결합니다. 본인 피해는붉은'-값', 본인이 준피해는금색'값'입니다. 무관한 타인끼리의 숫자는생략합니다. 숫자는실제 감소한HP(오버킬 제외)를소수1자리로반올림해표시합니다.
- 사망: 일반 몬스터는회청색 잿가루2프레임, 플레이어는붉은 소멸 문양과기존V2 Death. 무제한 폭발/화면 채우기는없습니다.
- 경험치: 서버는처치 직후15/30EXP를지급합니다. 수집가능한 구슬/물리바디를추가하지 않았습니다. 본인 몸 근처의민트빛 흡수 이미지와'+15 EXP'로직접 보상을표현합니다.
- 레벨업: 본인 발 주변짧은 빛과LEVEL 숫자, arena:level-up 이벤트{id,level,offerId}. HP/EXP/강화UI는기존Vue 스냅샷 구조그대로갱신됩니다. 이벤트가다시온다고선택창을중복생성하지 않습니다.
- 화면 흔들림: 본인피격만70ms·강도0.0012·최소400ms간격. 낮음품질에서는비활성입니다.

별도 캐릭터 몸체 공격 모션이나 사운드는이번 범위에포함하지 않았습니다. 발사애니메이션은총구PNG의2프레임입니다. 타인의 EXP/레벨업 문자는생략해가독성을유지하고V2 레벨표시는서버상태로갱신합니다.

## 코드와 파일 책임

| 경로 | 책임 |
|---|---|
| backend/app/game/combat_events.py | 수명·개수 제한 관측 이벤트 journal, epoch·sequence |
| backend/app/game/world.py | 기존 규칙의 결과 지점에서 fire/hit/death/experience/level_up 관측 |
| backend/app/game/combat.py | 투사체owner/vx/vy/kind 직렬화; kind는시각정보 |
| backend/tests/test_combat_events.py | 보호·실제HP손실·짧은총알·확산탄·회전·직접EXP·레벨업·상한/AOI 검사 |
| frontend/src/shared/protocol.ts | 추가메타데이터와 CombatEvent 타입 |
| frontend/src/game/scene.ts | 기존Scene에매니저연결, 렌더러구독/해제,확정몬스터사망 |
| frontend/src/game/combat/assets.ts | 실제PNG/시트·manifest 로딩,에셋실패대체 |
| frontend/src/game/combat/manager.ts | 구독·중복방지·가시성·흔들림·레벨이벤트·통계 |
| frontend/src/game/combat/projectiles.ts | 투사체/잔상 풀·회전·기존보간·회전무기 |
| frontend/src/game/combat/pool.ts | 효과이미지/숫자 상한과재사용,중앙시간업데이트 |
| frontend/src/game/combat/effects.ts | HitEffect/DamageNumber/DeathEffect/ExperienceEffect 책임분리 |
| frontend/tests/a-pvp-effects.spec.ts | 실제 두브라우저 PvP 확정 hit/fire |
| frontend/tests/combat-effects.spec.ts | 이벤트재생/중복/성장·240투사체/3만이벤트/풀회수 |
| frontend/tests/z-combat-visuals.spec.ts | 기존실전사망/리스폰+V3 확정hit/death 확인 |
| tools/build_combat_assets.py | 생성원본으로시트·개별PNG 추출 |
| tools/compare_v2_rules.py | V2/V3 권위상태동일성회귀 |
| frontend/scripts/soak-v3.mjs | 실제20연결·120초렌더링/객체/종료회수검사 |

전체실제수정/추가파일은v3-changes.json, 전체코드는별도Source 문서에있습니다. 에셋은assets-v3.md를참고하세요.

## 이벤트 계약과 중복 방지

기존snapshot v:1·입력메시지를유지하면서combat_epoch,combat_events와투사체메타데이터를추가했습니다. 기존kill-feed events는그대로입니다. 이벤트ID는월드별UUID epoch:관측sequence이며게임엔티티new_id를소비하지 않습니다.

| 종류 | 확정 시점 | 주요 필드 |
|---|---|---|
| fire | 실제Projectile 추가후 | owner,angle,weapon,shot_ids |
| hit | 보호조건통과·실제HP차감후 | owner,target,target_kind,damage,hp,angle,weapon,projectile_id |
| death | 실제HP가0이하가된후 | owner,target,target_kind |
| experience | 기존gain_exp 호출후 | owner,amount |
| level_up | gain_exp전후level이증가한경우 | owner,level,offer_id |

입사각은서버가명중처리한vx/vy(근접은몬스터→대상)로계산하며방향을알수없으면null입니다. 발사전/명중전예측효과는사용하지 않습니다. 같은이벤트를2~4개의스냅샷에서받아도ID Map으로1번만표현합니다. 보상은본인에게AOI와무관하게전달합니다. 다른효과는기존±950×650 AOI를따릅니다.

서버journal은최대2048개,최근8틱(20Hz에서0.4초)입니다. 클라이언트seen은최대2048개/2.2초이고월드epoch 변경시초기화합니다.8틱보다늦게도착한이벤트는이미늦은타격을재생하지않고건너뜁니다.0.4초보다긴단절에서는효과가누락될수있습니다. durable 이벤트저장·클라이언트ACK·정확히한번전달을보장하는메시지큐는아닙니다. HP·EXP·생존상태는항상스냅샷이권위이며효과가보상을결정하지않습니다.

## 풀·품질·정리

| 품질 | 효과 이미지 | 숫자/문자 | 투사체 잔상 | 명중 조각 | 흔들림 |
|---|---:|---:|---:|---:|---|
| low | 64 | 16 | 24 | 2 | 없음 |
| normal(기본) | 192 | 40 | 100 | 4 | 제한 적용 |
| high | 320 | 64 | 200 | 7 | 제한 적용 |

투사체본체는모든품질에서최대240개이며서버상한과같습니다. 회전무기는실제보유한플레이어만표시합니다. 풀은최초필요할때만상한까지생성하고종료시숨김/비활성후재사용합니다. 포화시효과를생략하며공격을막거나피해를누락시키지 않습니다. 모든이미지는공유텍스처를사용하고프레임마다 Tween/Timer를생성하지않습니다. 효과처리는중앙update로종료됩니다. 화면밖에서새효과를만들지않고투사체를숨깁니다. 퇴장 시 남은 엔티티·전투 상태를 초기화하고 대기 화면의 맵은 유지합니다. Scene의 shutdown 및 destroy 모두에서 구독·입력 타이머·resize 리스너·seen·표시 객체·풀을 정리합니다.

품질은주소쿼리로선택합니다. UI전체개편이나설정메뉴는추가하지 않았습니다.

- http://localhost:8080/?effects=low
- http://localhost:8080/?effects=normal
- http://localhost:8080/?effects=high

## 실행과 재현

PowerShell(Docker Desktop 실행후):

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

macOS/Linux는첫명령만cp .env.example .env입니다. http://localhost:8080 에일반창/시크릿창으로접속합니다. 안전구역밖에서본인금색/청록색·타인붉은투사체와입사방향·서버HP변화를비교하세요. 몬스터처치때EXP15를직접획득하고2회처치로기본30EXP를채우면레벨2/기존강화선택지가표시됩니다. PvP보상은기존반복처치억제조건에따르므로항상EXP30이나오는것은아닙니다.

개발서버Uvicorn8000/Vite8080을기존operations.md대로실행한상태에서:

```bash
# backend 디렉터리
python -m pytest -q
# frontend 디렉터리
npm ci
npm run build
npx playwright install chromium
npx playwright test
node scripts/soak-v3.mjs
```

기본soak는120초,SOAK_SECONDS=1800으로30분검사를재현할수있습니다. ARENA_URL로개발서버주소를지정합니다. 운영빌드에는게임전역참조가없어내부상태검사를사용할수없습니다. 일반multiplayer E2E만운영URL에서가능합니다. 자동입력드라이버는서버상태를수정하지않고기존50ms입력송신으로두브라우저를동시에움직입니다.

V2 ZIP을별도폴더에풀고백엔드의존성이설치된Python으로:

```bash
python tools/compare_v2_rules.py --baseline /path/to/v2/infinite-arena
```

20플레이어/초기80몬스터·3난수seed·각1200틱을같은입력으로재생합니다. 원래V2 World를불러오고변경없는공통엔티티/이동/성장모듈을공유합니다. 추가관측필드를제외한게임상태·RNG소비·통계·기존킬피드·엔티티ID를비교하며네트워크나FPS부하검사는아닙니다.

## 한계와 미구현

사운드,몸체공격전용모션,실제수집가능EXP오브젝트,효과ACK/장기보관,배율별비트맵숫자폰트,설정메뉴/V4 전체UI는미구현입니다. 과밀전투에는효과/숫자를의도적으로생략합니다. V2의일부프레임재사용·인접닉네임겹침도남아있습니다. 실제GPU/저사양/모바일60FPS·30분이상안정성·외부WSS/Docker/MySQL운영기동은미검증입니다.

## 실제 검증 결과와 완료 판정

**V3 요청 범위의 코드·실제 PNG 구현과 로컬 검증 완료. V4는 미구현입니다. 60FPS 목표와 운영 환경 검증까지 완료했다는 의미는 아닙니다.**

| 검사 | 실제 결과 |
|---|---|
| 백엔드 pytest | 23개 통과. 보호·명중·동시 회전 타격·사망·EXP·레벨업·이벤트 상한 포함 |
| 타입 검사/프로덕션 빌드 | 통과. Phaser 포함 JS gzip 약378KB, 큰 chunk 경고 남음 |
| Chromium E2E | 10개 통과(56.3초). 실제 두 브라우저 PvP/이동·재접속/퇴장, V1/V2 회귀, 패킷 재생/풀 포화, 게임 종료와 입력 타이머 정리 |
| V2 게임 규칙 비교 | 3개 seed×1200틱=3600틱, 20플레이어/초기80몬스터. 관측 필드를 제외한 권위 상태 차이0 |
| V1/V2 보존 | 환경·캐릭터 에셋/렌더러, 서버 이동/충돌/성장, 네트워크·HUD 등45개 파일 바이트 동일 |
| 실제 연결 부하 | Chromium 화면1개+브라우저 WebSocket 봇19개, 총20연결·120초. 페이지/봇 오류0 |
| 실제 전투 관측 | 화면의 누적 fire 406, hit 453, death 66, EXP 44, level_up 18. AOI 이벤트 포함이며 본인 횟수만을 의미하지 않음 |
| 실제 풀 사용 | 효과 이미지 최대54/192, 문자5/40, 본체 할당5/240. 퇴장 후 활성 효과·엔티티·seen 모두0 |
| 실제 게임 종료 | Game.destroy 후 이미지/문자/투사체/구독/seen 모두0 |
| 실제 렌더링 | 1280×800 Chromium134 headless, 마지막 누적 RAF 약30.18FPS. 실제 GPU 60FPS 보장 아님 |
| 서버 부하 | 마지막 health tick 0.483ms, 누적 overrun 5회, 통계 저장 실패/큐 거부0 |
| PNG 검사 | 원본/공유 시트/개별 파일 RGBA·비어 있지 않은 alpha 확인, 시트16개 프레임 모두 존재 |
| Docker/MySQL·외부 WSS·30분 검사 | 미실행 |

20연결 측정에서 모든 연결의 수신량 합계는 약102.7MB/120초, 연결당 평균 약42.8KB/s였습니다. 이는 기존 전체 스냅샷과 이벤트를 합한 로컬 전송량이며 이벤트 추가분만의 측정은 아닙니다. 운영 확장 시 delta 스냅샷/이벤트 ACK 전송을 검토할 여지가 있습니다.

2분 검사와 고정 상한·종료 회수 검사에서 효과 객체의 무제한 누적은 관찰하지 않았습니다. 30분 이상의 메모리 안정성은 미검증입니다. performance.memory는 브라우저의 대략적/양자화된 지표이므로 실제 힙 누수가 없다는 증거로 단정하지 않습니다.

다수 투사체 테스트는 표시용 패킷 재생으로240개 본체·3만개 고유 hit·300회 가상 만료/재사용을 실행합니다. 실제 서버에240개 총알을 강제로 생성하거나300초 플레이한 검사는 아닙니다. 포화 시 장식 효과 생략, seen≤2048, 반복 예열 이후 Scene 자식 수 일정, Tween/Scene 타이머0을 확인합니다. 실제 피해는 별도 서버 로직/PvP E2E에서 검사합니다.

## V2/V3 렌더링 표본 비교

같은 Chromium134 headless·1280×800·단일 활성 페이지에서2.2초 예열 후4초 RAF를 각각 측정했습니다. 최초 표본은V2 9.59FPS/V3 33.86FPS로 첫 화면에서 큰 지연이 있었습니다. 캐시가 준비된 뒤 동일 절차로 다시 측정한 표본은V2 31.01FPS/V3 34.74FPS였습니다. 최초 결과도v3-performance-initial.json에 보존했습니다.

| 재측정 | V2 | V3 |
|---|---:|---:|
| RAF FPS | 31.01 | 34.74 |
| 프레임 간격 중앙값 | 33.3ms | 33.3ms |
| 프레임 간격 p95 | 50.0ms | 33.4ms |

이 표본은 캐시·전투 배치·환경 부하가 완전히 통제되지 않아 V3가 빨라졌다는 증거로 사용하지 않습니다. 많은 투사체가 계속 발생하는 상태의60FPS를 입증한 검사도 아닙니다. 실전20연결 표본은 별도로30.18FPS였습니다. 목표60FPS는 이 환경에서 미달이며 실제 GPU/저사양에서 추가 측정이 필요합니다.

`frontend/scripts/benchmark-v3.mjs`가 재현 스크립트입니다. 개발 서버/캐시 설정만 바꾼 V2 측정용 사본은 제공 코드에 포함하지 않습니다.
