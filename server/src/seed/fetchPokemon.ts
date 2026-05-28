import { db } from "../db";
import { limiter, fetchWithRetry } from "./rateLimiter";

const MAX_POKEMON_ID = 898;
const GEN5_MAX_ID = 649;

function getSpriteUrl(id: number): { spriteUrl: string; backSpriteUrl: string } {
  const base = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
  if (id <= GEN5_MAX_ID) {
    return {
      spriteUrl: `${base}/versions/generation-v/black-white/animated/${id}.gif`,
      backSpriteUrl: `${base}/versions/generation-v/black-white/animated/back/${id}.gif`,
    };
  }
  return {
    spriteUrl: `${base}/${id}.png`,
    backSpriteUrl: `${base}/back/${id}.png`,
  };
}

function parseGeneration(genName: string): number {
  const map: Record<string, number> = {
    "generation-i": 1, "generation-ii": 2, "generation-iii": 3,
    "generation-iv": 4, "generation-v": 5, "generation-vi": 6,
    "generation-vii": 7, "generation-viii": 8,
  };
  return map[genName] ?? 1;
}

interface PokeApiPokemon {
  id: number;
  name: string;
  is_default: boolean;
  stats: Array<{ base_stat: number; stat: { name: string } }>;
  types: Array<{ type: { name: string } }>;
  moves: Array<{ move: { name: string; url: string } }>;
}

interface PokeApiSpecies {
  names: Array<{ language: { name: string }; name: string }>;
  generation: { name: string };
}

export async function seedPokemon(): Promise<void> {
  // Load known move IDs to filter junction table
  const moveIds = new Set(
    (await db.move.findMany({ select: { id: true } })).map((m) => m.id)
  );

  const listRes = await fetchWithRetry(
    `https://pokeapi.co/api/v2/pokemon?limit=${MAX_POKEMON_ID}`
  ) as { results: Array<{ name: string; url: string }> };

  const entries = listRes.results;
  console.log(`[Seed] Fetching ${entries.length} Pokemon...`);

  let done = 0;

  const tasks = entries.map(({ url }) =>
    limiter(async () => {
      try {
        const data = await fetchWithRetry(url) as PokeApiPokemon;
        if (!data.is_default || data.id > MAX_POKEMON_ID) { done++; return; }

        const speciesUrl = `https://pokeapi.co/api/v2/pokemon-species/${data.id}`;
        const species = await fetchWithRetry(speciesUrl) as PokeApiSpecies;

        const displayName =
          species.names.find((n) => n.language.name === "en")?.name ?? data.name;
        const generation = parseGeneration(species.generation.name);
        const types = data.types.map((t) => t.type.name);
        const sprites = getSpriteUrl(data.id);

        const getStat = (name: string) =>
          data.stats.find((s) => s.stat.name === name)?.base_stat ?? 50;

        await db.pokemon.upsert({
          where: { id: data.id },
          create: {
            id: data.id,
            name: data.name,
            displayName,
            types,
            generation,
            hp: getStat("hp"),
            attack: getStat("attack"),
            defense: getStat("defense"),
            specialAtk: getStat("special-attack"),
            specialDef: getStat("special-defense"),
            speed: getStat("speed"),
            spriteUrl: sprites.spriteUrl,
            backSpriteUrl: sprites.backSpriteUrl,
          },
          update: {
            displayName,
            types,
            spriteUrl: sprites.spriteUrl,
            backSpriteUrl: sprites.backSpriteUrl,
          },
        });

        // Upsert moves junction (only moves we seeded)
        const moveUrls = data.moves.map((m) => m.move.url);
        const moveIdsFromUrls = moveUrls
          .map((u) => parseInt(u.split("/").slice(-2)[0]))
          .filter((id) => !isNaN(id) && moveIds.has(id));

        if (moveIdsFromUrls.length > 0) {
          const uniqueIds = [...new Set(moveIdsFromUrls)];
          await db.$transaction(
            uniqueIds.map((moveId) =>
              db.pokemonMove.upsert({
                where: { pokemonId_moveId: { pokemonId: data.id, moveId } },
                create: { pokemonId: data.id, moveId },
                update: {},
              })
            )
          );
        }

        done++;
        if (done % 50 === 0) console.log(`[Seed] Pokemon: ${done}/${entries.length}`);
      } catch (err) {
        console.error(`[Seed] Failed Pokemon ${url}: ${(err as Error).message}`);
        done++;
      }
    })
  );

  await Promise.all(tasks);
  console.log(`[Seed] Pokemon complete: ${done}/${entries.length}`);
}
