import { db } from "../db";
import { getCachedMoves } from "../cache/pokemonCache";
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
  const allMoves = await getCachedMoves(pokemonId);

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
