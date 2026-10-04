# 역할: WS Origin·토큰·패킷 크기·필드 타입·메시지 빈도 및 중복 연결 제한 검사.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect
from app.main import app
from app.game.protocol import Input
from pydantic import ValidationError

ORIGIN = {"origin": "http://127.0.0.1:8080"}


# 잘못된 Origin·토큰·2048바이트 초과 메시지의 연결 거부를 검사합니다.
def test_origin_invalid_token_and_packet():
    with TestClient(app) as c:
        with pytest.raises(WebSocketDisconnect):
            with c.websocket_connect("/ws", headers={"origin": "https://evil.example"}):
                pass
        with c.websocket_connect("/ws", headers=ORIGIN) as ws:
            ws.send_json({"v": 1, "type": "join", "token": "a" * 43})
            with pytest.raises(WebSocketDisconnect):
                ws.receive_json()
        guest = c.post("/api/guests", json={"nickname": "보안검증"}).json()
        with c.websocket_connect("/ws", headers=ORIGIN) as ws:
            ws.send_json({"v": 1, "type": "join", "token": guest["token"]})
            ws.receive_json()
            ws.send_text("x" * 2049)
            with pytest.raises(WebSocketDisconnect):
                ws.receive_json()


# bool seq 및 임의 피해/좌표 필드 입력을 스키마가 거부하는지 검사합니다.
def test_no_boolean_or_client_coordinates():
    with pytest.raises(ValidationError):
        Input(type="input", seq=True, dx=1, dy=0)
    with pytest.raises(ValidationError):
        Input(type="input", seq=1, dx=1, dy=0, damage=999)


# 같은 게스트 중복 WS와 초당 60개를 넘는 메시지 연결 거부를 검사합니다.
def test_duplicate_connection_and_message_rate_limit():
    with TestClient(app) as c:
        guest = c.post("/api/guests", json={"nickname": "중복검증"}).json()
        with c.websocket_connect("/ws", headers=ORIGIN) as a:
            a.send_json({"v": 1, "type": "join", "token": guest["token"]})
            a.receive_json()
            with c.websocket_connect("/ws", headers=ORIGIN) as b:
                b.send_json({"v": 1, "type": "join", "token": guest["token"]})
                with pytest.raises(WebSocketDisconnect):
                    b.receive_json()
            for seq in range(61):
                a.send_json({"v": 1, "type": "input", "seq": seq, "dx": 0, "dy": 0})
            with pytest.raises(WebSocketDisconnect):
                while True:
                    a.receive_json()
