// 역할: 결정적 지형/장식 배치와 공통 depth. 장식은 클라이언트 표현이며 새 서버 충돌체를 만들지 않습니다.
// 유지보수: 같은 폴더 README.md에서 파일 연결과 변경 시 점검 항목을 확인하세요.
export const TILE = 32;
export const SIZE = 4096;
export const DEPTH = {
  ground: -200000,
  detail: -180000,
  shadow: -150000,
  entities: 10000,
  foreground: 20000,
  effects: 30000,
  labels: 40000,
};
export const footDepth = (y: number) => DEPTH.entities + y;

// 같은 좌표는 모든 브라우저에서 같은 장식을 생성합니다. 서버 상태에는 관여하지 않습니다.
// 좌표/정수 salt에서 같은 0~1 값을 생성해 브라우저마다 장식 배치가 같도록 합니다.
export function noise(x: number, y: number, salt = 0): number {
  let value =
    Math.imul(x + salt * 31, 374761393) ^
    Math.imul(y + salt * 17, 668265263) ^
    0x4a91;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}
// 32px 타일 중심의 월드 좌표에서 잔디/길/유적/변형 지형 종류를 결정합니다.
export function terrain(x: number, y: number): number {
  const wx = x * TILE + 16,
    wy = y * TILE + 16;
  if (Math.hypot(wx - 2048, wy - 2048) < 155) return 2;
  if (
    Math.hypot(wx - 2340, wy - 2270) < 185 ||
    Math.hypot(wx - 1850, wy - 2520) < 160
  )
    return 2;
  const horizontal = 2048 + Math.sin((wx - 2048) / 360) * 85;
  const vertical = 2048 + Math.sin((wy - 2048) / 440) * 100;
  if (Math.abs(wy - horizontal) < 50 || Math.abs(wx - vertical) < 45) return 1;
  const patches =
    Math.sin(wx / 260) + Math.cos(wy / 330) + Math.sin((wx + wy) / 470);
  return patches > 1.2 ? 3 : 0;
}
// 4방향 경계 mask로 지형 타일 index를 고르고 결정적 확률로 작은 장식을 추가합니다.
export function buildTiles(size = SIZE) {
  const count = size / TILE;
  const ground: number[][] = [],
    detail: number[][] = [];
  for (let y = 0; y < count; y++) {
    ground[y] = [];
    detail[y] = [];
    for (let x = 0; x < count; x++) {
      const t = terrain(x, y);
      let mask = 0;
      if (terrain(x, y - 1) !== t) mask |= 1;
      if (terrain(x + 1, y) !== t) mask |= 2;
      if (terrain(x, y + 1) !== t) mask |= 4;
      if (terrain(x - 1, y) !== t) mask |= 8;
      ground[y][x] =
        t === 0 ? Math.floor(noise(x, y) * 4) : 4 + (t - 1) * 16 + mask;
      const chance = noise(x, y, 3);
      detail[y][x] =
        chance > 0.9
          ? t === 2
            ? 3
            : t === 1
              ? 1
              : Math.floor(noise(x, y, 5) * 3)
          : -1;
    }
  }
  return { ground, detail };
}
export type Decoration = {
  x: number;
  y: number;
  key: string;
  scale: number;
  wind: boolean;
};
// 길/스폰 주변을 피하여 무충돌 수관만 배치합니다. 단단한 나무 밑동은 서버 장애물 위에서만 그립니다.
export function decorations(): Decoration[] {
  const result: Decoration[] = [];
  for (let gy = 1; gy < 25; gy++)
    for (let gx = 1; gx < 25; gx++) {
      if (noise(gx, gy, 11) < 0.76) continue;
      const x = gx * 164 + (noise(gx, gy, 12) - 0.5) * 110,
        y = gy * 164 + (noise(gx, gy, 13) - 0.5) * 110;
      if (
        terrain(Math.floor(x / TILE), Math.floor(y / TILE)) === 1 ||
        Math.hypot(x - 2048, y - 2048) < 240
      )
        continue;
      // 수관만 장식합니다. 단단한 밑동은 새 충돌체를 만들지 않도록 제외합니다.
      result.push({
        x,
        y,
        key: noise(gx, gy, 14) > 0.4 ? "env-oak-canopy" : "env-fir-canopy",
        scale: 0.8 + noise(gx, gy, 15) * 0.65,
        wind: true,
      });
    }
  return result;
}
