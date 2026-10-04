// 역할: 서버 스냅샷과 V3 표시 이벤트의 TypeScript 계약. 서버 스키마 변경 시 함께 점검하세요.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
export interface ProjectileState {
  id: string;
  x: number;
  y: number;
  owner?: string;
  vx?: number;
  vy?: number;
  kind?: "bullet" | "spread";
}
// id는 epoch:seq이며 동일 이벤트가 여러 스냅샷에 포함되어도 한 번만 표시합니다. 선택 필드는 이벤트 종류별로 다릅니다.
export interface CombatEvent {
  id: string;
  tick: number;
  kind: "fire" | "hit" | "death" | "experience" | "level_up";
  x: number;
  y: number;
  owner?: string | null;
  target?: string;
  target_kind?: "player" | "monster";
  damage?: number;
  hp?: number;
  angle?: number | null;
  weapon?: "bullet" | "spread" | "orbit" | "melee";
  projectile_id?: string | null;
  shot_ids?: string[];
  amount?: number;
  level?: number;
  offer_id?: number;
}
export interface MonsterState {
  id: string;
  x: number;
  y: number;
  hp: number;
  max_hp: number;
}
// seq는 서버 처리 완료 번호입니다. x/y는 서버 중심 좌표이며 시트의 발 오프셋을 적용하지 않습니다.
export interface PlayerState {
  id: string;
  nickname: string;
  x: number;
  y: number;
  seq: number;
  hp: number;
  max_hp: number;
  level: number;
  exp: number;
  exp_next: number;
  speed: number;
  orbit_angle: number;
  weapons: string[];
  alive: boolean;
  kills: number;
  deaths: number;
  streak: number;
  damage: number;
  cooldown: number;
}
// AOI 엔티티는 렌더링용, choices/offer_id/respawn_in/protected는 본인 UI용입니다. 랭킹/online은 월드 기준입니다.
export interface Snapshot {
  v: 1;
  type: "snapshot";
  tick: number;
  you: string;
  size: number;
  players: PlayerState[];
  monsters: MonsterState[];
  projectiles: ProjectileState[];
  combat_epoch?: string;
  combat_events?: CombatEvent[];
  offer_id: number;
  choices: string[];
  respawn_in: number;
  protected: boolean;
  online: number;
  obstacles: { x: number; y: number; w: number; h: number }[];
  safe_zone: { x: number; y: number; radius: number };
  events: { id: string; text: string }[];
  leaderboard: { id: string; nickname: string; kills: number; level: number }[];
}
