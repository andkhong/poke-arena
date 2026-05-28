"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeaderboard = getLeaderboard;
exports.updateLeaderboard = updateLeaderboard;
const redis_1 = require("../redis");
async function getLeaderboard(limit = 50) {
    const raw = await redis_1.redis.zrevrange("pa:leaderboard", 0, limit - 1, "WITHSCORES");
    const entries = [];
    for (let i = 0; i < raw.length; i += 2) {
        const member = raw[i];
        const score = Number(raw[i + 1]);
        try {
            const parsed = JSON.parse(member);
            entries.push({
                rank: entries.length + 1,
                userId: parsed.userId,
                username: parsed.username,
                wins: score,
            });
        }
        catch {
            // skip malformed entries
        }
    }
    return entries;
}
async function updateLeaderboard(userId, username, wins) {
    const member = JSON.stringify({ userId, username });
    await redis_1.redis.zadd("pa:leaderboard", wins, member);
}
