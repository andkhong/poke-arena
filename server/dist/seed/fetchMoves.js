"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedMoves = seedMoves;
const db_1 = require("../db");
const rateLimiter_1 = require("./rateLimiter");
const VALID_CLASSES = new Set(["physical", "special", "status"]);
// PokeAPI target values that map to our range types
function inferRangeType(target, damageClass) {
    if (damageClass === "status" && target === "user")
        return "self";
    if (target === "all-opponents" ||
        target === "all-other-pokemon" ||
        target === "entire-field" ||
        target === "all-pokemon")
        return "aoe";
    if (damageClass === "physical")
        return "melee";
    return "ranged";
}
async function seedMoves() {
    const listRes = await (0, rateLimiter_1.fetchWithRetry)("https://pokeapi.co/api/v2/move?limit=1000");
    const moves = listRes.results;
    console.log(`[Seed] Fetching ${moves.length} moves...`);
    let done = 0;
    const tasks = moves.map(({ url }) => (0, rateLimiter_1.limiter)(async () => {
        try {
            const data = await (0, rateLimiter_1.fetchWithRetry)(url);
            const dc = data.damage_class?.name;
            if (!VALID_CLASSES.has(dc)) {
                done++;
                return;
            }
            // Skip moves with no PP (glitched/unreleased)
            if (!data.pp || data.pp <= 0) {
                done++;
                return;
            }
            const displayName = data.names.find((n) => n.language.name === "en")?.name ?? data.name;
            const statChanges = (data.stat_changes ?? []).map((sc) => ({
                stat: sc.stat.name,
                change: sc.change,
            }));
            await db_1.db.move.upsert({
                where: { id: data.id },
                create: {
                    id: data.id,
                    name: data.name,
                    displayName,
                    type: data.type?.name ?? "normal",
                    damageClass: dc,
                    power: data.power,
                    accuracy: data.accuracy,
                    pp: data.pp,
                    priority: data.priority ?? 0,
                    rangeType: inferRangeType(data.target?.name ?? "selected-pokemon", dc),
                    ailment: data.meta?.ailment?.name !== "none" ? data.meta?.ailment?.name : null,
                    ailmentChance: data.meta?.ailment_chance ?? 0,
                    drain: data.meta?.drain ?? 0,
                    healing: data.meta?.healing ?? 0,
                    critRate: data.meta?.crit_rate ?? 0,
                    statChanges: statChanges,
                    statChance: data.meta?.stat_chance ?? 0,
                },
                update: {
                    displayName,
                    type: data.type?.name ?? "normal",
                    power: data.power,
                    accuracy: data.accuracy,
                    rangeType: inferRangeType(data.target?.name ?? "selected-pokemon", dc),
                },
            });
            done++;
            if (done % 100 === 0)
                console.log(`[Seed] Moves: ${done}/${moves.length}`);
        }
        catch (err) {
            console.error(`[Seed] Failed move ${url}: ${err.message}`);
            done++;
        }
    }));
    await Promise.all(tasks);
    console.log(`[Seed] Moves complete: ${done}/${moves.length}`);
}
