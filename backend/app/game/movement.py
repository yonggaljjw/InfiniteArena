# 역할: 서버 권위 이동. 대각선 속도 정규화, 맵 경계, 반경 12의 장애물 충돌을 적용합니다.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
import math
from app.game.entities import Player
from app.game.map import blocked


# 살아 있고 입력이 0.3초 이내인 플레이어만 이동합니다. 축별 충돌로 벽을 따라 이동할 수 있습니다.
def move(player: Player, dt: float, size: int, now: float):
    # 입력이 끊기면 이동을 멈추고, 대각선 이동 속도를 정규화합니다.
    if not player.alive or now - player.input_at > 0.3:
        return
    length = math.hypot(player.dx, player.dy)
    if length:
        nx = min(size - 12, max(12, player.x + player.dx / length * player.speed * dt))
        ny = min(size - 12, max(12, player.y + player.dy / length * player.speed * dt))
        if not blocked(nx, player.y):
            player.x = nx
        if not blocked(player.x, ny):
            player.y = ny
