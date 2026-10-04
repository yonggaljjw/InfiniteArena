# 역할: 같은 RNG·입력으로 제공한 V2 기준 World와 현재 서버 상태를 비교합니다. 실시간 부하/FPS 측정이 아닙니다.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
"""Replay identical random states/inputs against a supplied V2 World.
Run with backend dependencies: python tools/compare_v2_rules.py --baseline /path/infinite-arena
This is a migration regression check, not an FPS/real-time load test.
"""

import argparse, importlib.util, json, random, sys
from dataclasses import asdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app.game.world import World
from app.game.combat import Monster
from app.game.protocol import Input


# 표시용 투사체 종류를 제외한 서버 판정 상태를 비교용 사전으로 직렬화합니다.
def state(w):
    bullets = {k: asdict(v) for k, v in w.projectiles.items()}
    for b in bullets.values():
        b.pop("kind", None)
    return {
        "players": {k: asdict(v) for k, v in w.players.items()},
        "monsters": {k: asdict(v) for k, v in w.monsters.items()},
        "projectiles": bullets,
        "events": list(w.events),
        "rewards": w.rewards,
        "tick": w.tick,
        "next_id": w.next_id,
        "spawn_at": w.spawn_at,
        "stats": list(w.stats_queue._queue),
    }


# 고정 RNG에서 20명/80몬스터 비교 조건을 만듭니다. 기준/현재 World에 동일 입력을 적용합니다.
def setup(cls, seed):
    random.seed(seed)
    w = cls()
    for i in range(20):
        p, _ = w.join(f"p{i}", f"유저{i}")
        p.x = 2480 + (i % 5) * 35
        p.y = 1950 + (i // 5) * 35
        p.protected_until = 0
        p.cooldown = 0.2
        p.spread = i % 3 == 0
        p.orbit = i % 4 == 0
    for i in range(80):
        m = Monster(f"initial{i}", 2600 + (i % 10) * 20, 1900 + (i // 10) * 25)
        w.monsters[m.id] = m
    return w


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline", type=Path, required=True)
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location(
        "v2_world", args.baseline / "backend/app/game/world.py"
    )
    old = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(old)
    for seed in [17, 83, 2026]:
        a, b = setup(old.World, seed), setup(World, seed)
        rng = random.Random(seed + 90)
        assert state(a) == state(b)
        for tick in range(1200):
            now = 10 + tick * 0.05
            commands = [
                (rng.choice([-1, 0, 1]), rng.choice([-1, 0, 1])) for _ in range(20)
            ]
            for w in (a, b):
                for i, (dx, dy) in enumerate(commands):
                    p = w.players[f"p{i}"]
                    if not p.alive and now >= p.respawn_at:
                        w.respawn(p.id, now)
                    w.input(p.id, Input(type="input", seq=tick, dx=dx, dy=dy), now)
            random_state = random.getstate()
            a.simulate(0.05, now)
            after = random.getstate()
            random.setstate(random_state)
            b.simulate(0.05, now)
            assert random.getstate() == after, (seed, tick, "random consumption")
            assert state(a) == state(b), (seed, tick, "authoritative state")
    report = {
        "baseline": "supplied V2 World",
        "seeds": 3,
        "ticksPerSeed": 1200,
        "players": 20,
        "initialMonsters": 80,
        "totalComparedTicks": 3600,
        "comparedSimulationSeconds": 180,
        "authoritativeDifferences": 0,
        "note": "V2 World loaded against unchanged shared entity/progression/movement modules; telemetry fields excluded.",
    }
    (ROOT / "docs/v3-rule-comparison.json").write_text(
        json.dumps(report, indent=2) + "\n"
    )
    print(json.dumps(report))
