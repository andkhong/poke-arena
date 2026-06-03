"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPokemon = listPokemon;
exports.getPokemonById = getPokemonById;
exports.getRandomMoves = getRandomMoves;
const db_1 = require("../db");
const pokemonCache_1 = require("../cache/pokemonCache");
function toSummary(p) {
    return {
        id: p.id,
        name: p.name,
        displayName: p.displayName,
        types: p.types,
        generation: p.generation,
        spriteUrl: p.spriteUrl,
        backSpriteUrl: p.backSpriteUrl,
        stats: {
            hp: p.hp,
            attack: p.attack,
            defense: p.defense,
            specialAtk: p.specialAtk,
            specialDef: p.specialDef,
            speed: p.speed,
        },
    };
}
async function listPokemon(opts = {}) {
    const { page = 1, limit = 30, gen, type, search } = opts;
    const skip = (page - 1) * limit;
    const where = {};
    if (gen)
        where.generation = gen;
    if (type)
        where.types = { has: type };
    if (search)
        where.displayName = { contains: search, mode: "insensitive" };
    const [total, rows] = await Promise.all([
        db_1.db.pokemon.count({ where }),
        db_1.db.pokemon.findMany({
            where,
            skip,
            take: limit,
            orderBy: { id: "asc" },
            select: {
                id: true, name: true, displayName: true, types: true,
                generation: true, spriteUrl: true, backSpriteUrl: true,
                hp: true, attack: true, defense: true,
                specialAtk: true, specialDef: true, speed: true,
            },
        }),
    ]);
    return { total, page, limit, items: rows.map(toSummary) };
}
async function getPokemonById(id) {
    const p = await db_1.db.pokemon.findUnique({ where: { id } });
    if (!p)
        return null;
    return toSummary(p);
}
async function getRandomMoves(pokemonId, count) {
    const allMoves = await (0, pokemonCache_1.getCachedMoves)(pokemonId);
    const damaging = allMoves.filter((m) => m.damageClass !== "status" && m.power != null);
    const status = allMoves.filter((m) => m.damageClass === "status");
    const damagingPick = damaging.sort(() => Math.random() - 0.5).slice(0, count - 1);
    const statusPick = status.sort(() => Math.random() - 0.5).slice(0, 1);
    const combined = [...damagingPick, ...statusPick]
        .sort(() => Math.random() - 0.5)
        .slice(0, count);
    if (combined.length < count) {
        return allMoves.sort(() => Math.random() - 0.5).slice(0, count);
    }
    return combined;
}
