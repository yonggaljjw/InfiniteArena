# 역할: 공통 월드의 장애물 사각형과 안전구역 정의. 스냅샷으로 클라이언트에도 동일 좌표를 전달합니다.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
import math

# 렌더링과 충돌에 동일한 데이터가 사용됩니다. 향후 타일맵 로더로 교체합니다.
OBSTACLES = [
    {"x": 1700, "y": 1800, "w": 180, "h": 64},
    {"x": 2300, "y": 2180, "w": 64, "h": 180},
    {"x": 1960, "y": 2500, "w": 240, "h": 64},
]
SAFE_ZONE = {"x": 2048, "y": 2048, "radius": 90}


# 장애물 사각형을 객체 반경만큼 확장해 검사합니다. 클라이언트 예측의 경계 조건도 맞춰야 합니다.
def blocked(x, y, radius=12):
    return any(
        o["x"] - radius < x < o["x"] + o["w"] + radius
        and o["y"] - radius < y < o["y"] + o["h"] + radius
        for o in OBSTACLES
    )


# 안전구역 중심부터의 실제 원형 반경을 검사합니다. 장식 링 크기로 판정을 바꾸지 않습니다.
def safe(x, y):
    return math.hypot(x - SAFE_ZONE["x"], y - SAFE_ZONE["y"]) <= SAFE_ZONE["radius"]
