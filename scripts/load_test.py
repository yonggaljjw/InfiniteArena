# 역할: 실제 REST/WS 게스트들의 이동·강화·리스폰과 서버 tick 지연을 측정하는 부하 도구.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
"""실제 REST/WS를 이용한 짧은 부하 측정. backend 의존성 설치 후 실행합니다."""

import argparse
import asyncio
import json
import math
import statistics
import time
import httpx
import websockets


# 여러 실제 게스트와 health 관측을 동시에 실행하고 처리 지연/수신량/오류를 출력합니다.
async def run(url, players, duration):
    origin = url.rstrip("/")
    ws_url = origin.replace("http://", "ws://").replace("https://", "wss://") + "/ws"
    samples = []
    byte_count = 0
    frames = 0
    errors = []
    online = 0
    async with httpx.AsyncClient(base_url=origin, trust_env=False) as http:
        # 실제 게스트 REST/WS 세션으로 이동·강화 선택·리스폰을 요청하고 수신량을 집계합니다.
        async def bot(index):
            nonlocal byte_count, frames, online
            try:
                r = await http.post("/api/guests", json={"nickname": f"부하{index}"})
                r.raise_for_status()
                guest = r.json()
                async with websockets.connect(
                    ws_url, origin=origin, max_size=1048576
                ) as ws:
                    await ws.send(
                        json.dumps({"v": 1, "type": "join", "token": guest["token"]})
                    )
                    welcome = json.loads(await ws.recv())
                    if welcome["type"] != "welcome":
                        raise ValueError("입장 실패")
                    seq = welcome["next_seq"]
                    deadline = time.monotonic() + duration

                    # 50ms마다 seq를 올려 정수 방향을 보냅니다. 서버 권위 상태를 직접 수정하지 않습니다.
                    async def send():
                        nonlocal seq
                        while time.monotonic() < deadline:
                            # 안전구역을 벗어난 뒤 일정 방향으로 움직이며 전투 부하를 만듭니다.
                            dx, dy = round(math.cos(index * math.tau / players)), round(
                                math.sin(index * math.tau / players)
                            )
                            await ws.send(
                                json.dumps(
                                    {
                                        "v": 1,
                                        "type": "input",
                                        "seq": seq,
                                        "dx": dx,
                                        "dy": dy,
                                    }
                                )
                            )
                            seq += 1
                            await asyncio.sleep(0.05)

                    task = asyncio.create_task(send())
                    try:
                        while time.monotonic() < deadline:
                            raw = await asyncio.wait_for(ws.recv(), 2)
                            byte_count += len(raw.encode())
                            frames += 1
                            snapshot = json.loads(raw)
                            if snapshot["type"] != "snapshot":
                                continue
                            online = max(online, snapshot["online"])
                            if snapshot["choices"]:
                                await ws.send(
                                    json.dumps(
                                        {
                                            "v": 1,
                                            "type": "upgrade_selected",
                                            "offer_id": snapshot["offer_id"],
                                            "choice": snapshot["choices"][0],
                                        }
                                    )
                                )
                            me = next(
                                p
                                for p in snapshot["players"]
                                if p["id"] == snapshot["you"]
                            )
                            if not me["alive"] and snapshot["respawn_in"] == 0:
                                await ws.send(json.dumps({"v": 1, "type": "respawn"}))
                    finally:
                        task.cancel()
                        await asyncio.gather(task, return_exceptions=True)
            except Exception as e:
                errors.append(f"{index}: {type(e).__name__}: {e}")

        # health의 tick 처리 시간을 0.2초 간격으로 관측합니다. FPS가 아닌 서버 처리 지연입니다.
        async def metrics():
            for _ in range(int(duration * 5)):
                try:
                    r = await http.get("/api/health")
                    samples.append(r.json()["tick_ms"])
                except Exception:
                    pass
                await asyncio.sleep(0.2)

        await asyncio.gather(*(bot(i) for i in range(players)), metrics())
        health = (await http.get("/api/health")).json()
    values = sorted(samples)
    result = {
        "players_requested": players,
        "peak_online": online,
        "duration_s": duration,
        "snapshot_frames": frames,
        "received_bytes": byte_count,
        "bytes_per_client_s": round(byte_count / max(1, players * duration)),
        "tick_ms_median_sampled": (
            round(statistics.median(values), 3) if values else None
        ),
        "tick_ms_p95_sampled": (
            round(values[min(len(values) - 1, int(len(values) * 0.95))], 3)
            if values
            else None
        ),
        "health": health,
        "errors": errors,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--url", default="http://localhost:8080")
    p.add_argument("--players", type=int, default=20)
    p.add_argument("--duration", type=int, default=15)
    args = p.parse_args()
    result = asyncio.run(run(args.url, args.players, args.duration))
    if result["errors"] or result["peak_online"] != args.players:
        raise SystemExit(1)
