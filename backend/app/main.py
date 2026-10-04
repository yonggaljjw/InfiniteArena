# 역할: FastAPI 앱의 시작·종료와 REST/WS 라우터 등록. 월드와 통계 저장 작업의 수명은 여기서 관리합니다.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
import asyncio
import contextlib
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.api.rest import router as rest_router
from app.api.websocket import router as ws_router
from app.game.world import World
from app.persistence.database import engine


# 월드/통계 작업을 시작하고 종료 때 입력 루프를 멈춘 후 통계 큐를 최대 5초 비우고 DB를 해제합니다.
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.world = World()
    task = asyncio.create_task(app.state.world.run())
    app.state.simulation_task = task
    persistence = asyncio.create_task(app.state.world.persist())
    yield
    task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await task
    for p in app.state.world.players.values():
        app.state.world.record(p)
    with contextlib.suppress(asyncio.TimeoutError):
        await asyncio.wait_for(app.state.world.stats_queue.join(), timeout=5)
    persistence.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await persistence
    await engine.dispose()


app = FastAPI(title="Infinite Arena", version="0.1.0", lifespan=lifespan)
app.include_router(rest_router)
app.include_router(ws_router)
