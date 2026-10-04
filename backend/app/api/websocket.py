# 역할: 게스트 인증 후 이동·강화·리스폰 요청을 월드에 전달하고 개인별 스냅샷을 송신합니다.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
import asyncio
import contextlib
import json
import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError
from app.core.config import settings
from app.game.protocol import Input, Join, Upgrade, Respawn
from app.persistence.repository import authenticate

router = APIRouter()


# 단일 송신 작업이 큐를 읽습니다. 느린 클라이언트 송신은 2초 제한으로 중단됩니다.
async def sender(ws, queue):
    while True:
        await asyncio.wait_for(ws.send_json(await queue.get()), timeout=2)


# Origin→첫 join→토큰 인증→welcome→요청 처리 순서를 지킵니다. 모든 종료 경로에서 송신 작업을 회수합니다.
@router.websocket("/ws")
async def websocket(ws: WebSocket):
    if ws.headers.get("origin") not in settings.allowed_origins.split(","):
        await ws.close(code=1008)
        return
    await ws.accept()
    world = ws.app.state.world
    player_id = None
    task = None
    try:
        raw = await asyncio.wait_for(ws.receive_text(), timeout=5)
        if len(raw.encode()) > 2048:
            raise ValueError("패킷 크기 초과")
        join = Join.model_validate_json(raw)
        guest = await authenticate(join.token)
        if guest is None:
            raise ValueError("유효하지 않은 게스트 토큰")
        player, queue = world.join(guest.id, guest.nickname)
        player_id = player.id
        await ws.send_json(
            {
                "v": 1,
                "type": "welcome",
                "player_id": player.id,
                "next_seq": player.seq + 1,
                "tick_rate": settings.tick_rate,
            }
        )
        task = asyncio.create_task(sender(ws, queue))
        window, count = time.monotonic(), 0
        while True:
            # 입력/핑이 15초 동안 없으면 연결을 정리합니다.
            raw = await asyncio.wait_for(ws.receive_text(), timeout=15)
            now = time.monotonic()
            if task.done():
                task.result()
            if len(raw.encode()) > 2048:
                raise ValueError("패킷 크기 초과")
            if now - window >= 1:
                window, count = now, 0
            count += 1
            if count > 60:
                raise ValueError("메시지 전송 빈도 초과")
            data = json.loads(raw)
            if not isinstance(data, dict):
                raise ValueError("메시지는 객체여야 합니다")
            if data.get("type") == "input":
                world.input(player_id, Input.model_validate(data), now)
            elif data.get("type") == "upgrade_selected":
                message = Upgrade.model_validate(data)
                world.upgrade(player_id, message.choice, message.offer_id)
            elif data.get("type") == "respawn":
                Respawn.model_validate(data)
                world.respawn(player_id, now)
            elif data == {"v": 1, "type": "ping"}:
                # 송신은 한 태스크가 담당합니다.
                if not queue.full():
                    queue.put_nowait({"v": 1, "type": "pong"})
            else:
                raise ValueError("지원하지 않는 메시지")
    except WebSocketDisconnect:
        pass
    except (ValueError, ValidationError, asyncio.TimeoutError) as error:
        import logging

        logging.getLogger(__name__).warning("연결 입력 거부: %s", type(error).__name__)
        with contextlib.suppress(Exception):
            await ws.close(code=1008, reason="잘못된 입력 또는 연결 시간 초과")
    except Exception:
        import logging

        logging.getLogger(__name__).exception("WebSocket 연결 오류")
        with contextlib.suppress(Exception):
            await ws.close(code=1011)
    finally:
        if task:
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError, Exception):
                await task
        if player_id:
            world.disconnect(player_id)
