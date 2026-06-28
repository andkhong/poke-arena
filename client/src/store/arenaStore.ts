import { create } from "zustand";
import type {
  BattlePokemon,
  MatchStartPayload,
  ArenaTickPayload,
  ArenaActionPayload,
  ArenaEliminatedPayload,
  ArenaEndPayload,
} from "@poke-arena/shared";

export interface ArenaPlayerInfo {
  userId: string;
  username: string;
  pokemon: BattlePokemon;
  isMe: boolean;
  isAI: boolean;
}

export interface EliminationEvent {
  pokemonId: number;
  username: string;
  placement: number;
  timestamp: number;
}

export interface BattleLogEntry {
  id: number;
  attackerName: string;
  targetName: string;
  moveDisplayName: string;
  moveType: string;
  damageClass: string;
  damageDealt: number;
  effectiveness: number;
  isCrit: boolean;
  missed: boolean;
  isAoe: boolean;
  statusApplied: string | null;
  statChanges: Array<{ stat: string; change: number }>;
  hpDrained: number;
  timestamp: number;
}

export interface PendingAction {
  attackerPokemonId: number;
  targetPokemonId: number;
  moveName: string;
  moveDisplayName: string;
  moveType: string;
  damageClass: string;
  sfx: string | null;
  isAoe: boolean;
  effectiveness: number;
  isCrit: boolean;
  damageDealt: number;
  missed: boolean;
}

interface ArenaState {
  roomId: string | null;
  arenaW: number;
  arenaH: number;
  startsAt: number;
  players: ArenaPlayerInfo[];
  // userIds ordered by spawn x (left→right), captured once at match start so the
  // HUD's column layout stays fixed instead of reshuffling as Pokemon move.
  spawnOrder: string[];
  tick: number;
  timeRemaining: number;
  eliminations: EliminationEvent[];
  battleLog: BattleLogEntry[];
  result: ArenaEndPayload | null;
  pendingActions: PendingAction[];
  _logSeq: number;

  setMatchStart: (payload: MatchStartPayload) => void;
  applyTick: (payload: ArenaTickPayload) => void;
  addAction: (payload: ArenaActionPayload) => void;
  addElimination: (payload: ArenaEliminatedPayload) => void;
  setResult: (payload: ArenaEndPayload) => void;
  clearPendingActions: () => void;
  reset: () => void;
}

const initialState = {
  roomId: null,
  arenaW: 1200,
  arenaH: 800,
  startsAt: 0,
  players: [] as ArenaPlayerInfo[],
  spawnOrder: [] as string[],
  tick: 0,
  timeRemaining: 180000,
  eliminations: [] as EliminationEvent[],
  battleLog: [] as BattleLogEntry[],
  result: null,
  pendingActions: [] as PendingAction[],
  _logSeq: 0,
};

export const useArenaStore = create<ArenaState>((set) => ({
  ...initialState,

  setMatchStart: (payload) =>
    set({
      roomId: payload.roomId,
      arenaW: payload.arenaW,
      arenaH: payload.arenaH,
      startsAt: payload.startsAt,
      players: payload.players,
      spawnOrder: [...payload.players].sort((a, b) => a.pokemon.x - b.pokemon.x).map((p) => p.userId),
      timeRemaining: payload.timeLimit,
      tick: 0,
      eliminations: [],
      battleLog: [],
      result: null,
      pendingActions: [],
      _logSeq: 0,
    }),

  applyTick: (payload) =>
    set((state) => {
      const updatedPlayers = state.players.map((p) => {
        const upd = payload.updates.find((u) => u.pokemonId === p.pokemon.pokemonId);
        if (!upd) return p;
        return {
          ...p,
          pokemon: {
            ...p.pokemon,
            x: upd.x,
            y: upd.y,
            currentHp: upd.hp,
            status: upd.status as BattlePokemon["status"],
            facingRight: upd.facingRight,
            isAlive: upd.hp > 0,
          },
        };
      });
      return { players: updatedPlayers, tick: payload.tick, timeRemaining: payload.timeRemaining };
    }),

  addAction: (payload) =>
    set((state) => {
      const pendingAction: PendingAction = {
        attackerPokemonId: payload.attackerPokemonId,
        targetPokemonId: payload.targetPokemonId,
        moveName: payload.moveName,
        moveDisplayName: payload.moveDisplayName,
        moveType: payload.moveType,
        damageClass: payload.damageClass,
        sfx: payload.sfx,
        isAoe: payload.isAoe,
        effectiveness: payload.effectiveness,
        isCrit: payload.isCrit,
        damageDealt: payload.damageDealt,
        missed: payload.missed,
      };

      // Whiff (no target): still animate the swing, but keep it out of the battle log.
      if (payload.targetPokemonId < 0) {
        return { pendingActions: [...state.pendingActions, pendingAction] };
      }

      const attacker = state.players.find((p) => p.pokemon.pokemonId === payload.attackerPokemonId);
      const target = state.players.find((p) => p.pokemon.pokemonId === payload.targetPokemonId);
      const seq = state._logSeq + 1;
      const logEntry: BattleLogEntry = {
        id: seq,
        attackerName: attacker?.pokemon.displayName ?? `#${payload.attackerPokemonId}`,
        targetName: target?.pokemon.displayName ?? (payload.isAoe ? "All" : `#${payload.targetPokemonId}`),
        moveDisplayName: payload.moveDisplayName,
        moveType: payload.moveType,
        damageClass: payload.damageClass,
        damageDealt: payload.damageDealt,
        effectiveness: payload.effectiveness,
        isCrit: payload.isCrit,
        missed: payload.missed,
        isAoe: payload.isAoe,
        statusApplied: payload.statusApplied,
        statChanges: payload.statChanges ?? [],
        hpDrained: payload.hpDrained ?? 0,
        timestamp: Date.now(),
      };
      return {
        _logSeq: seq,
        battleLog: [logEntry, ...state.battleLog].slice(0, 200),
        pendingActions: [...state.pendingActions, pendingAction],
      };
    }),

  clearPendingActions: () => set({ pendingActions: [] }),

  addElimination: (payload) =>
    set((state) => ({
      eliminations: [
        ...state.eliminations,
        {
          pokemonId: payload.pokemonId,
          username: payload.username,
          placement: payload.placement,
          timestamp: Date.now(),
        },
      ],
    })),

  setResult: (payload) => set({ result: payload }),

  reset: () => set(initialState),
}));
