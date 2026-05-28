import { db } from "../db";
import { redis } from "../redis";
import { seedMoves } from "./fetchMoves";
import { seedPokemon } from "./fetchPokemon";

const SEED_LOCK_KEY = "pa:seed:lock";
const MIN_POKEMON_COUNT = 800;

export async function maybeRunSeeder(): Promise<void> {
  // Acquire distributed lock — only one instance seeds
  const locked = await redis.set(SEED_LOCK_KEY, "1", "EX", 86400, "NX");
  if (!locked) {
    console.log("[Seed] Another instance is seeding, skipping.");
    return;
  }

  const count = await db.pokemon.count();
  if (count >= MIN_POKEMON_COUNT) {
    console.log(`[Seed] Already seeded (${count} Pokemon). Skipping.`);
    return;
  }

  console.log("[Seed] Starting seed pipeline...");
  const start = Date.now();

  try {
    await seedMoves();
    await seedPokemon();
    const elapsed = ((Date.now() - start) / 1000 / 60).toFixed(1);
    console.log(`[Seed] Complete in ${elapsed} minutes.`);
  } catch (err) {
    console.error("[Seed] Failed:", err);
    // Release lock so next restart retries
    await redis.del(SEED_LOCK_KEY);
  }
}
