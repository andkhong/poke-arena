import { apiClient } from "./client";
import type { LeaderboardEntry } from "@poke-arena/shared";

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data } = await apiClient.get<LeaderboardEntry[]>("/leaderboard");
  return data;
}
