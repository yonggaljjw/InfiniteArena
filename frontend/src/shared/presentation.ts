// 역할: 서버 강화/무기 ID의 한국어 표시 문구와 게이지 계산. 규칙이 바뀌면 progression.py와 설명을 맞추세요.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
import type { PlayerState } from "./protocol";

export const upgrades: Record<
  string,
  { title: string; description: string; icon: string; category: string }
> = {
  damage: {
    title: "강철의 맹세",
    description:
      "기본 총알 피해량 증가. 성장에 따라 증가량이 조절되며 최대 80.",
    icon: "sword",
    category: "공격력 강화",
  },
  haste: {
    title: "사냥꾼의 박동",
    description: "공격 간격 8% 감소. 최소 간격 0.2초.",
    icon: "haste",
    category: "공격 속도 강화",
  },
  health: {
    title: "불굴의 심장",
    description: "최대 체력 최대 12 증가와 동일량 회복. 최대 체력 상한 300.",
    icon: "heart",
    category: "체력 강화",
  },
  spread: {
    title: "갈라지는 탄환",
    description: "기존 총알을 3발의 확산탄으로 변경합니다.",
    icon: "spread",
    category: "무기 해금",
  },
  orbit: {
    title: "달의 파수꾼",
    description: "거리 70에서 회전하는 무기를 추가합니다. 접촉 시 피해.",
    icon: "orbit",
    category: "무기 해금",
  },
};
export const weapons: Record<string, { title: string; icon: string }> = {
  bullet: { title: "기본 탄환", icon: "bolt" },
  spread: { title: "확산탄", icon: "spread" },
  orbit: { title: "회전 무기", icon: "orbit" },
};
// 현재 서버 능력치/해금 상태를 카드에 표시합니다. 실제 강화 증가량은 서버 progression.py가 결정합니다.
export function currentUpgrade(choice: string, player: PlayerState) {
  if (choice === "damage") return `현재 총알 피해 ${player.damage.toFixed(1)}`;
  if (choice === "haste")
    return `현재 공격 간격 ${player.cooldown.toFixed(2)}초`;
  if (choice === "health") return `현재 최대 체력 ${player.max_hp}`;
  return player.weapons.includes(choice) ? "해금 완료" : "미해금";
}
// 잘못된 분모와 음수/초과 값을 방어하여 게이지를 0~100% 안에서 표시합니다.
export function percentage(value: number, max: number) {
  return max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
}
