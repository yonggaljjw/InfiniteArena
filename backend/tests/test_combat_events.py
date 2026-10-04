# 역할: 실제 서버 상태 변화와 전투 효과 이벤트가 일치하는지 검사. 표시 이벤트로 게임 상태를 변경하지 않습니다.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
import pytest
from app.game.world import World
from app.game.combat import Monster
from app.game.combat_events import CombatEventJournal


# 안전구역 밖의 플레이어와 월드를 준비하여 보호 효과를 제거한 전투 조건을 만듭니다.
def arena():
    w = World()
    p, _ = w.join("p", "관측검증")
    p.x = 2400
    p.y = 2000
    p.protected_until = 0
    return w, p


# 보호 대상은 HP도 효과 이벤트도 변하지 않는지 검사합니다.
def test_protected_hit_has_no_effect_event():
    w = World()
    p, _ = w.join("p", "안전검증")
    w.hurt(p, 100, None, 10)
    assert p.hp == 100 and not w.combat_events.events


# 실제 HP 감소량·피격 방향·사망·EXP 이벤트 순서가 서버 결과와 일치하는지 검사합니다.
def test_actual_hit_damage_direction_and_death_reward():
    w, p = arena()
    m = Monster("m", 2450, 2000)
    w.monsters[m.id] = m
    w.hurt(m, 30, p, 10, vx=480, vy=0, projectile_id="b")
    e = list(w.combat_events.events)[0]
    assert (
        e["kind"] == "hit" and e["damage"] == 30 and e["hp"] == 15 and e["angle"] == 0
    )
    assert e["target"] == "m" and e["owner"] == "p" and e["projectile_id"] == "b"
    w.hurt(m, 30, p, 10.1)
    events = list(w.combat_events.events)
    assert events[-3]["damage"] == 15  # 과잉 피해가 아니라 실제 감소한 HP만 연출합니다.
    assert [e["kind"] for e in events[-2:]] == ["death", "experience"]
    assert p.exp == 15 and events[-1]["amount"] == 15 and "m" not in w.monsters


# 레벨 상승 후 남은 EXP와 실제 강화 제안 ID 전달을 검사합니다.
def test_experience_rollover_and_level_event_offer():
    w, p = arena()
    p.exp = 20
    w.award_experience(p, 15)
    exp, level = list(w.combat_events.events)
    assert p.exp == 5 and p.level == 2 and len(p.choices) == 3
    assert (
        exp["amount"] == 15 and level["level"] == 2 and level["offer_id"] == p.offer_id
    )


# 3발을 하나의 발사 이벤트로 기록하고 실제 속도/소유자/종류를 보내는지 검사합니다.
def test_spread_fire_one_volley_and_metadata():
    w, p = arena()
    p.spread = True
    w.monsters["m"] = Monster("m", 2600, 2000)
    w.spawn_at = 999
    w.simulate(0.05, 10)
    fire = [e for e in w.combat_events.events if e["kind"] == "fire"]
    assert len(fire) == 1 and len(fire[0]["shot_ids"]) == 3
    shots = [b.public() for b in w.projectiles.values()]
    assert all(b["owner"] == "p" and b["kind"] == "spread" for b in shots)
    assert all(
        (b["vx"] ** 2 + b["vy"] ** 2) ** 0.5 == pytest.approx(480, abs=0.001)
        for b in shots
    )


# 한 tick 안에 사라진 총알도 확정 발사/명중 이벤트를 남기는지 검사합니다.
def test_short_lived_projectile_still_emits_hit_and_fire():
    w, p = arena()
    w.monsters["m"] = Monster("m", 2425, 2000)
    w.spawn_at = 999
    w.simulate(0.05, 10)
    assert not w.projectiles
    assert [e["kind"] for e in w.combat_events.events] == ["fire", "hit"]


# 본인 EXP의 AOI 예외·기록 만료·상한·월드별 이벤트 ID 고유성을 검사합니다.
def test_aoi_expiry_caps_unique_epoch():
    w, p = arena()
    j = w.combat_events
    j.emit(0, "hit", 0, 0)
    j.emit(0, "experience", 0, 0, owner=p.id, amount=15)
    assert [e["kind"] for e in j.nearby(0, p)] == ["experience"]
    assert not j.nearby(21, p)
    for i in range(3000):
        j.emit(30, "hit", p.x, p.y)
    assert len(j.events) == j.LIMIT and len({e["id"] for e in j.events}) == j.LIMIT
    assert CombatEventJournal().epoch != j.epoch


# 보상이 없는 반복 처치에 가짜 EXP 효과가 추가되지 않는지 검사합니다.
def test_unrewarded_repeat_kill_no_experience_effect():
    w, a = arena()
    b, _ = w.join("b", "피격검증")
    b.x = 2500
    b.y = 2000
    b.protected_until = 0
    w.hurt(b, 200, a, 10)
    w.respawn("b", 13)
    b = w.players["b"]
    b.x = 2500
    b.y = 2000
    b.protected_until = 0
    count = len([e for e in w.combat_events.events if e["kind"] == "experience"])
    w.hurt(b, 200, a, 20)
    assert (
        len([e for e in w.combat_events.events if e["kind"] == "experience"]) == count
    )


# 실제 시뮬레이션으로 두 몬스터 처치와 레벨업/EXP 이벤트를 검사합니다.
def test_single_player_real_two_kills_experience_level_up():
    w, p = arena()
    w.spawn_at = 999
    for i, x in enumerate([2600, 2750]):
        w.monsters[str(i)] = Monster(str(i), x, 2000)
    for tick in range(150):
        w.simulate(0.05, 10 + tick * 0.05)
    assert p.alive and p.level == 2 and p.exp == 0 and not w.monsters
    events = list(w.combat_events.events)
    assert (
        len(
            [
                e
                for e in events
                if e["kind"] == "death" and e["target_kind"] == "monster"
            ]
        )
        == 2
    )
    assert sum(e["amount"] for e in events if e["kind"] == "experience") == 30
    assert any(e["kind"] == "level_up" and e["offer_id"] == p.offer_id for e in events)


# 회전 무기의 실제 다중 명중마다 서버 확정 hit가 남는지 검사합니다.
def test_orbit_authoritative_hits_multiple_monsters():
    w, p = arena()
    w.spawn_at = 999
    p.attack_at = 999
    p.orbit = True
    for i, y in enumerate([1995, 2005]):
        w.monsters[str(i)] = Monster(str(i), 2470, y)
    w.simulate(0.05, 0)
    hits = [e for e in w.combat_events.events if e["kind"] == "hit"]
    assert {e["target"] for e in hits} == {"0", "1"}
    assert all(
        e["weapon"] == "orbit" and e["damage"] == pytest.approx(9.6) for e in hits
    )
