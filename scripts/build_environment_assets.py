# 역할: V1 원본 PNG를 타일/장식/수관/그림자 파일로 정규화합니다. 실행하면 기존 출력 에셋을 덮어씁니다.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
from pathlib import Path
from PIL import Image
import json
from collections import deque

r = Path(__file__).resolve().parents[1] / "frontend/public/assets"
im = Image.open(r / "environment/source-atlas-v1.png").convert("RGBA")


# 생성 원본은1254px입니다. 실제 사분면 경계를 비율로 계산해 정확한 리소스로 정규화합니다.
# 연결된 알파 영역 크기로 이웃 셀의 미세 조각만 제거하고 주요 스프라이트는 보존합니다.
def clean_sprite(a):
    # 아틀라스 경계에 섞인 이웃 셀의 작은 조각만 제거합니다.
    alpha = a.getchannel("A")
    occupied = {
        (x, y)
        for y in range(a.height)
        for x in range(a.width)
        if alpha.getpixel((x, y)) > 24
    }
    components = []
    while occupied:
        start = occupied.pop()
        component = [start]
        queue = deque([start])
        while queue:
            x, y = queue.popleft()
            for nx, ny in (
                (x - 1, y),
                (x + 1, y),
                (x, y - 1),
                (x, y + 1),
                (x - 1, y - 1),
                (x + 1, y + 1),
            ):
                if (nx, ny) in occupied:
                    occupied.remove((nx, ny))
                    queue.append((nx, ny))
                    component.append((nx, ny))
        components.append(component)
    if not components:
        return a
    threshold = max(len(c) for c in components) * 0.012
    keep = {p for c in components if len(c) >= threshold for p in c}
    for y in range(a.height):
        for x in range(a.width):
            if (x, y) not in keep:
                a.putpixel((x, y), (0, 0, 0, 0))
    return a


# 생성 원본의 실제 크기에 비례하여 4×4 셀 경계를 계산합니다.
def cell(x, y):
    return im.crop(
        (
            round(x * im.width / 4),
            round(y * im.height / 4),
            round((x + 1) * im.width / 4),
            round((y + 1) * im.height / 4),
        )
    )


base = [
    cell(x, 0)
    .crop((3, 3, 310, 306))
    .resize((32, 32), Image.Resampling.NEAREST)
    .convert("RGB")
    .convert("RGBA")
    for x in range(4)
]
# 공통 어두운 팔레트: 조명 변화 없이 캐릭터/총알을 읽을 수 있도록 배경을 감쇄합니다.
for a in base:
    px = a.load()
    for y in range(32):
        for x in range(32):
            red, g, b, _ = px[x, y]
            px[x, y] = (int(red * 0.64), int(g * 0.66), int(b * 0.68), 255)
atlas = Image.new("RGBA", (13 * 32, 4 * 32))
for variant in range(4):
    a = base[0].transpose(
        [
            Image.Transpose.ROTATE_90,
            Image.Transpose.ROTATE_180,
            Image.Transpose.ROTATE_270,
            Image.Transpose.FLIP_LEFT_RIGHT,
        ][variant]
    )
    atlas.paste(a, ((variant % 13) * 32, (variant // 13) * 32))
for terrain in range(1, 4):
    for mask in range(16):
        a = base[terrain].copy()
        pix = a.load()
        grass = base[0].load()
        for y in range(32):
            for x in range(32):
                edge = min(
                    ([y] if mask & 1 else [])
                    + ([31 - x] if mask & 2 else [])
                    + ([31 - y] if mask & 4 else [])
                    + ([x] if mask & 8 else [])
                    + [32]
                )
                # 경계 지형 전이는 정수 픽셀 디더링으로 표현합니다.
                if edge < 5 and (edge < 2 or ((x * 13 + y * 7) % 5) > edge):
                    pix[x, y] = grass[x, y]
        i = 4 + (terrain - 1) * 16 + mask
        atlas.paste(a, ((i % 13) * 32, (i // 13) * 32))
atlas.save(r / "tiles/ground-v1.png")
details = Image.new("RGBA", (128, 32))
for x in range(4):
    a = cell(x, 1)
    alpha = a.getchannel("A")
    bbox = alpha.getbbox()
    if bbox:
        a = a.crop(bbox)
    a.thumbnail((30, 30), Image.Resampling.NEAREST)
    details.alpha_composite(a, (x * 32 + (32 - a.width) // 2, (32 - a.height) // 2))
details.save(r / "tiles/details-v1.png")
names = {
    (0, 2): "fir",
    (1, 2): "oak",
    (2, 2): "dead-tree",
    (3, 2): "boulder",
    (0, 3): "pillar",
    (1, 3): "wall",
    (2, 3): "rubble",
}
for (x, y), name in names.items():
    a = clean_sprite(cell(x, y))
    bbox = a.getchannel("A").getbbox()
    if bbox:
        a = a.crop(bbox)
    a.thumbnail((160, 160), Image.Resampling.NEAREST)
    a.save(r / f"props/{name}-v1.png")
    if name in ["fir", "oak"]:
        # 무충돌 수관에는 밑동/줄기를 포함하지 않습니다. 나무 본체는 기존 충돌체에만 사용합니다.
        canopy = a.crop((0, 0, a.width, round(a.height * 0.66)))
        canopy.save(r / f"environment/{name}-canopy-v1.png")
# 작은 먼지/그림자 마스크는 환경용 기능 텍스처이며 원본 그림을 대체하지 않습니다.
dust = Image.new("RGBA", (3, 3))
dust.putpixel((1, 1), (200, 219, 186, 190))
dust.save(r / "ambient/dust-v1.png")
shadow = Image.new("RGBA", (64, 32))
px = shadow.load()
for y in range(32):
    for x in range(64):
        d = ((x - 31.5) / 31.5) ** 2 + ((y - 15.5) / 15.5) ** 2
        if d < 1:
            px[x, y] = (5, 12, 15, round(90 * (1 - d)))
shadow.save(r / "ambient/shadow-v1.png")
manifest = {
    "version": 1,
    "source": "environment/source-atlas-v1.png",
    "source_size": [im.width, im.height],
    "ground": {
        "path": "tiles/ground-v1.png",
        "tile_size": 32,
        "columns": 13,
        "count": 52,
    },
    "details": {"path": "tiles/details-v1.png", "tile_size": 32, "count": 4},
    "props": {name: f"props/{name}-v1.png" for name in names.values()},
}
(r / "manifest-v1.json").write_text(json.dumps(manifest, indent=2))
print([(str(p.relative_to(r)), Image.open(p).size) for p in r.rglob("*.png")])
