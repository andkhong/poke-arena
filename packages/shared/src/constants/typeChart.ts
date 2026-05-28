export type PokemonType =
  | "normal" | "fire" | "water" | "electric" | "grass" | "ice"
  | "fighting" | "poison" | "ground" | "flying" | "psychic" | "bug"
  | "rock" | "ghost" | "dragon" | "dark" | "steel" | "fairy";

export const ALL_TYPES: PokemonType[] = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy",
];

// typeEffectiveness[attacking][defending] = multiplier
// 0 = immune, 0.5 = not very effective, 1 = normal, 2 = super effective
export const typeEffectiveness: Record<PokemonType, Partial<Record<PokemonType, number>>> = {
  normal:   { rock: 0.5, steel: 0.5, ghost: 0 },
  fire:     { fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5, grass: 2, ice: 2, bug: 2, steel: 2 },
  water:    { water: 0.5, grass: 0.5, dragon: 0.5, fire: 2, ground: 2, rock: 2 },
  electric: { electric: 0.5, grass: 0.5, dragon: 0.5, ground: 0, water: 2, flying: 2 },
  grass:    { fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5, water: 2, ground: 2, rock: 2 },
  ice:      { water: 0.5, ice: 0.5, steel: 0.5, grass: 2, ground: 2, flying: 2, dragon: 2 },
  fighting: { poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, fairy: 0.5, ghost: 0, normal: 2, ice: 2, rock: 2, dark: 2, steel: 2 },
  poison:   { poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, grass: 2, fairy: 2 },
  ground:   { grass: 0.5, bug: 0.5, flying: 0, fire: 2, electric: 2, poison: 2, rock: 2, steel: 2 },
  flying:   { electric: 0.5, rock: 0.5, steel: 0.5, ground: 0, grass: 2, fighting: 2, bug: 2 },
  psychic:  { psychic: 0.5, steel: 0.5, dark: 0, fighting: 2, poison: 2 },
  bug:      { fire: 0.5, fighting: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5, grass: 2, psychic: 2, dark: 2 },
  rock:     { fighting: 0.5, ground: 0.5, steel: 0.5, fire: 2, ice: 2, flying: 2, bug: 2 },
  ghost:    { normal: 0, dark: 0.5, ghost: 2, psychic: 2 },
  dragon:   { steel: 0.5, fairy: 0, dragon: 2 },
  dark:     { fighting: 0.5, dark: 0.5, fairy: 0.5, ghost: 2, psychic: 2 },
  steel:    { fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5, ice: 2, rock: 2, fairy: 2 },
  fairy:    { fire: 0.5, poison: 0.5, steel: 0.5, fighting: 2, dragon: 2, dark: 2 },
};

export function getTypeEffectiveness(attacking: string, defendingTypes: string[]): number {
  const chart = typeEffectiveness[attacking as PokemonType];
  if (!chart) return 1;
  return defendingTypes.reduce((mult, def) => {
    const val = chart[def as PokemonType];
    return mult * (val !== undefined ? val : 1);
  }, 1);
}
