"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybeRunSeeder = maybeRunSeeder;
const db_1 = require("../db");
const redis_1 = require("../redis");
const fetchMoves_1 = require("./fetchMoves");
const fetchPokemon_1 = require("./fetchPokemon");
const SEED_LOCK_KEY = "pa:seed:lock";
const MIN_POKEMON_COUNT = 800;
async function maybeRunSeeder() {
    // Acquire distributed lock — only one instance seeds
    const locked = await redis_1.redis.set(SEED_LOCK_KEY, "1", "EX", 86400, "NX");
    if (!locked) {
        console.log("[Seed] Another instance is seeding, skipping.");
        return;
    }
    const count = await db_1.db.pokemon.count();
    if (count >= MIN_POKEMON_COUNT) {
        console.log(`[Seed] Already seeded (${count} Pokemon). Skipping.`);
        return;
    }
    console.log("[Seed] Starting seed pipeline...");
    const start = Date.now();
    try {
        await (0, fetchMoves_1.seedMoves)();
        await (0, fetchPokemon_1.seedPokemon)();
        const elapsed = ((Date.now() - start) / 1000 / 60).toFixed(1);
        console.log(`[Seed] Complete in ${elapsed} minutes.`);
    }
    catch (err) {
        console.error("[Seed] Failed:", err);
        // Release lock so next restart retries
        await redis_1.redis.del(SEED_LOCK_KEY);
    }
}
