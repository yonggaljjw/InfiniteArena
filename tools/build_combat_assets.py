# 역할: V3 원본 PNG를 64px 효과 시트와 별도 투사체/입자 이미지로 변환합니다. 실행 시 출력 에셋을 덮어씁니다.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
"""Extract generated PNG cells into game textures. Requires tools/requirements.txt."""

from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parents[1] / "frontend/public/assets"
im = Image.open(ROOT / "effects/source-v3.png").convert("RGBA")
poses = []
atlas = Image.new("RGBA", (256, 256))
for i in range(16):
    x, y = i % 4, i // 4
    p = im.crop(
        (
            round(x * im.width / 4) + 3,
            round(y * im.height / 4) + 3,
            round((x + 1) * im.width / 4) - 3,
            round((y + 1) * im.height / 4) - 3,
        )
    )
    p.putalpha(p.getchannel("A").point(lambda a: 255 if a >= 110 else 0))
    b = p.getbbox()
    if not b:
        raise ValueError(i)
    p = p.crop(b)
    poses.append(p)
    factor = min(56 / p.width, 56 / p.height)
    p = p.resize(
        (round(p.width * factor), round(p.height * factor)), Image.Resampling.NEAREST
    )
    atlas.alpha_composite(
        p, (x * 64 + (64 - p.width) // 2, y * 64 + (64 - p.height) // 2)
    )
atlas.save(ROOT / "effects/combat-v3.png")
for name, index, size in [
    ("own-bolt", 0, (32, 16)),
    ("hostile-bolt", 1, (32, 16)),
    ("spread-bolt", 2, (32, 16)),
    ("orbit-blade", 3, (32, 32)),
    ("shard", 6, (12, 12)),
    ("ember", 7, (8, 8)),
]:
    p = poses[index]
    factor = min((size[0] - 2) / p.width, (size[1] - 2) / p.height)
    p = p.resize(
        (max(1, round(p.width * factor)), max(1, round(p.height * factor))),
        Image.Resampling.NEAREST,
    )
    out = Image.new("RGBA", size)
    out.alpha_composite(p, ((size[0] - p.width) // 2, (size[1] - p.height) // 2))
    folder = "particles" if name in ("shard", "ember") else "projectiles"
    out.save(ROOT / folder / (name + "-v3.png"))
(ROOT / "effects/manifest-v3.json").write_text(
    json.dumps(
        {
            "frameSize": 64,
            "columns": 4,
            "rows": 4,
            "frames": {
                "muzzle": [4, 12],
                "hit": [5, 13],
                "monsterDeath": [8, 14],
                "playerDeath": [9],
                "experience": [10],
                "levelUp": [11, 15],
            },
            "sourceSize": list(im.size),
        },
        indent=2,
    )
    + "\n"
)
print("Built V3 effects atlas and 6 projectile/particle PNGs")
