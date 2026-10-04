# frontend/tests

Playwright 실제 두 Chromium context 테스트입니다. 실행 중인 서버와 브라우저 바이너리가 필요합니다. ARENA_URL로 테스트 주소를 변경합니다.

V3 추가 검사는 a-pvp-effects.spec.ts의 실제 두 세션 PvP, combat-effects.spec.ts의 확정 패킷 재생/ID 중복/240투사체 포화/300회 가상 만료/게임 종료 입력 타이머 정리입니다. z-combat-visuals는 실제 서버 전투 사망/리스폰과 효과 관측을 확인합니다. 전체10개 테스트가 통과했으며, 서버 상태를 주입하는 표시용 재생 검사와 실제 전투 검사는 구분합니다.

`ARENA_URL` 지정 시 개발 전용 내부 객체 검사는 건너뜁니다. 전체 회귀는 기본 Vite 개발 서버에서 실행하세요. 결과 수치는 docs/phase-v3.md를 확인하세요.

V4 a-growth-ui는 실제 NPC 처치→EXP/레벨업→3카드 선택→서버 스탯 변화를 검사합니다. ui-v4는 실제 메뉴/설정/입력·UI 데이터 연결 및 표시 패킷 재생으로3개 PC 해상도와UI125%·사망 화면을 검사합니다. 원래 V1~V3 검사를 함께 유지합니다. 표시 재생 검사는 서버 World를 바꾸지 않으며 실제 전투 검증과 구분합니다.

성장/PvP는 support/isolatedArena.ts의 별도 실제 서버·임시SQLite·캐시에서 실행해 테스트 간 몬스터 누적을 막습니다. ARENA_PYTHON에 backend/.venv의Python 절대 경로를 지정하거나 해당 가상환경을 활성화하세요. 나머지 회귀 테스트의 기본 서버8080은 별도로 필요합니다. 새 포트/프로세스는 테스트 종료 후 정리하며 기존 사용자의 서버를 종료하지 않습니다.

## 폴더 역할과 유지보수 안내

Chromium 회귀 테스트. 실제 플레이와 표시 패킷 재생 테스트를 각각 명시합니다.

[프로젝트 루트 안내](../../README.md)에서 전체 구조와 실행 순서를 확인하세요.

### 바로 아래 파일

| 파일 | 역할 |
|---|---|
| [a-growth-ui.spec.ts](a-growth-ui.spec.ts) | 실제 몬스터 사냥→EXP/레벨업→강화 선택→서버 능력치 변경 흐름 검사. 가짜 보상을 주입하지 않습니다. |
| [a-pvp-effects.spec.ts](a-pvp-effects.spec.ts) | 실제 두 게스트의 PvP 발사/명중 이벤트와 효과 수신 검사. 키 입력 드라이버만 테스트용으로 제어합니다. |
| [combat-effects.spec.ts](combat-effects.spec.ts) | V3 이벤트 표시·중복 방지·효과 상한·240 투사체·객체 재사용·Scene 종료 검사. 일부는 표시 패킷 재생입니다. |
| [environment.spec.ts](environment.spec.ts) | V1 PNG·레이어·서버 충돌 좌표·culling·대체 경로 회귀 검사. |
| [multiplayer.spec.ts](multiplayer.spec.ts) | 두 브라우저 컨텍스트의 입장·이동 전달·재접속·퇴장 흐름 검사. |
| [ui-v4.spec.ts](ui-v4.spec.ts) | V4 키보드·저장 설정·서버 수치 연결과 PC 해상도/125% UI 검사. 경계 데이터는 표시 패킷으로 재생합니다. |
| [visuals.spec.ts](visuals.spec.ts) | V2 실제 PNG·방향별 상태·피격·사망·리스폰·AOI 정리 검사. 일부 시각 상태는 재생합니다. |
| [z-combat-visuals.spec.ts](z-combat-visuals.spec.ts) | 실제 서버 전투로 사망과 리스폰을 관찰하고 V2 스프라이트 상태와 V4 화면을 검사합니다. |

### 하위 폴더

| 폴더 | 역할 |
|---|---|
| [support](support/README.md) | 성장/PvP 테스트용 실제 독립 FastAPI/Vite fixture. 고정 RNG로 재현성을 확보하고 자원을 정리합니다. |

### 변경 시 점검

실제 서버 플레이 검증과 표시 패킷 재생 검증을 구분하세요. 임시 DB와 종료 정리를 유지하고 과거 측정 JSON을 새 테스트 실행으로 간주하지 않습니다. 브라우저 테스트는 실제 FastAPI와 Vite를 함께 실행한 뒤 수행합니다.

## V5 검사

audio-v5.spec.ts는 실제 AudioContext 출력·메뉴/월드 교차 페이드·볼륨/음소거/저장·실제 NPC 성장·강화 확정·2인 PvP·사망/리스폰, 표시 패킷 재생으로 중복/거리/풀/탭 정책/정리, 음원 로딩 실패, OGG 미지원 조건의 MP3 출력을 검사합니다. 개발 내부 객체 분석은 ARENA_URL 지정 시 생략합니다. 실제 청취와 Chrome/Edge 설치판 검증을 대신하지 않습니다. 최신 실행 결과는 docs/phase-v5.md를 확인하세요.
