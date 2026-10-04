# 역할: 공격 후보 검색용 공간 격자. 사각형 후보 검색 후 실제 거리/충돌은 월드에서 다시 판정합니다.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
from collections import defaultdict


# 고정 셀 단위로 엔티티를 묶어 공격 후보 순회를 줄입니다.
class SpatialGrid:
    # 이 인스턴스가 소유하는 상태와 큐를 초기화합니다. 다른 월드/테스트 인스턴스와 공유하지 않습니다.
    def __init__(self, cell_size=256):
        self.cell_size = cell_size
        self.cells = defaultdict(list)

    # 현재 tick의 살아 있는 후보로 격자를 새로 구성합니다. 이전 위치의 엔티티가 남지 않게 먼저 비웁니다.
    def rebuild(self, entities):
        self.cells.clear()
        for e in entities:
            self.cells[(int(e.x // self.cell_size), int(e.y // self.cell_size))].append(
                e
            )

    # 반경과 겹치는 셀의 후보를 순회합니다. 원형 거리 판정은 호출자에서 수행합니다.
    def nearby(self, x, y, radius):
        for cx in range(
            int((x - radius) // self.cell_size), int((x + radius) // self.cell_size) + 1
        ):
            for cy in range(
                int((y - radius) // self.cell_size),
                int((y + radius) // self.cell_size) + 1,
            ):
                yield from self.cells.get((cx, cy), ())
