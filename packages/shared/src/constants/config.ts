export const TICK_RATE_MS = 50;
export const BASE_COOLDOWN_TICKS = 60;
export const MOVEMENT_SPEED_BASE = 1.5;
export const ARENA_WIDTH = 1200;
export const ARENA_HEIGHT = 800;
export const POKEMON_LEVEL = 50;
export const MOVES_PER_POKEMON = 4;
export const MELEE_RANGE = 80;
export const RANGED_RANGE = 220;
export const AOE_RANGE = 200;
export const SPAWN_RADIUS = 300;

export const STAT_STAGE_MULTIPLIERS: Record<number, [number, number]> = {
  [-6]: [2, 8],
  [-5]: [2, 7],
  [-4]: [2, 6],
  [-3]: [2, 5],
  [-2]: [2, 4],
  [-1]: [2, 3],
  [0]:  [2, 2],
  [1]:  [3, 2],
  [2]:  [4, 2],
  [3]:  [5, 2],
  [4]:  [6, 2],
  [5]:  [7, 2],
  [6]:  [8, 2],
};
