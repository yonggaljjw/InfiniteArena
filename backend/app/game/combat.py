# 역할: 몬스터·투사체 상태와 방어력/선분 명중 계산. 화면 효과가 아닌 서버 판정에 쓰입니다.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
import math
from dataclasses import dataclass


# 현재 구현된 일반 몬스터의 서버 위치·체력·다음 근접 공격 시각입니다.
@dataclass
class Monster:
    id: str
    x: float
    y: float
    hp: float = 45
    max_hp: float = 45
    attack_at: float = 0

    # 네트워크에 필요한 공개 상태만 직렬화합니다. 입력 큐·토큰·서버 내부 타이머는 포함하지 않습니다.
    def public(self):
        return {
            "id": self.id,
            "x": round(self.x, 2),
            "y": round(self.y, 2),
            "hp": self.hp,
            "max_hp": self.max_hp,
        }


# 서버 투사체 속도/피해/수명과 표시용 무기 종류입니다. 클라이언트가 수명을 결정하지 않습니다.
@dataclass
class Projectile:
    id: str
    owner: str
    x: float
    y: float
    vx: float
    vy: float
    damage: float
    ttl: float = 1.1
    kind: str = "bullet"

    # 네트워크에 필요한 공개 상태만 직렬화합니다. 입력 큐·토큰·서버 내부 타이머는 포함하지 않습니다.
    def public(self):
        return {
            "id": self.id,
            "x": round(self.x, 2),
            "y": round(self.y, 2),
            "owner": self.owner,
            "vx": round(self.vx, 3),
            "vy": round(self.vy, 3),
            "kind": self.kind,
        }


# 음수 방어력은 0으로 취급하고 방어 반영 후 최소 피해량 1을 유지합니다.
def damage_after_defense(attack: float, defense: float = 0):
    return max(1, attack * 100 / (100 + max(0, defense)))


# 이전/현재 총알 위치의 선분과 대상 반경을 검사하여 고속 통과 누락을 방지합니다.
def segment_hits(ax, ay, bx, by, x, y, radius):
    # 빠른 총알이 한 틱 사이에 대상을 통과하는 문제를 선분 충돌로 막습니다.
    dx, dy = bx - ax, by - ay
    t = (
        max(0, min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
        if dx or dy
        else 0
    )
    return math.hypot(ax + t * dx - x, ay + t * dy - y) <= radius
