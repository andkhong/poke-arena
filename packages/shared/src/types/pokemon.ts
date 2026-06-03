export interface StatBlock {
  hp: number;
  attack: number;
  defense: number;
  specialAtk: number;
  specialDef: number;
  speed: number;
}

export interface StatStages {
  attack: number;
  defense: number;
  specialAtk: number;
  specialDef: number;
  speed: number;
  accuracy: number;
  evasion: number;
}

export type StatusCondition = "burn" | "paralysis" | "poison" | "sleep" | "freeze";

export type DamageClass = "physical" | "special" | "status";
export type RangeType = "melee" | "ranged" | "aoe" | "self";

export interface MoveData {
  id: number;
  name: string;
  displayName: string;
  type: string;
  damageClass: DamageClass;
  // Per-move sound effect slug; null falls back to the per-type sound (see audio.ts).
  sfx: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number;
  priority: number;
  rangeType: RangeType;
  ailment: string | null;
  ailmentChance: number;
  drain: number;
  healing: number;
  critRate: number;
  statChanges: Array<{ stat: string; change: number }>;
  statChance: number;
}

export interface PokemonSummary {
  id: number;
  name: string;
  displayName: string;
  types: string[];
  generation: number;
  spriteUrl: string;
  backSpriteUrl: string;
  stats: StatBlock;
}

export interface BattlePokemon {
  pokemonId: number;
  name: string;
  displayName: string;
  types: string[];
  spriteUrl: string;
  backSpriteUrl: string;
  stats: StatBlock;
  currentHp: number;
  maxHp: number;
  status: StatusCondition | null;
  statusTurnsLeft: number;
  statStages: StatStages;
  x: number;
  y: number;
  facingRight: boolean;
  attackCooldown: number;
  moves: MoveData[];
  isAlive: boolean;
  placement: number | null;
}
