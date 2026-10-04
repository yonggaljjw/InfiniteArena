# 역할: 서버 명중·성장·PvP·보호·무기·입력 상한·강화 중복 적용 방지 회귀 검사.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
import pytest
from app.game.world import World
from app.game.entities import Player
from app.game.combat import Monster, Projectile, segment_hits, damage_after_defense
from app.game.progression import gain_exp, select_upgrade
from app.game.map import blocked
from app.game.movement import move


# 총알 생성·명중·공격 간격과 선분/방어력 계산을 검사합니다.
def test_projectile_collision_and_cooldown():
    w = World()
    p, q = w.join("1", "테스트")
    p.x = 2400
    p.y = 2000
    p.protected_until = 0
    m = Monster("m", 2450, 2000)
    w.monsters[m.id] = m
    w.simulate(0.05, 10)
    assert len(w.projectiles) == 1
    w.simulate(0.05, 10.05)
    assert p.attack_at == pytest.approx(10.7)
    assert m.hp < 45
    assert segment_hits(0, 0, 100, 0, 50, 0, 5)
    assert damage_after_defense(100, 100) == 50


# 여러 레벨 상승·대기 강화 횟수와 현재 제안 밖의 선택 거부를 검사합니다.
def test_level_and_upgrade_validation():
    p = Player("1", "테스트")
    gain_exp(p, 100)
    assert p.level == 3 and p.exp == 10 and p.pending_upgrades == 2
    p.choices = ["damage", "haste", "health"]
    select_upgrade(p, "damage")
    p.choices = ["health"]
    select_upgrade(p, "health")
    assert not p.choices and p.damage > 16 and p.max_hp > 100
    with pytest.raises(ValueError):
        select_upgrade(p, "damage")


# PvP 사망·3초 대기·리스폰 보호와 동일 상대 반복 처치 보상 억제를 검사합니다.
def test_pvp_death_repeat_reward_and_respawn():
    w = World()
    a, q = w.join("1", "공격자")
    b, q = w.join("2", "방어자")
    for p in (a, b):
        p.x = 2500
        p.y = 2000
        p.protected_until = 0
    w.hurt(b, 200, a, 10)
    assert not b.alive and a.kills == 1 and b.deaths == 1
    with pytest.raises(ValueError):
        w.respawn("2", 12)
    w.respawn("2", 13)
    b = w.players["2"]
    assert b.alive and b.level == 1 and b.deaths == 1
    assert w.protected(b, 14)
    b.x = 2500
    b.y = 2000
    b.protected_until = 0
    w.hurt(b, 200, a, 20)
    assert a.kills == 1


# 서버 이동 장애물과 안전구역 무피해 판정을 검사합니다.
def test_obstacle_and_safe_zone():
    p = Player("1", "테스트", x=1680, y=1830, dx=1, input_at=1)
    move(p, 0.05, 4096, 1)
    assert p.x == 1680
    w = World()
    a, q = w.join("a", "안전")
    hp = a.hp
    w.hurt(a, 100, None, 1000)
    assert a.hp == hp
    assert blocked(1750, 1820)


# 멀리 있는 상대 제외와 연결 유예 만료 후 상태 제거를 검사합니다.
def test_aoi_and_grace_cleanup():
    w = World()
    a, q = w.join("a", "첫유저")
    b, q = w.join("b", "먼유저")
    b.x = 100
    b.y = 100
    assert len(w.snapshot("a")["players"]) == 1
    w.disconnect("b")
    b.disconnected_at = 0
    w.simulate(0.05, 10)
    assert "b" not in w.players


# 확산탄 3발·회전 피해와 8개 입력 상한/1tick 최대 이동량을 검사합니다.
def test_spread_orbit_and_input_budget():
    w = World()
    p, q = w.join("p", "무기검증")
    p.x = 2400
    p.y = 2000
    p.protected_until = 0
    p.spread = True
    w.monsters["m"] = Monster("m", 2470, 2000)
    w.simulate(0.05, 10)
    assert len(w.projectiles) == 3
    p.orbit = True
    p.orbit_at = 0
    p.attack_at = 100
    m = w.monsters["m"]
    m.x = 2470
    m.y = 2000
    hp = m.hp
    w.simulate(0.05, 0)
    assert m.hp < hp
    from app.game.protocol import Input

    for seq in range(100):
        w.input("p", Input(type="input", seq=seq, dx=1, dy=0), 10)
    assert len(p.commands) <= 8
    start = p.x
    w.simulate(0.05, 10)
    assert p.x - start <= 11.001


# 같은 offer_id 재전송이 강화를 중복 적용하지 않는지 검사합니다.
def test_upgrade_offer_is_idempotent():
    w = World()
    p, q = w.join("p", "선택검증")
    gain_exp(p, 30)
    offer = p.offer_id
    choice = p.choices[0]
    w.upgrade("p", choice, offer)
    damage = p.damage
    cooldown = p.cooldown
    hp = p.max_hp
    w.upgrade("p", choice, offer)
    assert (p.damage, p.cooldown, p.max_hp) == (damage, cooldown, hp)
    with pytest.raises(ValueError):
        w.upgrade("p", "damage", p.offer_id + 100)
