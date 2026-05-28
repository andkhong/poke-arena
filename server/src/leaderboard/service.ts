import { redis } from "../redis";
import type { LeaderboardEntry } from "@poke-arena/shared";

export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const raw = await redis.zrevrange("pa:leaderboard", 0, limit - 1, "WITHSCORES");
  const entries: LeaderboardEntry[] = [];

  for (let i = 0; i < raw.length; i += 2) {
    const member = raw[i];
    const score = Number(raw[i + 1]);
    try {
      const parsed = JSON.parse(member) as { userId: string; username: string };
      entries.push({
        rank: entries.length + 1,
        userId: parsed.userId,
        username: parsed.username,
        wins: score,
      });
    } catch {
      // skip malformed entries
    }
  }
  return entries;
}

export async function updateLeaderboard(userId: string, username: string, wins: number): Promise<void> {
  const member = JSON.stringify({ userId, username });
  await redis.zadd("pa:leaderboard", wins, member);
}
