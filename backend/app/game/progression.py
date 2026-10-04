# 역할: 서버 경험치·레벨·강화 규칙. 프론트 설명 문구를 바꾸어도 실제 증가량은 여기서 결정됩니다.
# 유지보수: 이 파일의 변경 범위와 호출 흐름은 같은 폴더 README.md에서 확인하세요.
import random
from app.game.entities import Player

UPGRADES = ("damage", "haste", "health")


# 기본 3종에 미해금 무기를 레벨 3부터 포함하여 실제 후보 3개를 뽑습니다.
def choices_for(player):
    choices = list(UPGRADES)
    if player.level >= 3:
        if not player.spread:
            choices.append("spread")
        if not player.orbit:
            choices.append("orbit")
    return random.sample(choices, 3)


# 직접 경험치를 지급하고 여러 레벨 상승을 처리합니다. 강화 대기는 누적하고 첫 제안만 발급합니다.
def gain_exp(player: Player, amount: int):
    player.exp += amount
    while player.exp >= player.level * 30:
        player.exp -= player.level * 30
        player.level += 1
        player.best_level = max(player.best_level, player.level)
        player.pending_upgrades += 1
    if player.pending_upgrades and not player.choices:
        player.offer_id += 1
        player.choices = choices_for(player)


# 현재 제안에 포함된 강화만 적용하고 다음 offer_id를 발급합니다. 상한과 누적 대기 횟수를 유지합니다.
def select_upgrade(player: Player, choice: str):
    if not player.alive or choice not in player.choices:
        raise ValueError("현재 선택할 수 없는 강화")
    # 반복 강화의 증가량은 체감하며 공격 속도와 체력에는 상한을 적용합니다.
    if choice == "damage":
        player.damage = min(80, player.damage + 4 / (1 + player.level / 20))
    if choice == "haste":
        player.cooldown = max(0.2, player.cooldown * 0.92)
    if choice == "health":
        increase = min(12, 300 - player.max_hp)
        player.max_hp += increase
        player.hp = min(player.max_hp, player.hp + increase)
    if choice == "spread":
        player.spread = True
    if choice == "orbit":
        player.orbit = True
    player.offer_id += 1
    player.pending_upgrades -= 1
    player.choices = choices_for(player) if player.pending_upgrades else []
