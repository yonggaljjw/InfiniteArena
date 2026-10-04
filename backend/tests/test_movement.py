# 역할: 이동 정규화·맵 경계·오래된 입력·시퀀스·잘못된 입력과 중복 입장 검사.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
import math
import pytest
from pydantic import ValidationError
from app.game.entities import Player
from app.game.movement import move
from app.game.protocol import Input
from app.game.world import World


# 대각선/직선 이동 거리와 월드 경계 제한을 검사합니다.
def test_diagonal_and_boundary():
    p = Player("1", "테스트", x=100, y=100, dx=1, dy=1, input_at=1)
    move(p, 0.05, 4096, 1)
    assert math.hypot(p.x - 100, p.y - 100) == pytest.approx(11)
    p.x = p.y = 4090
    move(p, 0.05, 4096, 1)
    assert p.x == p.y == 4084


# 오래된 입력 정지와 중복 seq 무시를 검사합니다.
def test_stale_and_sequence():
    w = World()
    p, q = w.join("1", "테스트")
    w.input("1", Input(type="input", seq=2, dx=1, dy=0), 1)
    w.input("1", Input(type="input", seq=1, dx=-1, dy=0), 1)
    assert p.dx == 1
    x = p.x
    move(p, 0.05, 4096, 2)
    assert p.x == x


# 잘못된 정수 방향 검증과 동일 게스트의 중복 연결 거부를 검사합니다.
def test_invalid_and_duplicate():
    with pytest.raises(ValidationError):
        Input(type="input", seq=0, dx=5, dy=0)
    with pytest.raises(ValidationError):
        Input(type="input", seq=0, dx=1, dy=0, x=1000)
    w = World()
    w.join("1", "테스트")
    with pytest.raises(ValueError):
        w.join("1", "테스트")
    w.disconnect("1")
    p, q = w.join("1", "테스트")
    assert p.disconnected_at is None
