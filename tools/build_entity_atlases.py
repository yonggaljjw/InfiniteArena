# 역할: V2 원본 포즈를 발 기준 64px 프레임과 방향별 애니메이션 manifest로 변환합니다. 게임 규칙은 변경하지 않습니다.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
"""Generated PNG key poses -> deterministic 64px atlases; no game rules here.
Requires Pillow 12.3.0: python -m pip install -r tools/requirements.txt
"""

from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parents[1] / "frontend/public/assets"
DIRECTIONS = ["down", "left", "right", "up"]
PLAYER_X = [
    [0, 110, 215, 313, 403, 479, 553, 630, 710, 786, 875, 978, 1094, 1254],
    [0, 113, 214, 312, 407, 496, 556, 651, 724, 800, 884, 985, 1104, 1254],
    [0, 113, 215, 315, 405, 483, 556, 640, 719, 800, 886, 987, 1095, 1254],
    [0, 120, 219, 315, 403, 479, 555, 631, 710, 797, 895, 988, 1094, 1254],
]
PLAYER_Y = [(40, 182), (370, 516), (690, 836), (1000, 1124)]
MAPPING = {
    "player": [0, 1, 2, 3, 4, 5, 6, 7, 8, 5, 8, 9, 9, 10, 11, 12],
    "ghoul": [0, 1, 2, 1, 3, 4, 5, 6, 7, 3, 8, 9, 9, 10, 11, 11],
}
manifest = {
    "frameSize": 64,
    "columns": 8,
    "rows": 8,
    "directions": DIRECTIONS,
    "framesPerDirection": 16,
    "feet": [32, 48],
    "states": {
        "idle": {"start": 0, "count": 4, "fps": 4},
        "walk": {"start": 4, "count": 6, "fps": 9},
        "hit": {"start": 10, "count": 2, "fps": 10},
        "death": {"start": 12, "count": 4, "fps": 8},
    },
    "atlases": {},
}
for kind, folder, source in [
    ("player", "characters", "player-source-v2.png"),
    ("ghoul", "monsters", "ghoul-source-v2.png"),
]:
    im = Image.open(ROOT / folder / source).convert("RGBA")
    sheet = Image.new("RGBA", (512, 512))
    bounds = []
    for row in range(4):
        xs = PLAYER_X[row] if kind == "player" else [i * 181 for i in range(13)]
        y0, y1 = (
            PLAYER_Y[row]
            if kind == "player"
            else ([0, 2, 1, 3][row] * 181, ([0, 2, 1, 3][row] + 1) * 181)
        )
        poses = []
        for col in range(len(xs) - 1):
            pose = im.crop((xs[col], y0, xs[col + 1], y1))
            # 도트 보존 축소 전에 원본의 아주 옅은 알파 테두리만 제거합니다.
            alpha = pose.getchannel("A").point(lambda a: 255 if a >= 110 else 0)
            pose.putalpha(alpha)
            bbox = pose.getbbox()
            if not bbox:
                raise ValueError((kind, row, col))
            poses.append(pose.crop(bbox))
        scale = 44 / poses[0].height
        for offset, index in enumerate(MAPPING[kind]):
            pose = poses[index]
            w, h = round(pose.width * scale), round(pose.height * scale)
            if w > 62 or h > 48:
                factor = min(62 / w, 48 / h)
                w, h = round(w * factor), round(h * factor)
            pose = pose.resize((w, h), Image.Resampling.NEAREST)
            frame = Image.new("RGBA", (64, 64))
            frame.alpha_composite(pose, ((64 - w) // 2, 48 - h))
            n = row * 16 + offset
            sheet.alpha_composite(frame, ((n % 8) * 64, (n // 8) * 64))
            bounds.append([n, list(frame.getbbox())])
    output = f"{kind}-v2.png"
    sheet.save(ROOT / folder / output)
    manifest["atlases"][kind] = {
        "url": f"/assets/{folder}/{output}",
        "source": f"/assets/{folder}/{source}",
        "sourcePoseIndices": MAPPING[kind],
        "frameBounds": bounds,
    }
(ROOT / "animations/entity-v2.json").write_text(json.dumps(manifest, indent=2) + "\n")
print("Built two 512x512 RGBA atlases with 64 populated frames each.")
