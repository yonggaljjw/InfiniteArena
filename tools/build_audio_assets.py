"""V5 원본 합성 음원을 생성합니다. 외부 녹음/샘플/곡을 사용하지 않습니다.
실행: pip install -r tools/requirements-audio.txt && python tools/build_audio_assets.py
FFmpeg가 PATH에 필요합니다. 출력 OGG/MP3를 덮어쓰므로 변경 전 비교하세요.
"""

from pathlib import Path
import json, subprocess, tempfile, wave, hashlib
import numpy as np

ROOT = Path(__file__).resolve().parents[1] / "frontend/public/assets/audio"
RATE = 22050
rng = np.random.default_rng(503)


def note(midi):
    # MIDI 번호는 높이 표기일 뿐이며 외부 MIDI 곡을 사용하지 않습니다.
    return 440 * 2 ** ((midi - 69) / 12)


def music(world=False):
    # 32초 순환 화성. 모든 패드 위상과 이벤트 잔향을 원형 버퍼에 맞춥니다.
    duration = 32
    t = np.arange(RATE * duration) / RATE
    out = np.zeros((len(t), 2))
    chords = [[38, 50, 53, 57], [34, 46, 50, 53], [43, 50, 55, 58], [45, 49, 52, 55]]
    for i, chord in enumerate(chords):
        distance = (t - i * 8) % duration
        # 각 화성의 1초 겹침/페이드가 루프 경계에서도 동일하게 이어집니다.
        weight = np.where(
            distance < 8, np.minimum(1, distance), np.maximum(0, 9 - distance)
        )
        for j, midi in enumerate(chord):
            freq = round(note(midi) * duration) / duration
            pad = sum(
                np.sin(2 * np.pi * round(freq * k * duration) / duration * t + j * 0.6)
                / k**2
                for k in [1, 2, 3, 4]
            )
            breath = 0.8 + 0.2 * np.sin(2 * np.pi * t / duration + j)
            out[:, j % 2] += pad * weight * breath * (0.09 if j else 0.12)
    melody = [62, 65, 69, 67, 62, 60, 57, 65, 62, 58, 65, 67, 64, 61, 57, 64]
    spacing = 1 if world else 2
    for i in range(int(duration / spacing)):
        start = i * spacing + 0.25
        age = (t - start) % duration
        freq = note(melody[i % len(melody)])
        envelope = (
            (1 - np.exp(-age * 90)) * np.exp(-age * (1.4 if world else 0.8)) * (age < 6)
        )
        pluck = (
            sum(np.sin(2 * np.pi * freq * k * age) / k**2 for k in [1, 2, 3])
            * envelope
            * 0.105
        )
        out[:, i % 2] += pluck
        echo_age = (t - start - 0.375) % duration
        echo = (
            np.sin(2 * np.pi * freq * echo_age)
            * (1 - np.exp(-echo_age * 80))
            * np.exp(-echo_age * 1.2)
            * (echo_age < 5)
            * 0.025
        )
        out[:, (i + 1) % 2] += echo
    if world:
        # 매우 낮은 프레임 드럼. 총알/피격의 고역과 경쟁하지 않게 절제합니다.
        for start in range(0, duration, 2):
            age = (t - start) % duration
            drum = (
                np.sin(2 * np.pi * (57 * age + 18 * (1 - np.exp(-age * 12))))
                * np.exp(-age * 15)
                * (1 - np.exp(-age * 500))
                * (age < 1)
                * 0.075
            )
            out += drum[:, None]
    out += out[:, ::-1] * 0.22
    # 압축 코덱의 파일 시작/끝 오차가 클릭음이 되지 않도록 경계에 30ms의 부드러운 테이퍼를 둡니다.
    edge = np.minimum(t, duration - t)
    out *= np.sin(np.minimum(1, edge / 0.03) * np.pi / 2)[:, None] ** 2
    return out / max(0.001, np.max(np.abs(out))) * 0.52


def effect(name):
    # 각 소리는 서로 다른 피치/노이즈/감쇠를 가진 직접 작성한 짧은 파형입니다.
    lengths = {
        "shot": 0.12,
        "spread": 0.2,
        "orbit": 0.28,
        "monster_hit": 0.15,
        "heavy_hit": 0.26,
        "player_hit": 0.3,
        "pvp_hit": 0.18,
        "monster_death": 0.48,
        "player_death": 0.9,
        "pvp_kill": 0.65,
        "experience": 0.18,
        "level_up": 0.85,
        "upgrade": 0.5,
        "respawn": 0.65,
        "ui_click": 0.065,
        "ui_hover": 0.045,
    }
    t = np.arange(int(RATE * lengths[name])) / RATE
    n = rng.uniform(-1, 1, len(t))
    # 저역 노이즈 성분은 날카로운 피로음을 줄입니다.
    noise = np.convolve(n, np.ones(7) / 7, mode="same")
    if name in ["shot", "spread", "orbit"]:
        f = {"shot": 520, "spread": 320, "orbit": 700}[name]
        y = (
            np.sin(2 * np.pi * (f * t - f * 0.8 * t * t / lengths[name])) * 0.5
            + noise * 0.65
        )
    elif name in [
        "monster_hit",
        "heavy_hit",
        "player_hit",
        "pvp_hit",
        "monster_death",
        "player_death",
    ]:
        f = {
            "monster_hit": 160,
            "heavy_hit": 78,
            "player_hit": 110,
            "pvp_hit": 230,
            "monster_death": 92,
            "player_death": 65,
        }[name]
        y = np.sin(2 * np.pi * (f * t - f * 0.4 * t * t / lengths[name])) + noise * (
            1.4 if "hit" in name else 0.7
        )
    else:
        notes = {
            "experience": [81, 88],
            "level_up": [62, 65, 69, 74],
            "upgrade": [69, 74, 77],
            "respawn": [50, 57, 62, 69],
            "pvp_kill": [62, 69, 74],
            "ui_click": [74],
            "ui_hover": [81],
        }[name]
        y = np.zeros(len(t))
        for i, midi in enumerate(notes):
            age = np.maximum(0, t - i * lengths[name] / (len(notes) + 1))
            env = (
                (t >= i * lengths[name] / (len(notes) + 1))
                * (1 - np.exp(-age * 350))
                * np.exp(-age * 9)
            )
            y += (
                np.sin(2 * np.pi * note(midi) * age)
                + 0.18 * np.sin(2 * np.pi * note(midi) * 2 * age)
            ) * env
    envelope = (
        np.minimum(1, t / 0.005)
        * np.exp(-t * (6 / lengths[name]))
        * np.minimum(1, (lengths[name] - t) / 0.015)
    )
    y *= envelope
    return y / max(0.001, np.max(np.abs(y))) * 0.38


def write(name, samples, folder, temp):
    # PCM 마스터는 임시 폴더에서만 쓰고 실제 배포에는 압축 파일 두 형식을 포함합니다.
    path = temp / (name + ".wav")
    pcm = (np.clip(samples, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2 if samples.ndim == 2 else 1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(pcm.tobytes())
    target = ROOT / folder
    target.mkdir(parents=True, exist_ok=True)
    for ext, args in [
        ("ogg", ["-c:a", "libvorbis", "-q:a", "4"]),
        ("mp3", ["-c:a", "libmp3lame", "-b:a", "96k"]),
    ]:
        output = target / (name + "." + ext)
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-i", str(path), *args, str(output)],
            check=True,
        )
        # 빈 파일/깨진 코덱을 성공한 에셋으로 기록하지 않습니다. 실제 디코딩까지 검사합니다.
        if output.stat().st_size < 1000:
            raise RuntimeError(f"Empty audio asset: {output}")
        subprocess.run(
            ["ffmpeg", "-v", "error", "-i", str(output), "-f", "null", "-"], check=True
        )
    return {
        "urls": [
            f"/assets/audio/{folder}/{name}.ogg",
            f"/assets/audio/{folder}/{name}.mp3",
        ],
        "duration": len(samples) / RATE,
        "channels": 2 if samples.ndim == 2 else 1,
        "peakPCM": float(np.max(np.abs(samples))),
        "rmsPCM": float(np.sqrt(np.mean(samples**2))),
    }


if __name__ == "__main__":
    specs = {
        "shot": (120, 2, 30, 0.45),
        "spread": (140, 2, 40, 0.5),
        "orbit": (180, 2, 45, 0.5),
        "monster_hit": (75, 2, 45, 0.55),
        "heavy_hit": (110, 2, 55, 0.6),
        "player_hit": (130, 2, 100, 0.9),
        "pvp_hit": (90, 2, 60, 0.65),
        "monster_death": (140, 2, 20, 0.5),
        "player_death": (800, 1, 95, 0.8),
        "pvp_kill": (400, 1, 85, 0.75),
        "experience": (150, 1, 65, 0.45),
        "level_up": (550, 1, 90, 0.8),
        "upgrade": (300, 1, 90, 0.7),
        "respawn": (500, 1, 80, 0.7),
        "ui_click": (65, 2, 70, 0.5),
        "ui_hover": (130, 1, 10, 0.22),
    }
    manifest = {
        "version": 5,
        "sampleRate": RATE,
        "globalVoiceLimit": 12,
        "fadeMs": 900,
        "maxDistance": 650,
        "origin": "Original deterministic synthesis; no external recordings, samples or melodies",
        "bgm": {},
        "sfx": {},
    }
    with tempfile.TemporaryDirectory(prefix="arena-audio-") as folder:
        temp = Path(folder)
        for name in ["menu", "world"]:
            manifest["bgm"][name] = write(name, music(name == "world"), "bgm", temp)
        for name, (cooldown, voices, priority, gain) in specs.items():
            manifest["sfx"][name] = write(name, effect(name), "sfx", temp) | {
                "cooldownMs": cooldown,
                "voices": voices,
                "priority": priority,
                "gain": gain,
            }
    manifest["files"] = {
        str(p.relative_to(ROOT)): {
            "bytes": p.stat().st_size,
            "sha256": hashlib.sha256(p.read_bytes()).hexdigest(),
        }
        for p in sorted(ROOT.rglob("*"))
        if p.suffix in [".mp3", ".ogg"]
    }
    (ROOT / "manifest-v5.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(
        "Created 2 loop BGM + 16 SFX, each in OGG and MP3;",
        sum(f["bytes"] for f in manifest["files"].values()),
        "bytes",
    )
