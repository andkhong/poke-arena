"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STAT_STAGE_MULTIPLIERS = exports.SPAWN_RADIUS = exports.AOE_RANGE = exports.RANGED_RANGE = exports.MELEE_RANGE = exports.DEFAULT_BOT_OPPONENTS = exports.MAX_BOT_OPPONENTS = exports.MIN_BOT_OPPONENTS = exports.MOVES_PER_POKEMON = exports.POKEMON_LEVEL = exports.ARENA_HEIGHT = exports.ARENA_WIDTH = exports.MOVEMENT_SPEED_MIN = exports.MOVEMENT_SPEED_BASE = exports.BASE_COOLDOWN_TICKS = exports.TICK_RATE_MS = void 0;
exports.TICK_RATE_MS = 50;
exports.BASE_COOLDOWN_TICKS = 60;
exports.MOVEMENT_SPEED_BASE = 2.0;
exports.MOVEMENT_SPEED_MIN = 0.7;
exports.ARENA_WIDTH = 1200;
exports.ARENA_HEIGHT = 800;
exports.POKEMON_LEVEL = 50;
exports.MOVES_PER_POKEMON = 4;
// Bot-match opponent count: the human picks how many AI Pokemon to face.
exports.MIN_BOT_OPPONENTS = 2;
exports.MAX_BOT_OPPONENTS = 8;
exports.DEFAULT_BOT_OPPONENTS = 7;
exports.MELEE_RANGE = 80;
exports.RANGED_RANGE = 220;
exports.AOE_RANGE = 200;
exports.SPAWN_RADIUS = 300; // used for 8-player; 2-player uses a smaller radius (see arenaRoom)
exports.STAT_STAGE_MULTIPLIERS = {
    [-6]: [2, 8],
    [-5]: [2, 7],
    [-4]: [2, 6],
    [-3]: [2, 5],
    [-2]: [2, 4],
    [-1]: [2, 3],
    [0]: [2, 2],
    [1]: [3, 2],
    [2]: [4, 2],
    [3]: [5, 2],
    [4]: [6, 2],
    [5]: [7, 2],
    [6]: [8, 2],
};
