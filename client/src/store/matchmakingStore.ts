import { create } from "zustand";

type QueueStatus = "idle" | "queuing" | "matched";

interface MatchmakingState {
  status: QueueStatus;
  selectedPokemonId: number | null;
  roomId: string | null;
  isBotMatch: boolean;
  setQueuing: (pokemonId: number) => void;
  setBotQueuing: (pokemonId: number) => void;
  setMatched: (roomId: string) => void;
  setIdle: () => void;
}

export const useMatchmakingStore = create<MatchmakingState>((set) => ({
  status: "idle",
  selectedPokemonId: null,
  roomId: null,
  isBotMatch: false,
  setQueuing: (pokemonId) => set({ status: "queuing", selectedPokemonId: pokemonId, isBotMatch: false }),
  setBotQueuing: (pokemonId) => set({ status: "queuing", selectedPokemonId: pokemonId, isBotMatch: true }),
  setMatched: (roomId) => set({ status: "matched", roomId }),
  setIdle: () => set({ status: "idle", selectedPokemonId: null, roomId: null, isBotMatch: false }),
}));
