import { db } from "../db";
import { limiter, fetchWithRetry } from "./rateLimiter";
import { MOVES_WITH_SFX } from "./moveSfx";

const VALID_CLASSES = new Set(["physical", "special", "status"]);

// PokeAPI target values that map to our range types
function inferRangeType(target: string, damageClass: string): string {
  if (damageClass === "status" && target === "user") return "self";
  if (
    target === "all-opponents" ||
    target === "all-other-pokemon" ||
    target === "entire-field" ||
    target === "all-pokemon"
  ) return "aoe";
  if (damageClass === "physical") return "melee";
  return "ranged";
}

interface PokeApiMove {
  id: number;
  name: string;
  names: Array<{ language: { name: string }; name: string }>;
  damage_class: { name: string };
  type: { name: string };
  power: number | null;
  accuracy: number | null;
  pp: number;
  priority: number;
  target: { name: string };
  meta: {
    ailment: { name: string };
    ailment_chance: number;
    drain: number;
    healing: number;
    crit_rate: number;
    stat_chance: number;
    min_hits: number | null;
    max_hits: number | null;
    flinch_chance: number;
  } | null;
  stat_changes: Array<{ change: number; stat: { name: string } }>;
}

export async function seedMoves(): Promise<void> {
  const listRes = await fetchWithRetry("https://pokeapi.co/api/v2/move?limit=1000") as {
    results: Array<{ name: string; url: string }>;
  };

  const moves = listRes.results;
  console.log(`[Seed] Fetching ${moves.length} moves...`);

  let done = 0;
  const tasks = moves.map(({ url }) =>
    limiter(async () => {
      try {
        const data = await fetchWithRetry(url) as PokeApiMove;
        const dc = data.damage_class?.name;
        if (!VALID_CLASSES.has(dc)) { done++; return; }
        // Skip moves with no PP (glitched/unreleased)
        if (!data.pp || data.pp <= 0) { done++; return; }

        const displayName =
          data.names.find((n) => n.language.name === "en")?.name ?? data.name;

        const statChanges = (data.stat_changes ?? []).map((sc) => ({
          stat: sc.stat.name,
          change: sc.change,
        }));

        await db.move.upsert({
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
            statChanges: statChanges as object[],
            statChance: data.meta?.stat_chance ?? 0,
            sfx: MOVES_WITH_SFX.has(data.name) ? data.name : null,
          },
          update: {
            displayName,
            type: data.type?.name ?? "normal",
            power: data.power,
            accuracy: data.accuracy,
            rangeType: inferRangeType(data.target?.name ?? "selected-pokemon", dc),
            sfx: MOVES_WITH_SFX.has(data.name) ? data.name : null,
          },
        });

        done++;
        if (done % 100 === 0) console.log(`[Seed] Moves: ${done}/${moves.length}`);
      } catch (err) {
        console.error(`[Seed] Failed move ${url}: ${(err as Error).message}`);
        done++;
      }
    })
  );

  await Promise.all(tasks);
  console.log(`[Seed] Moves complete: ${done}/${moves.length}`);
}
