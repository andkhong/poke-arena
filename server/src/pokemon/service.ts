import { db } from "../db";
import type { PokemonSummary } from "@poke-arena/shared";

interface PokemonListOptions {
  page?: number;
  limit?: number;
  gen?: number;
  type?: string;
  search?: string;
}

type DbPokemon = {
  id: number; name: string; displayName: string; types: string[];
  generation: number; spriteUrl: string; backSpriteUrl: string;
  hp: number; attack: number; defense: number;
  specialAtk: number; specialDef: number; speed: number;
};

function toSummary(p: DbPokemon): PokemonSummary {
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

export async function listPokemon(opts: PokemonListOptions = {}) {
  const { page = 1, limit = 30, gen, type, search } = opts;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (gen) where.generation = gen;
  if (type) where.types = { has: type };
  if (search) where.displayName = { contains: search, mode: "insensitive" };

  const [total, rows] = await Promise.all([
    db.pokemon.count({ where }),
    db.pokemon.findMany({
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

export async function getPokemonById(id: number): Promise<PokemonSummary | null> {
  const p = await db.pokemon.findUnique({ where: { id } });
  if (!p) return null;
  return toSummary(p);
}

export async function getRandomMoves(pokemonId: number, count: number) {
  const all = await db.pokemonMove.findMany({
    where: { pokemonId, move: { damageClass: { not: "status" }, power: { not: null } } },
    include: { move: true },
  });

  const status = await db.pokemonMove.findMany({
    where: { pokemonId, move: { damageClass: "status" } },
    include: { move: true },
    take: 5,
  });

  const damaging = all.sort(() => Math.random() - 0.5).slice(0, count - 1);
  const statusPick = status.sort(() => Math.random() - 0.5).slice(0, 1);

  const combined = [...damaging, ...statusPick]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);

  if (combined.length < count) {
    const fallback = await db.pokemonMove.findMany({
      where: { pokemonId },
      include: { move: true },
      take: count,
    });
    return fallback.slice(0, count).map((pm) => pm.move);
  }

  return combined.map((pm) => pm.move);
}
