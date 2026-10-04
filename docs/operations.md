# 실행·개발·배포

## Docker 기본 실행

Windows PowerShell:

```powershell
Copy-Item .env.example .env
docker compose up --build -d
docker compose ps
```

접속은 http://localhost:8080 입니다. 처음에는 MySQL 초기화·의존성 다운로드·빌드가 필요합니다. frontend healthy까지 기다리세요. 컨테이너 시작 순서는 MySQL healthy → Alembic migration → FastAPI ready → Nginx입니다. 외부로 노출되는 포트는8080 하나이며 MySQL/백엔드는 컨테이너 네트워크로만 연결됩니다.

`.env.example`은 개발 전용 예시입니다. 외부 공개 전 비밀번호를 바꾸거나 `python scripts/init_env.py`로 최초 .env를 생성하세요. DB 비밀번호를 바꿀 때 이미 만들어진 MySQL 볼륨의 실제 계정 비밀번호는 자동 변경되지 않습니다. 기존 DB를 유지하면서 SQL로 변경하거나, 데이터가 불필요할 때만 볼륨을 초기화하세요.

DATABASE_URL은 Compose가 MYSQL_* 변수로 만듭니다. 샘플/생성 스크립트는 URL에 안전한 비밀번호를 사용합니다. 특수문자 @/: 등을 직접 넣으면 URI 인코딩이 필요합니다. 포트 변경 시 HTTP_PORT뿐 아니라 ALLOWED_ORIGINS도 같은 주소로 바꾸세요.

## 개발 Compose

```bash
docker compose -f compose.yaml -f compose.dev.yaml up --build
```

backend 소스는 `/app`에, frontend 소스도 `/app`에 마운트합니다. node_modules는 별도 볼륨입니다. Vite가80번 포트에서 실행되고 API_PROXY_TARGET으로 backend를 프록시합니다. 의존성 변경 후에는 frontend_modules 볼륨 내부 의존성도 `docker compose -f compose.yaml -f compose.dev.yaml run --rm frontend npm ci`로 갱신하세요.

## Docker 없이 검증할 때

아래 SQLite 방식은 개발 테스트용입니다. 기본 배포 DB는 MySQL이며 SQLite로 MySQL 호환성을 검증했다고 주장하지 않습니다.

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\Activate.ps1
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1 --ws-max-size 2048
```

다른 터미널:

```bash
cd frontend
npm ci
npm run dev -- --host 127.0.0.1 --port 8080
```

기본 DATABASE_URL은 로컬 SQLite arena.db입니다. MySQL을 직접 연결하려면 DATABASE_URL을 mysql+asyncmy URI로 지정하세요. backend CORS를 켤 필요 없이 Vite/Nginx의 같은 출처 프록시를 사용합니다.

## 검사 명령

```bash
docker compose exec backend python -m pytest -q
```

pytest는 별도의 임시 SQLite에 테스트 테이블을 만들며 실제 MySQL 통계를 변경하지 않습니다.

```bash
cd frontend
npm ci
npm run build
npx playwright install chromium
npm run test:e2e
```

E2E는 localhost:8080에 서버가 먼저 떠 있어야 합니다. 다른 주소라면 ARENA_URL을 지정합니다. Linux에서 브라우저 OS 라이브러리가 부족하면 `npx playwright install --with-deps chromium`을 사용하세요.

부하 테스트는 실제 게스트20명을 생성하므로 테스트 환경에서 실행합니다. 게스트 생성 제한 때문에 반복 수행 시1분 간격을 두세요.

```bash
pip install -r backend/requirements.txt
python scripts/load_test.py --url http://localhost:8080 --players 20 --duration 30
```

`.github/workflows/check.yml`은 GitHub에 업로드한 뒤 pytest/빌드/Docker 기동/브라우저 검증을 수행하도록 작성했습니다. 이 작업 안에서는 GitHub Actions를 실제 실행하지 않았습니다.

## HTTPS/WSS 운영 설정

일반 Compose는 HTTP 로컬 개발용입니다. 직접 TLS를 종료하려면 소유한 도메인용 `certs/fullchain.pem`, `certs/privkey.pem`을 준비하고 `.env`의 ALLOWED_ORIGINS를 `https://소유도메인`으로 변경합니다.443번 포트가 도달 가능해야 합니다.

```bash
docker compose -f compose.yaml -f compose.tls.yaml up --build -d
```

인증서 발급·갱신은 별도 작업입니다. 이번 실행 환경에서는 인증서 발급/외부 배포를 하지 않았습니다. 프론트 URL이 HTTPS이면 코드가 WSS를 선택합니다. Nginx 설정은 TLS1.2/1.3과 WebSocket Upgrade를 처리합니다.

Cloudflare Tunnel을 사용할 경우 공개 호스트의 upstream을 `http://frontend:80`으로 연결하는 동일 네트워크의 터널 서비스를 따로 구성할 수 있습니다. 공개 HTTPS Origin을 허용 목록에 넣어야 합니다. 기존 아발론 프로젝트와 서버/도메인/포트를 공유한다는 가정은 하지 않았습니다.

## 재시작·저장·관측

```bash
docker compose logs -f backend
docker compose logs -f db
docker compose exec backend alembic current
docker compose stop
docker compose start
```

backend 재시작은 현재 월드를 초기화합니다. 정상 종료는 통계 큐를 최대5초 기다려 저장하지만, 강제 종료는 통계 유실 가능성이 있습니다. health의 stats_failed/stats_rejected/overruns를 확인하세요. durable outbox, 장애 복구, DB 백업·복구 자동화는 추가 운영 작업입니다.

## 오류 확인

| 증상 | 확인할 것 |
|---|---|
| Compose 환경변수 오류 | 프로젝트 루트의 .env 존재 |
| DB access denied | 실제 볼륨 내 비밀번호와 .env 일치 |
| 포트8080 사용 중 | HTTP_PORT와 ALLOWED_ORIGINS 함께 수정 |
| 닉네임422 | 허용 문자·길이 확인 |
| 게스트429 | 생성 제한,1분 뒤 재시도 |
| WS1008 | Origin, 토큰, 중복 접속, 입력 형식·크기·빈도 |
| WS1011/502 | backend 로그와 DB·migration 상태 |
| 몬스터를 못 공격함 | 안전구역과 리스폰 보호 종료 확인 |
| 강화 후 연결이 끊김 | 서버/클라이언트 코드 버전과 offer_id 일치 |
| 개발 수정 후 캐릭터 초기화 | 단일 월드 프로세스가 reload된 정상 동작 |
