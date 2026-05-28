export type PokemonType = "normal" | "fire" | "water" | "electric" | "grass" | "ice" | "fighting" | "poison" | "ground" | "flying" | "psychic" | "bug" | "rock" | "ghost" | "dragon" | "dark" | "steel" | "fairy";
export declare const ALL_TYPES: PokemonType[];
export declare const typeEffectiveness: Record<PokemonType, Partial<Record<PokemonType, number>>>;
export declare function getTypeEffectiveness(attacking: string, defendingTypes: string[]): number;
