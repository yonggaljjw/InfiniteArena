# 역할: 실제 FastAPI REST/WS 두 세션으로 게스트 입장과 상대 위치 전달을 검사합니다.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
from fastapi.testclient import TestClient
from app.main import app

ORIGIN = {"origin": "http://127.0.0.1:8080"}


# 두 WS 세션에서 상대 이동 수신과 잘못된 닉네임 거부를 검사합니다.
def test_two_clients_move_and_reject_fake_identity():
    with TestClient(app) as c:
        a = c.post("/api/guests", json={"nickname": "테스트A"}).json()
        b = c.post("/api/guests", json={"nickname": "테스트B"}).json()
        with c.websocket_connect("/ws", headers=ORIGIN) as wa:
            wa.send_json({"v": 1, "type": "join", "token": a["token"]})
            assert wa.receive_json()["type"] == "welcome"
            with c.websocket_connect("/ws", headers=ORIGIN) as wb:
                wb.send_json({"v": 1, "type": "join", "token": b["token"]})
                assert wb.receive_json()["type"] == "welcome"
                first = wb.receive_json()
                assert len(first["players"]) == 2
                start = next(
                    p["x"] for p in first["players"] if p["id"] == a["player_id"]
                )
                wa.send_json({"v": 1, "type": "input", "seq": 0, "dx": 1, "dy": 0})
                for _ in range(4):
                    snapshot = wb.receive_json()
                    if (
                        next(
                            p["x"]
                            for p in snapshot["players"]
                            if p["id"] == a["player_id"]
                        )
                        > start
                    ):
                        break
                else:
                    raise AssertionError("상대 브라우저에 이동이 전달되지 않았습니다")
        assert c.get("/api/ready").status_code == 200
        assert c.post("/api/guests", json={"nickname": "<script>"}).status_code == 422
