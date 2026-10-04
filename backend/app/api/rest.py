# 역할: 게스트 생성, 서버 상태 확인, DB 누적 랭킹 REST API. 실시간 월드 랭킹은 WS 스냅샷과 별개입니다.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
import time
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import text, select
from app.persistence.models import Guest
from app.persistence.database import Session
from app.persistence.repository import create_guest

router = APIRouter(prefix="/api")
creation_limits = {}


# 닉네임의 길이와 허용 문자를 요청 검증 단계에서 제한합니다.
class GuestRequest(BaseModel):
    nickname: str = Field(min_length=2, max_length=16, pattern=r"^[가-힣A-Za-z0-9_]+$")


# 게임 루프의 생존 여부와 tick/통계 실패 관측값을 반환합니다. DB 준비 상태는 ready에서 확인합니다.
@router.get("/health")
async def health(request: Request):
    if request.app.state.simulation_task.done():
        raise HTTPException(503, "게임 루프 중단")
    return {
        "status": "ok",
        "players": len(request.app.state.world.players),
        "protocol": 1,
        "tick_ms": request.app.state.world.last_tick_ms,
        "overruns": request.app.state.world.overruns,
        "stats_failed": request.app.state.world.stats_failed,
        "stats_rejected": request.app.state.world.stats_rejected,
    }


# 게임 루프와 DB SELECT 1을 확인합니다. Compose는 이 결과로 서버 준비를 기다립니다.
@router.get("/ready")
async def ready(request: Request):
    if request.app.state.simulation_task.done():
        raise HTTPException(503, "게임 루프 중단")
    try:
        async with Session() as db:
            await db.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(503, "DB 연결 실패")
    return {"status": "ready"}


# IP별 분당 요청 수를 제한한 뒤 게스트 ID와 최초 평문 토큰을 발급합니다.
@router.post("/guests", status_code=201)
async def guest(body: GuestRequest, request: Request):
    now = time.monotonic()
    # 단일 프로세스 MVP용 제한입니다. Nginx 프록시에서는 공유 IP로 계산됩니다.
    key = request.client.host if request.client else "unknown"
    window, count = creation_limits.get(key, (now, 0))
    if now - window >= 60:
        window, count = now, 0
    if count >= 40:
        raise HTTPException(
            429, "게스트 생성 요청이 너무 많습니다. 1분 뒤 재시도하세요."
        )
    creation_limits[key] = (window, count + 1)
    for old in list(creation_limits):
        if now - creation_limits[old][0] >= 60:
            creation_limits.pop(old, None)
    player_id, token = await create_guest(body.nickname)
    return {"player_id": player_id, "token": token, "nickname": body.nickname}


# DB 누적 킬·최고 레벨 순 상위 10명을 조회합니다. WS의 현재 월드 TOP5와 범위가 다릅니다.
@router.get("/leaderboard")
async def leaderboard():
    async with Session() as db:
        rows = (
            await db.scalars(
                select(Guest)
                .order_by(Guest.kills.desc(), Guest.best_level.desc())
                .limit(10)
            )
        ).all()
    return [
        {
            "nickname": p.nickname,
            "kills": p.kills,
            "deaths": p.deaths,
            "best_level": p.best_level,
        }
        for p in rows
    ]
