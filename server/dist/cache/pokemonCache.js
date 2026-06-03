"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warmPokemonCache = warmPokemonCache;
exports.getRandomCachedPokemon = getRandomCachedPokemon;
exports.getRandomCachedPokemonMany = getRandomCachedPokemonMany;
exports.getCachedPokemonById = getCachedPokemonById;
exports.getCachedMoves = getCachedMoves;
const redis_1 = require("../redis");
const db_1 = require("../db");
const IDS_KEY = "pa:pokemon:ids";
const pokemonKey = (id) => `pa:pokemon:${id}`;
const movesKey = (id) => `pa:pokemon:${id}:moves`;
const TTL = 86400; // 24h
async function warmPokemonCache() {
    const exists = await redis_1.redis.exists(IDS_KEY);
    if (exists) {
        console.log("[Cache] Pokemon cache already warm — skipping");
        return;
    }
    console.log("[Cache] Warming Pokemon cache…");
    const allPokemon = await db_1.db.pokemon.findMany({
        include: { moves: { include: { move: true } } },
    });
    const pipe = redis_1.redis.pipeline();
    for (const p of allPokemon) {
        const { moves, ...pokemonData } = p;
        pipe.set(pokemonKey(p.id), JSON.stringify(pokemonData), "EX", TTL);
        pipe.set(movesKey(p.id), JSON.stringify(moves.map((pm) => pm.move)), "EX", TTL);
        pipe.sadd(IDS_KEY, p.id.toString());
    }
    pipe.expire(IDS_KEY, TTL);
    await pipe.exec();
    console.log(`[Cache] Pokemon cache warmed — ${allPokemon.length} Pokemon loaded`);
}
async function getRandomCachedPokemon() {
    const idStr = await redis_1.redis.srandmember(IDS_KEY);
    if (!idStr)
        return null;
    const raw = await redis_1.redis.get(pokemonKey(parseInt(idStr)));
    if (!raw)
        return null;
    return JSON.parse(raw);
}
/** Returns up to `count` DISTINCT random cached Pokemon, skipping any id in `excludeIds`.
 *  Used to fill an arena with unique species (the battle keys everything by species id,
 *  so duplicates would collide). */
async function getRandomCachedPokemonMany(count, excludeIds = []) {
    if (count <= 0)
        return [];
    const exclude = new Set(excludeIds.map(String));
    // SRANDMEMBER with a positive count returns DISTINCT members; over-fetch so we still
    // have enough candidates after dropping excluded ids.
    const idStrs = await redis_1.redis.srandmember(IDS_KEY, count + exclude.size + 4);
    const result = [];
    for (const idStr of idStrs) {
        if (exclude.has(idStr))
            continue;
        const raw = await redis_1.redis.get(pokemonKey(parseInt(idStr)));
        if (raw)
            result.push(JSON.parse(raw));
        if (result.length >= count)
            break;
    }
    return result;
}
async function getCachedPokemonById(id) {
    const raw = await redis_1.redis.get(pokemonKey(id));
    if (raw)
        return JSON.parse(raw);
    return db_1.db.pokemon.findUnique({ where: { id } });
}
async function getCachedMoves(pokemonId) {
    const raw = await redis_1.redis.get(movesKey(pokemonId));
    if (raw)
        return JSON.parse(raw);
    const rows = await db_1.db.pokemonMove.findMany({
        where: { pokemonId },
        include: { move: true },
    });
    return rows.map((pm) => pm.move);
}
