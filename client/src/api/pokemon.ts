import { apiClient } from "./client";
import type { PokemonSummary } from "@poke-arena/shared";

interface PokemonListResponse {
  total: number;
  page: number;
  limit: number;
  items: PokemonSummary[];
}

interface PokemonListOptions {
  page?: number;
  limit?: number;
  gen?: number | null;
  type?: string | null;
  search?: string;
}

export async function fetchPokemonList(opts: PokemonListOptions = {}): Promise<PokemonListResponse> {
  const params: Record<string, string | number> = {};
  if (opts.page) params.page = opts.page;
  if (opts.limit) params.limit = opts.limit;
  if (opts.gen) params.gen = opts.gen;
  if (opts.type) params.type = opts.type;
  if (opts.search) params.search = opts.search;
  const { data } = await apiClient.get<PokemonListResponse>("/pokemon", { params });
  return data;
}

export async function fetchPokemonById(id: number): Promise<PokemonSummary> {
  const { data } = await apiClient.get<PokemonSummary>(`/pokemon/${id}`);
  return data;
}
