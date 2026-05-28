import type { BattlePokemon } from "./pokemon";

export type ArenaStatus = "waiting" | "countdown" | "active" | "ended";

export interface ArenaPlayer {
  userId: string;
  username: string;
  socketId: string;
  pokemon: BattlePokemon;
  isAI: boolean;
}

export interface ArenaState {
  roomId: string;
  status: ArenaStatus;
  players: ArenaPlayer[];
  tick: number;
  timeRemaining: number;
  eliminationOrder: Array<{ pokemonId: number; placement: number }>;
  arenaW: number;
  arenaH: number;
}

export interface ArenaTickUpdate {
  pokemonId: number;
  x: number;
  y: number;
  hp: number;
  status: string | null;
  facingRight: boolean;
}

export interface ResolvedAction {
  attackerPokemonId: number;
  targetPokemonId: number;
  moveName: string;
  moveType: string;
  damageClass: string;
  damageDealt: number;
  effectiveness: number;
  isCrit: boolean;
  missed: boolean;
  statusApplied: string | null;
  statChanges: Array<{ stat: string; change: number }>;
  hpDrained: number;
  isAoe: boolean;
}
