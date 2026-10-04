# 역할: 서버가 확정한 전투 결과를 V3 화면 효과용으로 기록합니다. 이 기록이 데미지나 보상을 결정하지 않습니다.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
"""Bounded presentation telemetry. Never used to decide combat or rewards."""

from collections import deque
from uuid import uuid4


# 월드별 epoch와 증가 seq로 고유 이벤트 ID를 만들고 최근 8tick/2048건으로 기록량을 제한합니다.
class CombatEventJournal:
    WINDOW_TICKS = 8  # 0.4 seconds at the existing 20Hz world clock
    LIMIT = 2048

    # 이 인스턴스가 소유하는 상태와 큐를 초기화합니다. 다른 월드/테스트 인스턴스와 공유하지 않습니다.
    def __init__(self):
        self.epoch = uuid4().hex
        self.sequence = 0
        self.events = deque(maxlen=self.LIMIT)

    # 확정 결과의 좌표/추가 데이터를 기록합니다. 같은 ID가 재전송되어도 클라이언트는 한 번만 연출합니다.
    def emit(self, tick, kind, x, y, **data):
        self.sequence += 1
        event = {
            "id": f"{self.epoch}:{self.sequence}",
            "tick": tick,
            "kind": kind,
            "x": round(x, 2),
            "y": round(y, 2),
            **data,
        }
        self.events.append(event)
        return event

    # 최근 기록만 남기고 AOI 이벤트와 본인 EXP/레벨업을 반환합니다.
    def nearby(self, tick, player):
        while self.events and self.events[0]["tick"] < tick - self.WINDOW_TICKS:
            self.events.popleft()
        return [
            e
            for e in self.events
            if (e.get("owner") == player.id and e["kind"] in ("experience", "level_up"))
            or (abs(e["x"] - player.x) <= 950 and abs(e["y"] - player.y) <= 650)
        ]
