# 역할: 한 생존 세션의 플레이어 상태. 이동 입력, 전투 능력치, 강화 대기, 연결 유예 정보를 함께 보관합니다.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
from dataclasses import dataclass, field


# 실시간 상태의 서버 원본입니다. public의 seq는 수신 최댓값이 아니라 처리 완료한 ack_seq입니다.
@dataclass
class Player:
    id: str
    nickname: str
    x: float = 2048
    y: float = 2048
    dx: int = 0
    dy: int = 0
    # seq는 수신 최댓값, ack_seq는 시뮬레이션에서 처리 완료한 번호입니다. 예측 보정은 ack_seq를 사용합니다.
    seq: int = -1
    ack_seq: int = -1
    commands: list = field(default_factory=list)
    input_at: float = 0
    speed: float = 220
    hp: float = 100
    max_hp: float = 100
    level: int = 1
    exp: int = 0
    damage: float = 16
    defense: float = 0
    direction: float = 0
    cooldown: float = 0.7
    spread: bool = False
    orbit: bool = False
    orbit_at: float = 0
    orbit_angle: float = 0
    attack_at: float = 0
    alive: bool = True
    respawn_at: float = 0
    protected_until: float = 0
    kills: int = 0
    deaths: int = 0
    streak: int = 0
    best_level: int = 1
    # 여러 레벨이 한 번에 오르면 대기 강화 횟수를 누적하고 현재 제안 번호로 중복 선택을 방지합니다.
    choices: list[str] = field(default_factory=list)
    pending_upgrades: int = 0
    offer_id: int = 0
    disconnected_at: float | None = None

    # 네트워크에 필요한 공개 상태만 직렬화합니다. 입력 큐·토큰·서버 내부 타이머는 포함하지 않습니다.
    def public(self):
        return {
            "id": self.id,
            "nickname": self.nickname,
            "x": round(self.x, 2),
            "y": round(self.y, 2),
            "seq": self.ack_seq,
            "speed": self.speed,
            "hp": round(self.hp, 1),
            "max_hp": self.max_hp,
            "level": self.level,
            "exp": self.exp,
            "exp_next": self.level * 30,
            "alive": self.alive,
            "kills": self.kills,
            "deaths": self.deaths,
            "streak": self.streak,
            "orbit_angle": round(self.orbit_angle, 3),
            "weapons": ["bullet"]
            + (["spread"] if self.spread else [])
            + (["orbit"] if self.orbit else []),
            "defense": self.defense,
            "direction": self.direction,
            "damage": round(self.damage, 1),
            "cooldown": round(self.cooldown, 2),
        }
