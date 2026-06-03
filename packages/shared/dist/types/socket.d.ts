import type { BattlePokemon } from "./pokemon";
import type { ArenaTickUpdate } from "./arena";
export interface QueueJoinPayload {
    pokemonId: number;
    botMatch?: boolean;
}
export interface ArenaSurrenderPayload {
    roomId: string;
}
export interface ClientToServerEvents {
    "queue:join": (payload: QueueJoinPayload) => void;
    "queue:leave": () => void;
    "arena:surrender": (payload: ArenaSurrenderPayload) => void;
}
export interface QueueWaitingPayload {
    position: number;
}
export interface MatchStartPlayer {
    userId: string;
    username: string;
    pokemon: BattlePokemon;
    isMe: boolean;
    isAI: boolean;
}
export interface MatchStartPayload {
    roomId: string;
    arenaW: number;
    arenaH: number;
    players: MatchStartPlayer[];
    timeLimit: number;
    startsAt: number;
    isBotMatch: boolean;
}
export interface ArenaTickPayload {
    tick: number;
    timeRemaining: number;
    updates: ArenaTickUpdate[];
}
export interface ArenaActionPayload {
    attackerPokemonId: number;
    targetPokemonId: number;
    moveName: string;
    moveDisplayName: string;
    moveType: string;
    damageClass: string;
    damageDealt: number;
    effectiveness: number;
    isCrit: boolean;
    missed: boolean;
    statusApplied: string | null;
    isAoe: boolean;
    statChanges: Array<{
        stat: string;
        change: number;
    }>;
    hpDrained: number;
}
export interface ArenaEliminatedPayload {
    pokemonId: number;
    killedByPokemonId: number | null;
    killedByUsername: string | null;
    placement: number;
    username: string;
}
export interface ArenaRankingEntry {
    userId: string;
    username: string;
    pokemonId: number;
    pokemonName: string;
    placement: number;
    hpPercent: number;
}
export interface ArenaEndPayload {
    reason: "lastalive" | "timeout" | "alldisconnected";
    rankings: ArenaRankingEntry[];
    myNewRecord: {
        wins: number;
        losses: number;
    } | null;
}
export interface SocketErrorPayload {
    code: string;
    message: string;
}
export interface ServerToClientEvents {
    "queue:waiting": (payload: QueueWaitingPayload) => void;
    "queue:start": (payload: MatchStartPayload) => void;
    "arena:tick": (payload: ArenaTickPayload) => void;
    "arena:action": (payload: ArenaActionPayload) => void;
    "arena:eliminated": (payload: ArenaEliminatedPayload) => void;
    "arena:end": (payload: ArenaEndPayload) => void;
    "error:socket": (payload: SocketErrorPayload) => void;
}
