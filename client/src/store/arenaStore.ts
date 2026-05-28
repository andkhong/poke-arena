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

export interface PendingAction {
  attackerPokemonId: number;
  targetPokemonId: number;
  moveDisplayName: string;
  moveType: string;
  damageClass: string;
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
  tick: number;
  timeRemaining: number;
  eliminations: EliminationEvent[];
  result: ArenaEndPayload | null;
  pendingActions: PendingAction[];

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
  tick: 0,
  timeRemaining: 180000,
  eliminations: [] as EliminationEvent[],
  result: null,
  pendingActions: [] as PendingAction[],
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
      timeRemaining: payload.timeLimit,
      tick: 0,
      eliminations: [],
      result: null,
      pendingActions: [],
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
    set((state) => ({
      pendingActions: [
        ...state.pendingActions,
        {
          attackerPokemonId: payload.attackerPokemonId,
          targetPokemonId: payload.targetPokemonId,
          moveDisplayName: payload.moveDisplayName,
          moveType: payload.moveType,
          damageClass: payload.damageClass,
          isAoe: payload.isAoe,
          effectiveness: payload.effectiveness,
          isCrit: payload.isCrit,
          damageDealt: payload.damageDealt,
          missed: payload.missed,
        },
      ],
    })),

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
