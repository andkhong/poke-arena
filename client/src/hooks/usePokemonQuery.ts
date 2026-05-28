import { useQuery } from "@tanstack/react-query";
import { fetchPokemonList, fetchPokemonById } from "../api/pokemon";
import { fetchLeaderboard } from "../api/leaderboard";

interface PokemonListFilters {
  page?: number;
  gen?: number | null;
  type?: string | null;
  search?: string;
}

export function usePokemonList(filters: PokemonListFilters = {}) {
  return useQuery({
    queryKey: ["pokemon", filters],
    queryFn: () => fetchPokemonList({ ...filters, limit: 30 }),
    staleTime: 60 * 60 * 1000,
  });
}

export function usePokemonById(id: number | null) {
  return useQuery({
    queryKey: ["pokemon", id],
    queryFn: () => fetchPokemonById(id!),
    enabled: id !== null,
    staleTime: Infinity,
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
