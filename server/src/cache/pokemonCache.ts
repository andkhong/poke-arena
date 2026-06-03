import { redis } from "../redis";
import { db } from "../db";
import type { Move } from "@prisma/client";

const IDS_KEY = "pa:pokemon:ids";
const pokemonKey = (id: number) => `pa:pokemon:${id}`;
const movesKey = (id: number) => `pa:pokemon:${id}:moves`;
const TTL = 86400; // 24h

export async function warmPokemonCache(): Promise<void> {
  const exists = await redis.exists(IDS_KEY);
  if (exists) {
    console.log("[Cache] Pokemon cache already warm — skipping");
    return;
  }

  console.log("[Cache] Warming Pokemon cache…");
  const allPokemon = await db.pokemon.findMany({
    include: { moves: { include: { move: true } } },
  });

  const pipe = redis.pipeline();
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

export async function getRandomCachedPokemon() {
  const idStr = await redis.srandmember(IDS_KEY);
  if (!idStr) return null;
  const raw = await redis.get(pokemonKey(parseInt(idStr)));
  if (!raw) return null;
  return JSON.parse(raw) as Omit<Awaited<ReturnType<typeof db.pokemon.findUniqueOrThrow>>, "moves">;
}

export async function getCachedPokemonById(id: number) {
  const raw = await redis.get(pokemonKey(id));
  if (raw) return JSON.parse(raw) as Omit<Awaited<ReturnType<typeof db.pokemon.findUniqueOrThrow>>, "moves">;
  return db.pokemon.findUnique({ where: { id } });
}

export async function getCachedMoves(pokemonId: number): Promise<Move[]> {
  const raw = await redis.get(movesKey(pokemonId));
  if (raw) return JSON.parse(raw) as Move[];

  const rows = await db.pokemonMove.findMany({
    where: { pokemonId },
    include: { move: true },
  });
  return rows.map((pm) => pm.move);
}
