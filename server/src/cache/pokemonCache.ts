import { redis } from "../redis";
import { db } from "../db";
import type { Move } from "@prisma/client";

const IDS_KEY = "pa:pokemon:ids";
const pokemonKey = (id: number) => `pa:pokemon:${id}`;
const movesKey = (id: number) => `pa:pokemon:${id}:moves`;

/**
 * Load every Pokemon (and its moves) into Redis. The data is static — seeded once and
 * never changed at runtime — so the cache has NO TTL: expiring it would only risk leaving
 * a long-running server with an empty cache and no way to recover (the cause of the
 * "No Pokemon found in cache" QUEUE_ERROR). `force` re-warms even if the cache looks warm.
 */
export async function warmPokemonCache(force = false): Promise<void> {
  if (!force && (await redis.exists(IDS_KEY))) {
    console.log("[Cache] Pokemon cache already warm — skipping");
    return;
  }

  console.log("[Cache] Warming Pokemon cache…");
  const allPokemon = await db.pokemon.findMany({
    include: { moves: { include: { move: true } } },
  });
  if (allPokemon.length === 0) {
    console.warn("[Cache] No Pokemon in DB to warm — has the database been seeded?");
    return;
  }

  const pipe = redis.pipeline();
  for (const p of allPokemon) {
    const { moves, ...pokemonData } = p;
    pipe.set(pokemonKey(p.id), JSON.stringify(pokemonData));
    pipe.set(movesKey(p.id), JSON.stringify(moves.map((pm) => pm.move)));
    pipe.sadd(IDS_KEY, p.id.toString());
  }
  await pipe.exec();

  console.log(`[Cache] Pokemon cache warmed — ${allPokemon.length} Pokemon loaded`);
}

// Re-warm the cache if it's empty (e.g. Redis was flushed/restarted while the server kept
// running), deduping concurrent callers so we don't run the warm pipeline N times at once.
let warmInFlight: Promise<void> | null = null;
async function ensureWarm(): Promise<void> {
  if (await redis.exists(IDS_KEY)) return;
  if (!warmInFlight) {
    warmInFlight = warmPokemonCache(true).finally(() => { warmInFlight = null; });
  }
  await warmInFlight;
}

export async function getRandomCachedPokemon() {
  await ensureWarm();
  const idStr = await redis.srandmember(IDS_KEY);
  if (!idStr) return null;
  const raw = await redis.get(pokemonKey(parseInt(idStr)));
  if (!raw) return null;
  return JSON.parse(raw) as Omit<Awaited<ReturnType<typeof db.pokemon.findUniqueOrThrow>>, "moves">;
}

/** Returns up to `count` DISTINCT random cached Pokemon, skipping any id in `excludeIds`.
 *  Used to fill an arena with unique species (the battle keys everything by species id,
 *  so duplicates would collide). */
export async function getRandomCachedPokemonMany(count: number, excludeIds: number[] = []) {
  if (count <= 0) return [];
  await ensureWarm();
  const exclude = new Set(excludeIds.map(String));
  // SRANDMEMBER with a positive count returns DISTINCT members; over-fetch so we still
  // have enough candidates after dropping excluded ids.
  const idStrs = await redis.srandmember(IDS_KEY, count + exclude.size + 4);
  const result: Array<Omit<Awaited<ReturnType<typeof db.pokemon.findUniqueOrThrow>>, "moves">> = [];
  for (const idStr of idStrs) {
    if (exclude.has(idStr)) continue;
    const raw = await redis.get(pokemonKey(parseInt(idStr)));
    if (raw) result.push(JSON.parse(raw));
    if (result.length >= count) break;
  }
  return result;
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
