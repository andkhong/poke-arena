import { create } from "zustand";
import { DEFAULT_BOT_OPPONENTS } from "@poke-arena/shared";

type QueueStatus = "idle" | "queuing" | "matched";

interface MatchmakingState {
  status: QueueStatus;
  selectedPokemonId: number | null;
  roomId: string | null;
  isBotMatch: boolean;
  botOpponents: number;
  setQueuing: (pokemonId: number) => void;
  setBotQueuing: (pokemonId: number, opponents: number) => void;
  setMatched: (roomId: string) => void;
  setIdle: () => void;
}

export const useMatchmakingStore = create<MatchmakingState>((set) => ({
  status: "idle",
  selectedPokemonId: null,
  roomId: null,
  isBotMatch: false,
  botOpponents: DEFAULT_BOT_OPPONENTS,
  setQueuing: (pokemonId) => set({ status: "queuing", selectedPokemonId: pokemonId, isBotMatch: false }),
  setBotQueuing: (pokemonId, opponents) =>
    set({ status: "queuing", selectedPokemonId: pokemonId, isBotMatch: true, botOpponents: opponents }),
  setMatched: (roomId) => set({ status: "matched", roomId }),
  setIdle: () => set({ status: "idle", selectedPokemonId: null, roomId: null, isBotMatch: false }),
}));
