# 역할: 공유 월드의 단일 서버 권위 시뮬레이션. 이동→몬스터→자동 공격→회전 무기→투사체 순서를 유지합니다.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
import asyncio
import logging
import math
import random
import time
from collections import deque
from app.core.config import settings
from app.game.entities import Player
from app.game.combat_events import CombatEventJournal
from app.game.movement import move
from app.game.combat import Monster, Projectile, damage_after_defense, segment_hits
from app.game.progression import gain_exp, select_upgrade
from app.game.spatial import SpatialGrid
from app.game.map import OBSTACLES, SAFE_ZONE, blocked, safe
from app.persistence.repository import save_statistics

logger = logging.getLogger(__name__)


# 단일 프로세스의 공유 월드입니다. 다중 uvicorn worker는 독립 월드를 만들므로 현재 배포는 worker 1을 사용합니다.
class World:
    # 이 인스턴스가 소유하는 상태와 큐를 초기화합니다. 다른 월드/테스트 인스턴스와 공유하지 않습니다.
    def __init__(self):
        self.players: dict[str, Player] = {}
        self.queues: dict[str, asyncio.Queue] = {}
        self.monsters: dict[str, Monster] = {}
        self.projectiles: dict[str, Projectile] = {}
        self.grid = SpatialGrid()
        self.events = deque(maxlen=12)
        self.combat_events = CombatEventJournal()
        self.rewards = {}
        self.tick = 0
        self.last_tick_ms = 0.0
        self.overruns = 0
        self.next_id = 0
        self.spawn_at = 0.0
        self.stats_queue = asyncio.Queue(maxsize=1000)
        self.stats_failed = 0
        self.stats_rejected = 0
        self.timing_samples = deque(maxlen=1200)

    # 같은 월드 안에서 몬스터·총알·피드 ID가 겹치지 않게 증가 번호를 사용합니다.
    def new_id(self, prefix):
        self.next_id += 1
        return f"{prefix}{self.next_id}"

    # 중복 연결/최대 인원을 검사합니다. 5초 유예 안의 재접속은 기존 상태와 입력 순서를 이어받습니다.
    def join(self, player_id: str, nickname: str):
        if player_id in self.queues:
            raise ValueError(
                "이미 연결된 게스트입니다. 다른 탭에서는 새 게스트를 생성하세요."
            )
        if player_id not in self.players and len(self.players) >= settings.max_players:
            raise ValueError("월드가 가득 찼습니다.")
        player = self.players.get(player_id) or Player(
            player_id,
            nickname,
            x=2048 + random.randint(-40, 40),
            y=2048 + random.randint(-40, 40),
        )
        if player_id not in self.players:
            player.protected_until = time.monotonic() + 3
        player.disconnected_at = None
        player.dx = player.dy = 0
        player.commands.clear()
        player.ack_seq = player.seq
        self.players[player_id] = player
        queue = asyncio.Queue(maxsize=2)
        self.queues[player_id] = queue
        return player, queue

    # 송신 큐를 제거하고 이동을 멈춥니다. 플레이어 상태는 시뮬레이션이 유예 후 제거합니다.
    def disconnect(self, player_id):
        self.queues.pop(player_id, None)
        if player_id in self.players:
            p = self.players[player_id]
            p.dx = p.dy = 0
            p.disconnected_at = time.monotonic()

    # 오래되거나 중복된 seq를 무시하고 최대 8개의 정수 입력을 보관합니다. 방향은 마지막 비영 입력으로 갱신합니다.
    def input(self, player_id, message, now):
        p = self.players[player_id]
        if message.seq <= p.seq:
            return
        p.seq, p.dx, p.dy, p.input_at = message.seq, message.dx, message.dy, now
        p.commands.append((message.seq, message.dx, message.dy, now))
        p.commands = p.commands[-8:]
        if message.dx or message.dy:
            p.direction = math.atan2(message.dy, message.dx)

    # 지난 offer_id 재전송은 무시하고 미래 제안은 거부합니다. 유효한 현재 제안만 progression에 전달합니다.
    def upgrade(self, player_id, choice, offer_id):
        p = self.players[player_id]
        if not p.alive or offer_id < p.offer_id:
            return
        if offer_id != p.offer_id:
            raise ValueError("유효하지 않은 강화 선택 번호")
        select_upgrade(p, choice)

    # 서버 대기 시간이 끝나면 전투 상태를 초기화하고 킬/데스·최고 레벨·입력 seq를 유지합니다.
    def respawn(self, player_id, now):
        old = self.players[player_id]
        if old.alive:
            return
        if now < old.respawn_at:
            raise ValueError("리스폰 대기 중")
        # 전투 레벨만 초기화하고 이 연결의 킬/데스 기록과 입력 순서는 유지합니다.
        p = Player(
            old.id,
            old.nickname,
            kills=old.kills,
            deaths=old.deaths,
            seq=old.seq,
            ack_seq=old.seq,
            offer_id=old.offer_id + 1,
            best_level=old.best_level,
            protected_until=now + 3,
        )
        self.players[player_id] = p

    # 사망·등장 보호·안전구역 중 하나면 공격/피격 대상에서 제외합니다.
    def protected(self, p, now):
        return not p.alive or now < p.protected_until or safe(p.x, p.y)

    # 게임 루프를 DB 대기로 막지 않고 통계 증가분을 큐에 넣습니다. 포화 시 실패 카운터를 남깁니다.
    def record(self, p, kills=0, deaths=0):
        try:
            self.stats_queue.put_nowait((p.id, kills, deaths, p.best_level))
        except asyncio.QueueFull:
            self.stats_rejected += 1
            logger.error("통계 큐가 가득 찼습니다: %s", p.id)

    # 큐의 통계를 DB에 비동기로 저장합니다. 실패를 관측하지만 영속 재시도 큐는 아직 없습니다.
    async def persist(self):
        while True:
            item = await self.stats_queue.get()
            try:
                # 실패는 관측하며 다음 이벤트를 계속 처리합니다. 내구성 큐는 후속 과제입니다.
                await save_statistics(*item)
            except Exception:
                self.stats_failed += 1
                logger.exception("통계 저장 실패")
            finally:
                self.stats_queue.task_done()

    # 성장 규칙을 먼저 적용하고 EXP/레벨업 결과를 기록합니다. 클라이언트용 수집 오브젝트는 생성하지 않습니다.
    def award_experience(self, player, amount):
        old_level = player.level
        gain_exp(player, amount)
        self.combat_events.emit(
            self.tick, "experience", player.x, player.y, owner=player.id, amount=amount
        )
        if player.level > old_level:
            self.combat_events.emit(
                self.tick,
                "level_up",
                player.x,
                player.y,
                owner=player.id,
                level=player.level,
                offer_id=player.offer_id,
            )

    # 보호와 방어를 반영한 실제 HP 감소를 확정한 뒤 명중/사망/보상 이벤트를 기록합니다.
    def hurt(
        self,
        target,
        damage,
        attacker,
        now,
        *,
        weapon="bullet",
        source_id=None,
        vx=None,
        vy=None,
        projectile_id=None,
    ):
        if isinstance(target, Player) and self.protected(target, now):
            return
        # hit.damage에는 과잉 피해 대신 실제 소모된 HP만 보내 데미지 숫자와 서버 결과를 맞춥니다.
        old_hp = target.hp
        target.hp -= damage_after_defense(damage, getattr(target, "defense", 0))
        owner = source_id or (attacker.id if attacker else None)
        if vx is None and attacker:
            vx, vy = target.x - attacker.x, target.y - attacker.y
        angle = (
            math.atan2(vy, vx)
            if vx is not None and vy is not None and (vx or vy)
            else None
        )
        target_kind = "player" if isinstance(target, Player) else "monster"
        self.combat_events.emit(
            self.tick,
            "hit",
            target.x,
            target.y,
            owner=owner,
            target=target.id,
            target_kind=target_kind,
            damage=round(min(max(0, old_hp), old_hp - target.hp), 2),
            hp=max(0, target.hp),
            angle=angle,
            weapon=weapon,
            projectile_id=projectile_id,
        )
        if target.hp > 0:
            return
        self.combat_events.emit(
            self.tick,
            "death",
            target.x,
            target.y,
            owner=owner,
            target=target.id,
            target_kind=target_kind,
        )
        if isinstance(target, Monster):
            self.monsters.pop(target.id, None)
            if attacker and attacker.alive:
                self.award_experience(attacker, 15)
                self.record(attacker)
        else:
            target.hp = 0
            target.alive = False
            target.deaths += 1
            target.streak = 0
            target.respawn_at = now + 3
            target.choices = []
            target.pending_upgrades = 0
            self.record(target, deaths=1)
            if attacker and attacker.id != target.id and attacker.alive:
                # 동일한 두 게스트 간 60초 내 반복 처치는 점수/경험치를 지급하지 않습니다.
                key = (attacker.id, target.id)
                rewarded = now - self.rewards.get(key, -1000) >= 60
                if rewarded:
                    attacker.kills += 1
                    attacker.streak += 1
                    self.award_experience(attacker, 30)
                    self.rewards[key] = now
                    self.record(attacker, kills=1)
                self.events.append(
                    {
                        "id": self.new_id("e"),
                        "text": f"{attacker.nickname} → {target.nickname}"
                        + ("" if rewarded else " (반복 처치: 보상 없음)"),
                    }
                )
            else:
                self.events.append(
                    {
                        "id": self.new_id("e"),
                        "text": f"{target.nickname} 몬스터에게 사망",
                    }
                )

    # 한 tick의 월드를 갱신합니다. 입력·AI·무기·충돌 처리 순서와 80몬스터/240투사체 상한을 유지합니다.
    def simulate(self, dt, now):
        self.tick += 1
        for pid, p in list(self.players.items()):
            if p.disconnected_at is not None and now - p.disconnected_at > 5:
                self.record(p)
                del self.players[pid]
                continue
            if p.commands:
                seq, dx, dy, input_at = p.commands.pop(0)
                p.dx, p.dy, p.input_at, p.ack_seq = dx, dy, input_at, seq
            else:
                p.dx = p.dy = 0
            move(p, dt, settings.world_size, now)
        # 연결 유예 중/사망 상태는 AI와 공격 대상에서 제외하지만 스냅샷의 상태는 유예 동안 유지합니다.
        active = [
            p for p in self.players.values() if p.alive and p.disconnected_at is None
        ]
        # 플레이어 주변만 생성하고 몬스터·투사체 수를 제한합니다.
        if active and now >= self.spawn_at and len(self.monsters) < 80:
            self.spawn_at = now + 0.6
            p = random.choice(active)
            angle = random.random() * math.tau
            x = min(4070, max(26, p.x + math.cos(angle) * random.uniform(260, 450)))
            y = min(4070, max(26, p.y + math.sin(angle) * random.uniform(260, 450)))
            if not blocked(x, y) and not safe(x, y):
                m = Monster(self.new_id("m"), x, y)
                self.monsters[m.id] = m
        for m in list(self.monsters.values()):
            eligible = [p for p in active if not self.protected(p, now)]
            if not eligible:
                continue
            target = min(eligible, key=lambda p: math.hypot(p.x - m.x, p.y - m.y))
            dist = math.hypot(target.x - m.x, target.y - m.y)
            if dist > 800:
                continue
            if dist > 24:
                nx = m.x + (target.x - m.x) / dist * 85 * dt
                ny = m.y + (target.y - m.y) / dist * 85 * dt
                if not blocked(nx, m.y) and not safe(nx, m.y):
                    m.x = nx
                if not blocked(m.x, ny) and not safe(m.x, ny):
                    m.y = ny
            elif now >= m.attack_at:
                m.attack_at = now + 0.8
                self.hurt(
                    target,
                    12,
                    None,
                    now,
                    weapon="melee",
                    source_id=m.id,
                    vx=target.x - m.x,
                    vy=target.y - m.y,
                )
        # AI 이동 후 현재 위치로 격자를 다시 만듭니다. 후보 검색 뒤에는 거리/보호/HP를 다시 검사합니다.
        self.grid.rebuild([*self.monsters.values(), *active])
        for p in active:
            if (
                self.protected(p, now)
                or now < p.attack_at
                or len(self.projectiles) >= 240
            ):
                continue
            targets = [
                e
                for e in self.grid.nearby(p.x, p.y, 420)
                if e.id != p.id
                and (not isinstance(e, Player) or not self.protected(e, now))
                and math.hypot(e.x - p.x, e.y - p.y) <= 420
            ]
            if not targets:
                continue
            target = min(targets, key=lambda e: math.hypot(e.x - p.x, e.y - p.y))
            dist = math.hypot(target.x - p.x, target.y - p.y)
            if dist == 0:
                continue
            p.attack_at = now + p.cooldown
            angle = math.atan2(target.y - p.y, target.x - p.x)
            fired_ids = []
            for offset in ((-0.2, 0, 0.2) if p.spread else (0,)):
                if len(self.projectiles) >= 240:
                    break
                shot = Projectile(
                    self.new_id("b"),
                    p.id,
                    p.x,
                    p.y,
                    math.cos(angle + offset) * 480,
                    math.sin(angle + offset) * 480,
                    p.damage,
                    kind="spread" if p.spread else "bullet",
                )
                self.projectiles[shot.id] = shot
                fired_ids.append(shot.id)
            if fired_ids:
                self.combat_events.emit(
                    self.tick,
                    "fire",
                    p.x,
                    p.y,
                    owner=p.id,
                    angle=angle,
                    weapon="spread" if p.spread else "bullet",
                    shot_ids=fired_ids,
                )
        # 회전 무기는 서버가 각도와 0.2초 피해 주기를 결정합니다. 표시 보간은 판정을 변경하지 않습니다.
        for p in active:
            if not p.orbit or self.protected(p, now) or now < p.orbit_at:
                continue
            p.orbit_angle = now * 4
            p.orbit_at = now + 0.2
            ox = p.x + math.cos(p.orbit_angle) * 70
            oy = p.y + math.sin(p.orbit_angle) * 70
            for target in self.grid.nearby(ox, oy, 24):
                if (
                    target.id != p.id
                    and target.hp > 0
                    and math.hypot(target.x - ox, target.y - oy) <= 24
                ):
                    self.hurt(
                        target,
                        p.damage * 0.6,
                        p,
                        now,
                        weapon="orbit",
                        vx=ox - p.x,
                        vy=oy - p.y,
                    )
        # 총알 수명/경계/장애물 소멸과 명중 소멸을 구분합니다. hit는 실제 선분 판정 때만 기록합니다.
        for bid, b in list(self.projectiles.items()):
            ox, oy = b.x, b.y
            b.x += b.vx * dt
            b.y += b.vy * dt
            b.ttl -= dt
            if (
                b.ttl <= 0
                or not (0 < b.x < 4096 and 0 < b.y < 4096)
                or blocked(b.x, b.y, 2)
            ):
                del self.projectiles[bid]
                continue
            for target in self.grid.nearby(b.x, b.y, 48):
                if (
                    target.id == b.owner
                    or target.hp <= 0
                    or isinstance(target, Player)
                    and self.protected(target, now)
                ):
                    continue
                if segment_hits(ox, oy, b.x, b.y, target.x, target.y, 16):
                    self.hurt(
                        target,
                        b.damage,
                        self.players.get(b.owner),
                        now,
                        weapon=b.kind,
                        source_id=b.owner,
                        vx=b.vx,
                        vy=b.vy,
                        projectile_id=b.id,
                    )
                    del self.projectiles[bid]
                    break
        # 오래된 반복 처치 이력은 제거하여 메모리 누적을 방지합니다.
        self.rewards = {
            key: value for key, value in self.rewards.items() if now - value < 60
        }

    # 본인 중심 AOI 상태와 개인 강화/보호 정보를 구성합니다. 랭킹은 AOI 밖을 포함한 월드 상위 5명입니다.
    def snapshot(self, player_id):
        me = self.players[player_id]

        # 본인 기준 가로 950/세로 650의 AOI 포함 여부를 계산합니다.
        def nearby(e):
            return abs(e.x - me.x) <= 950 and abs(e.y - me.y) <= 650

        return {
            "v": 1,
            "type": "snapshot",
            "tick": self.tick,
            "you": player_id,
            "size": settings.world_size,
            "players": [
                p.public()
                for p in self.players.values()
                if p.id == player_id or nearby(p)
            ],
            "monsters": [m.public() for m in self.monsters.values() if nearby(m)],
            "projectiles": [b.public() for b in self.projectiles.values() if nearby(b)],
            "choices": me.choices,
            "offer_id": me.offer_id,
            "respawn_in": (
                max(0, math.ceil((me.respawn_at - time.monotonic()) * 10) / 10)
                if not me.alive
                else 0
            ),
            "protected": self.protected(me, time.monotonic()),
            "obstacles": OBSTACLES,
            "safe_zone": SAFE_ZONE,
            "online": len(self.queues),
            "events": list(self.events),
            "combat_epoch": self.combat_events.epoch,
            "combat_events": self.combat_events.nearby(self.tick, me),
            "leaderboard": [
                {"nickname": p.nickname, "kills": p.kills, "level": p.level, "id": p.id}
                for p in sorted(
                    self.players.values(),
                    key=lambda p: (p.kills, p.level),
                    reverse=True,
                )[:5]
            ],
        }

    # 20Hz 고정 dt로 진행하고 10Hz 스냅샷을 보냅니다. 느린 클라이언트 큐는 오래된 패킷부터 버립니다.
    async def run(self):
        dt = 1 / settings.tick_rate
        deadline = time.monotonic()
        while True:
            started = time.monotonic()
            self.simulate(dt, started)
            if self.tick % (settings.tick_rate // settings.snapshot_rate) == 0:
                for pid, queue in list(self.queues.items()):
                    if queue.full():
                        queue.get_nowait()
                    queue.put_nowait(self.snapshot(pid))
            self.last_tick_ms = (time.monotonic() - started) * 1000
            self.timing_samples.append(self.last_tick_ms)
            deadline += dt
            if time.monotonic() > deadline:
                self.overruns += 1
                deadline = time.monotonic()
            await asyncio.sleep(max(0, deadline - time.monotonic()))
