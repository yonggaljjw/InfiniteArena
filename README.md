# Infinite Arena

[전체 디렉토리 구조](#전체-디렉토리-구조) · [유지보수 시작 지점](#유지보수-시작-지점) · [데이터 흐름과 주석 읽는 방법](#데이터-흐름과-주석-읽는-방법) · [문서·주석 변경 검증](docs/documentation-update.md)

**Phase V5 오디오 적용.** 실제 메뉴·월드 BGM 2곡과 SFX 16종(OGG/MP3), 단일 Phaser 오디오 서비스, 볼륨·음소거·저장 설정을 추가했습니다. [V5 결과와 검증](docs/phase-v5.md)을 확인하세요. 사용자 클릭 후 소리가 활성화됩니다.

**Phase V4 게임 UI 유지.** V1 맵·V2 캐릭터·V3 전투 PNG를 유지하고 붉은 HP·청록 EXP·금속/석재 HUD·메뉴·설정·강화 카드·사망 화면을 구현했습니다. 서버 API/WS 계약과 게임 규칙은 유지합니다. [V4 결과](docs/phase-v4.md), [디자인 시스템](docs/design-system-v4.md), [V3 기록](docs/phase-v3.md)을 확인하세요.

무기 레벨·강화 등급·생존 시간은 서버가 제공하지 않아 표시하지 않습니다. 설정에서 UI 크기·동작 감소·능력치 표시를 조절합니다. 랭킹은 서버 상위5명이며 밖의 정확한 순위를 추측하지 않습니다.

Vue 3 + Phaser 3 + FastAPI + MySQL로 만든 공유 월드 PvPvE 게임의 첫 개발 버전입니다.

## 바로 실행

Docker Desktop을 실행한 뒤 압축을 풀고, `compose.yaml`이 있는 폴더에서 실행합니다.

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

macOS/Linux에서는 첫 명령만 `cp .env.example .env`로 바꾸세요. Python이 있으면 복사 대신 `python scripts/init_env.py`로 무작위 비밀번호를 생성할 수 있습니다.

브라우저에서 **http://localhost:8080**에 접속하세요. 일반 창과 시크릿 창에서 각자 닉네임을 입력하면 서로의 캐릭터를 볼 수 있습니다. 한글/영문/숫자/밑줄 2~16자, 중복 닉네임 허용, 서버 ID로 구분합니다.

WASD/방향키로 움직입니다. 중앙의 안전구역 밖에서 가장 가까운 몬스터/플레이어를 자동 공격합니다. 몬스터를 사냥해 레벨을 올리고 강화 3개 중 하나를 선택하세요. Lv.3부터 확산탄/회전 무기가 강화 후보에 등장합니다. 사망 후 3초가 지나면 리스폰 버튼을 누릅니다.

## 제공 범위와 완료 기준

| 단계 | 이번 버전 | 완료 기준과 상태 |
|---|---|---|
| Phase 0 | 아키텍처·규칙·폴더·프로토콜·MVP 설계 | 문서 작성 완료 |
| Phase 1 | Vue/Phaser/FastAPI/SQLAlchemy/Alembic/Compose/Nginx | 코드·빌드·SQLite 마이그레이션 확인. **MySQL/Compose 기동은 이 환경에서 미실행** |
| Phase 2 | 4096 맵·도트 캐릭터·이동·장애물·카메라·HUD | 단위 테스트와 실제 Chromium 화면 확인 |
| Phase 3 | 서버 권위 이동·입력 예측/보정·상대 보간·게스트·재접속·AOI | 실제 두 Chromium 세션에서 이동 동기화 확인 |
| Phase 4 | 일반 몬스터·추적·기본 총알·충돌·사망·EXP | 서버 로직 테스트. 다른 몬스터 종류는 제외 |
| Phase 5 | 레벨·강화 3개 선택·확산탄·회전 무기 | 서버 로직 테스트. 무기별 정교한 밸런스/진화는 제외 |
| Phase 6 | PvP·킬/데스·사망·리스폰·랭킹·보호 | 서버 테스트. 반복 처치 보상 억제 포함 |
| Phase 7 | 공간 분할·AOI·엔티티 상한·입력 제한·20명 부하 스크립트 | 짧은 로컬 측정 완료. 장시간 운영 안정성은 미검증 |
| Phase 8 | 운영 이미지·Nginx WS 프록시·선택적 HTTPS 설정 | 설정 작성. **실제 외부 배포·인증서·HTTPS/WSS 검증은 미완료** |

이번 버전은 위 각 단계의 작은 구현 범위입니다. 모든 확장 기능이나 운영 검증까지 완료했다는 의미는 아닙니다. 실제 측정은 [docs/validation.md](docs/validation.md)를 확인하세요.

## 문서

- [설계와 전체 데이터 흐름](docs/architecture.md)
- [WebSocket/REST 프로토콜](docs/protocol.md)
- [첫 테스트·검증 결과](docs/validation.md)
- [운영·개발 실행 및 배포](docs/operations.md)
- [추가 작업과 단계별 체크리스트](docs/roadmap.md)

`backend/app/main.py`는 앱 구성과 월드 작업의 시작·종료만 담당합니다. `frontend/src/App.vue`는 화면 조합만 담당합니다. 게임 규칙은 `backend/app/game/`, 렌더링은 `frontend/src/game/`, 연결은 `frontend/src/network/`에 있습니다.

## 자주 쓰는 명령

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
docker compose exec backend python -m pytest -q
docker compose down
```

`docker compose down`은 DB 볼륨을 유지합니다. `down -v`는 저장 기록도 삭제하므로 초기화할 때만 사용하세요.

개발 중 자동 재시작:

```bash
docker compose -f compose.yaml -f compose.dev.yaml up --build
```

백엔드 코드 수정 시 월드가 재시작되어 현재 생존 상태는 초기화됩니다. DB 누적 기록은 유지됩니다.

## 전체 디렉토리 구조

게임 소스와 배포 패키지에 포함되는 모든 폴더입니다. 설치/실행 중 생성되는 `node_modules`, `dist`, 캐시, 테스트 결과 폴더는 아래 트리에서 제외합니다. 각 폴더의 `README.md`에는 바로 아래 파일과 하위 폴더 역할이 있습니다.

```text
infinite-arena/
  README.md
  .env.example
  .gitignore
  compose.yaml
  compose.dev.yaml
  compose.tls.yaml
  .github/  # 저장소 자동화 설정의 루트. workflows에서 빌드와 서버 테스트를 정의합니다.
    README.md
    workflows/  # GitHub Actions 검사 정의. 로컬 실행과 CI의 의존성·실행 명령을 맞춥니다.
      README.md
  backend/  # FastAPI 서버·게임 규칙·영속화·마이그레이션·서버 테스트. Docker는 이 폴더를 빌드 컨텍스트로 사용합니다.
    README.md
    Dockerfile
    requirements.txt
    app/  # 서버 실행 코드 패키지. main.py는 앱 조립과 작업 수명만 담당합니다.
      README.md
      main.py
      api/  # REST 게스트/건강상태/누적 랭킹과 WebSocket 게스트 인증/게임 요청 진입점.
        README.md
      core/  # 서버 설정. .env/환경변수의 타입·제약 조건을 한 곳에서 관리합니다.
        README.md
      game/  # 실시간 서버 권위 월드. 좌표·AI·충돌·공격·경험치·강화·리스폰과 표시 이벤트를 결정합니다.
        README.md
        world.py
      persistence/  # SQLAlchemy 모델·비동기 세션·계정/통계 저장. 매 tick의 위치를 DB에 저장하지 않습니다.
        README.md
    migrations/  # Alembic 실행 환경과 revision 템플릿. 배포 시작 시 upgrade head를 실행합니다.
      README.md
      versions/  # 순차 DB 스키마 이력. 기존 적용 revision 대신 새 revision으로 변경을 누적합니다.
        README.md
    tests/  # 임시 SQLite를 사용하는 서버 규칙·통신·입력 검증 테스트. 실제 MySQL 검증과는 구분합니다.
      README.md
  docs/  # 설계·통신 계약·단계별 결과·에셋 명세·측정 기록. 과거 측정은 새 실행 결과로 오해하지 않도록 유지합니다.
    README.md
  frontend/  # Vue 3·Phaser 3 클라이언트와 Vite·Nginx·브라우저 테스트. Docker는 여기서 dist를 만든 뒤 Nginx에 복사합니다.
    README.md
    Dockerfile
    vite.config.ts
    package.json
    nginx.conf
    public/  # Vite가 경로를 보존하여 dist로 복사하는 공개 정적 파일. /assets/... URL로 읽습니다.
      README.md
      assets/  # V1/V2/V3 PNG와 생성 명세. 원본 이미지와 게임 로딩용 출력 파일을 함께 보관합니다.
        README.md
        audio/  # V5 실제 OGG/MP3와 재생 제한·출처 명세.
          README.md
          manifest-v5.json
          bgm/  # 메뉴·월드 32초 순환 음악.
            README.md
          sfx/  # 전투·보상·UI 16종 효과음.
            README.md
        ambient/  # V1 환경용 작은 먼지/접지 그림자 PNG. 서버 물리와 무관합니다.
          README.md
        animations/  # V2 캐릭터 프레임·방향·포즈 범위·FPS 명세. entity-v2.json과 로더/등록 코드를 함께 점검합니다.
          README.md
        characters/  # V2 플레이어 원본 포즈와 512×512 게임 시트. 64×64 프레임으로 로딩합니다.
          README.md
        effects/  # V3 효과 원본과 256×256 시트 및 프레임 명세. hit/death/EXP/level_up에 연결됩니다.
          README.md
        environment/  # V1 환경 원본 아틀라스와 무충돌 나무 수관. 독립 수관은 장식이며 장애물 추가가 아닙니다.
          README.md
        monsters/  # 기존 일반 몬스터의 V2 원본/시트. 서버에 없는 빠른/강력 몬스터 종류는 구현하지 않았습니다.
          README.md
        particles/  # V3 파편/불티 PNG. 효과 풀의 상한 안에서 재사용합니다.
          README.md
        projectiles/  # V3 본인·타인·확산탄·회전 무기 PNG. 종류와 소유자는 서버 상태에서 읽습니다.
          README.md
        props/  # V1 나무·바위·기둥·벽·잔해 PNG. 충돌하는 본체는 서버 장애물 좌표에 맞춰 배치합니다.
          README.md
        tiles/  # V1 32px 지형 타일과 디테일 시트. 경계 mask와 index는 world/layout.ts에서 선택합니다.
          README.md
    scripts/  # Playwright 기반 성능/연속 전투 측정 도구. 결과 파일을 docs에 쓰므로 실행 대상을 먼저 확인합니다.
      README.md
    src/  # Vue UI·공유 스냅샷·네트워크·Phaser 렌더링의 소스 루트. main.ts에서 시작합니다.
      README.md
      main.ts
      App.vue
      style.css
      audio/  # V5 Phaser 단일 재생 서비스·프리로드·저장 설정.
        README.md
        manifest.ts
        service.ts
        settings.ts
      components/  # 화면 단위 Vue 컴포넌트. 메인 메뉴·HUD·강화·사망·설정과 Phaser 캔버스 수명을 관리합니다.
        README.md
        ui/  # HUD 내부의 공유 아이콘·HP/EXP·TOP5·무기 표시 컴포넌트. 서버 값을 표시하는 역할입니다.
          README.md
      game/  # Phaser 설정·Scene·키 입력·예측 보정과 V1/V2/V3 렌더링 모듈.
        README.md
        scene.ts
        combat/  # V3 확정 전투 이벤트와 투사체 렌더링. 풀·중복 제거·화면 밖 효과 생략·객체 정리를 관리합니다.
          README.md
        visuals/  # V2 플레이어/몬스터 PNG·애니메이션·시각 상태·렌더러. HP/충돌의 최종 권한은 서버입니다.
          README.md
        world/  # V1 타일/장식 생성·레이어/depth·장애물 외형·수관 가림·culling/먼지.
          README.md
      network/  # REST 게스트 발급과 WS 연결·재접속·입력 송신. 서버 패킷을 shared/bridge로 전달합니다.
        README.md
      shared/  # 서버 계약·스냅샷 전달·로컬 표시 설정·UI 문구. 서버 상태와 로컬 설정을 분리합니다.
        README.md
        bridge.ts
        protocol.ts
      ui/  # V4 디자인 토큰과 화면 배치 CSS. Vue의 화면 공간 UI를 꾸미며 Phaser 월드 depth와 별개입니다.
        README.md
    tests/  # Chromium 회귀 테스트. 실제 플레이와 표시 패킷 재생 테스트를 각각 명시합니다.
      README.md
      support/  # 성장/PvP 테스트용 실제 독립 FastAPI/Vite fixture. 고정 RNG로 재현성을 확보하고 자원을 정리합니다.
        README.md
  infra/  # 선택적 HTTPS용 Nginx 설정. 기본 HTTP 실행은 frontend/nginx.conf를 사용합니다.
    README.md
  scripts/  # 처음 .env 생성, 실제 REST/WS 부하, V1 환경 에셋 제작 도구.
    README.md
  tools/  # V2/V3 이미지·V5 음원 제작 및 V2 대비 서버 규칙 비교 도구. 일반 게임 실행에는 실행할 필요가 없습니다.
    README.md
```

## 오디오 사용

최초 사용자 입력 전에는 브라우저 정책에 따라 소리가 잠겨 있습니다. 화면 위의 사운드 활성화 버튼이나 월드 입장 버튼을 누르세요. 설정에서 전체80%·BGM40%·SFX70% 기본값과 음소거를 변경하면 즉시 적용하고 새로고침 후에도 유지합니다. 탭을 숨기면 음악을 일시정지하고 전투음은 버립니다. 복귀 시 누락된 효과음을 재생하지 않습니다.

[Phase V5 실행·검증·남은 한계](docs/phase-v5.md), [음원 출처·사용 범위](frontend/public/assets/audio/README.md)를 확인하세요. Intense Combat 음악은 아직 구현하지 않았습니다.

## 유지보수 시작 지점

| 바꾸려는 기능 | 먼저 볼 파일 | 함께 확인할 부분 |
|---|---|---|
| 앱/연결 | `backend/app/main.py`, `api/`, `frontend/src/network/client.ts` | 수명·인증·요청 제한·Nginx WS 프록시 |
| 이동/충돌 | `backend/app/game/movement.py`, `map.py` | `frontend/src/game/prediction.ts`, 서버 obstacles 좌표 |
| 공격/성장 | `backend/app/game/world.py`, `combat.py`, `progression.py` | `combat_events.py`, 프론트 protocol/카드 설명 |
| 음악/효과음 | `frontend/src/audio/`, `public/assets/audio/manifest-v5.json` | Scene 수명·V3 중복 제거·설정 저장·음원 디코딩 |
| 맵/캐릭터/효과 | `frontend/src/game/world/`, `visuals/`, `combat/` | 실제 PNG/manifest, 발 depth, culling, 풀/종료 정리 |
| HUD/메뉴 | `frontend/src/components/`, `src/ui/` | 스냅샷 단일 원본·설정 포커스·해상도 대응 |
| DB 스키마 | `backend/app/persistence/`, `migrations/versions/` | 새 revision·기존 기록·MySQL/SQLite 함수 차이 |

## 데이터 흐름과 주석 읽는 방법

REST `/api/guests`는 DB에 게스트와 토큰 해시를 생성합니다. 브라우저는 받은 토큰으로 `/ws`에 입장하고 50ms마다 방향/seq를 전송합니다. 서버 `World`는 20Hz로 게임 규칙을 처리하고 10Hz 스냅샷을 전달합니다. `client → bridge`에서 Vue HUD와 Phaser Scene이 같은 패킷을 읽습니다. 통계 저장은 별도 큐로 DB에 전달하며 매 tick 위치를 저장하지 않습니다.

각 소스의 **역할** 주석과 함수/메서드 위의 한글 주석은 책임·처리 순서·서버 권한·정리 방법을 설명합니다. 표현용 V3 이벤트와 실제 공격 판정을 구분하세요. PNG/JSON/lock 파일은 주석을 지원하지 않거나 코드가 아니므로 해당 폴더 README에서 설명합니다. 제3자 라이브러리와 자동 생성 빌드 파일은 편집하지 않습니다.

이번 변경의 검증 결과와 범위는 [주석·문서 변경 보고서](docs/documentation-update.md)를 확인하세요.
