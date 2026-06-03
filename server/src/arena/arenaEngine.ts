import {
  getTypeEffectiveness,
  BASE_COOLDOWN_TICKS,
  MOVEMENT_SPEED_BASE,
  MOVEMENT_SPEED_MIN,
  POKEMON_LEVEL,
  MELEE_RANGE,
  RANGED_RANGE,
  AOE_RANGE,
  STAT_STAGE_MULTIPLIERS,
} from "@poke-arena/shared";
import type { BattlePokemon, MoveData, StatStages, StatusCondition } from "@poke-arena/shared";
import type { ResolvedAction } from "@poke-arena/shared";

// ─── Cooldown ────────────────────────────────────────────────────────────────

export function computeInitialCooldown(speed: number): number {
  return Math.round(BASE_COOLDOWN_TICKS * (100 / Math.max(speed, 1)));
}

// ─── Movement ────────────────────────────────────────────────────────────────

export function computeMovementSpeed(speed: number): number {
  return Math.max(MOVEMENT_SPEED_MIN, MOVEMENT_SPEED_BASE * (speed / 100));
}

export function distanceBetween(a: BattlePokemon, b: BattlePokemon): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function moveToward(
  pokemon: BattlePokemon,
  target: BattlePokemon,
  speed: number,
  arenaW: number,
  arenaH: number
): void {
  const dist = distanceBetween(pokemon, target);
  if (dist === 0) return;
  const step = computeMovementSpeed(speed);
  const ratio = Math.min(step / dist, 1);
  pokemon.x = clamp(pokemon.x + (target.x - pokemon.x) * ratio, 0, arenaW);
  pokemon.y = clamp(pokemon.y + (target.y - pokemon.y) * ratio, 0, arenaH);
  pokemon.facingRight = target.x >= pokemon.x;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ─── Range check ─────────────────────────────────────────────────────────────

export function getAttackRange(move: MoveData): number {
  switch (move.rangeType) {
    case "melee": return MELEE_RANGE;
    case "aoe":   return AOE_RANGE;
    default:      return RANGED_RANGE;
  }
}

export function canReach(attacker: BattlePokemon, target: BattlePokemon, move: MoveData): boolean {
  if (move.rangeType === "self") return true;
  return distanceBetween(attacker, target) <= getAttackRange(move);
}

// ─── Target selection ────────────────────────────────────────────────────────

export function findTargets(
  attacker: BattlePokemon,
  move: MoveData,
  allPokemon: BattlePokemon[]
): BattlePokemon[] {
  const enemies = allPokemon.filter(
    (p) => p.isAlive && p.pokemonId !== attacker.pokemonId
  );

  if (move.rangeType === "self") return [attacker];

  if (move.rangeType === "aoe") {
    return enemies.filter((e) => distanceBetween(attacker, e) <= AOE_RANGE);
  }

  const range = getAttackRange(move);
  const inRange = enemies.filter((e) => distanceBetween(attacker, e) <= range);
  if (inRange.length === 0) return [];

  // Pick nearest target within range
  inRange.sort((a, b) => distanceBetween(attacker, a) - distanceBetween(attacker, b));
  return [inRange[0]];
}

// ─── Damage calculation ───────────────────────────────────────────────────────

function stageMult(stage: number): number {
  const clamped = Math.max(-6, Math.min(6, stage));
  const [num, den] = STAT_STAGE_MULTIPLIERS[clamped];
  return num / den;
}

function effectiveStat(base: number, stage: number): number {
  return Math.max(1, Math.floor(base * stageMult(stage)));
}

export function calculateDamage(
  attacker: BattlePokemon,
  defender: BattlePokemon,
  move: MoveData
): {
  damage: number;
  isCrit: boolean;
  effectiveness: number;
  randomFactor: number;
} {
  if (!move.power || move.damageClass === "status") {
    return { damage: 0, isCrit: false, effectiveness: 1, randomFactor: 1 };
  }

  const isPhysical = move.damageClass === "physical";
  const attackStage = isPhysical
    ? attacker.statStages.attack
    : attacker.statStages.specialAtk;
  const defenseStage = isPhysical
    ? defender.statStages.defense
    : defender.statStages.specialDef;

  const A = effectiveStat(
    isPhysical ? attacker.stats.attack : attacker.stats.specialAtk,
    attackStage
  );
  const D = effectiveStat(
    isPhysical ? defender.stats.defense : defender.stats.specialDef,
    defenseStage
  );

  // Crit check — ignores stat stages
  const critThreshold = move.critRate === 0 ? 1 / 16 : move.critRate === 1 ? 1 / 8 : 1 / 2;
  const isCrit = Math.random() < critThreshold;
  const critA = isCrit
    ? effectiveStat(isPhysical ? attacker.stats.attack : attacker.stats.specialAtk, 0)
    : A;
  const critD = isCrit
    ? effectiveStat(isPhysical ? defender.stats.defense : defender.stats.specialDef, 0)
    : D;

  const rawDamage =
    Math.floor((Math.floor((2 * POKEMON_LEVEL) / 5 + 2) * move.power * critA) / critD / 50) + 2;

  const randomFactor = 0.85 + Math.random() * 0.15;
  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const effectiveness = getTypeEffectiveness(move.type, defender.types);
  const burnMod = attacker.status === "burn" && isPhysical ? 0.5 : 1;

  const damage = Math.max(
    1,
    Math.floor(rawDamage * (isCrit ? 1.5 : 1) * randomFactor * stab * effectiveness * burnMod)
  );

  return { damage, isCrit, effectiveness, randomFactor };
}

// ─── Move selection ───────────────────────────────────────────────────────────

export function chooseMove(
  attacker: BattlePokemon,
  targets: BattlePokemon[],
  allPokemon: BattlePokemon[]
): { move: MoveData; targets: BattlePokemon[] } | null {
  // Filter moves that have valid targets
  const usableMoves = attacker.moves.filter((move) => {
    if (move.rangeType === "self") return true;
    const ts = findTargets(attacker, move, allPokemon);
    return ts.length > 0;
  });

  if (usableMoves.length === 0) return null;

  const move = usableMoves[Math.floor(Math.random() * usableMoves.length)];
  const moveTargets = findTargets(attacker, move, allPokemon);
  return { move, targets: moveTargets };
}

// ─── Apply attack ─────────────────────────────────────────────────────────────

export function applyAttack(
  attacker: BattlePokemon,
  target: BattlePokemon,
  move: MoveData
): ResolvedAction {
  // Accuracy check
  const accuracy = move.accuracy ?? 100;
  const missed = Math.random() * 100 > accuracy;
  if (missed) {
    return {
      attackerPokemonId: attacker.pokemonId,
      targetPokemonId: target.pokemonId,
      moveName: move.name,
      moveType: move.type,
      damageClass: move.damageClass,
      damageDealt: 0,
      effectiveness: 1,
      isCrit: false,
      missed: true,
      statusApplied: null,
      statChanges: [],
      hpDrained: 0,
      isAoe: move.rangeType === "aoe",
    };
  }

  const { damage, isCrit, effectiveness } = calculateDamage(attacker, target, move);

  // Apply damage
  const actualDamage = Math.min(damage, target.currentHp);
  target.currentHp = Math.max(0, target.currentHp - actualDamage);
  if (target.currentHp <= 0) target.isAlive = false;

  // Drain
  let hpDrained = 0;
  if (move.drain > 0 && actualDamage > 0) {
    hpDrained = Math.max(1, Math.floor(actualDamage * (move.drain / 100)));
    attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + hpDrained);
  }

  // Self-healing (recover-type)
  if (move.healing > 0) {
    const heal = Math.floor(attacker.maxHp * (move.healing / 100));
    attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + heal);
  }

  // Status application
  let statusApplied: string | null = null;
  if (
    move.ailment &&
    move.ailment !== "none" &&
    !target.status &&
    target.isAlive &&
    Math.random() * 100 < (move.ailmentChance || 100)
  ) {
    target.status = move.ailment as StatusCondition;
    target.statusTurnsLeft = move.ailment === "sleep" ? 2 + Math.floor(Math.random() * 2) : -1;
    statusApplied = move.ailment;
  }

  // Stat changes
  const appliedStatChanges: Array<{ stat: string; change: number }> = [];
  if (move.statChanges?.length && (move.statChance === 0 || Math.random() * 100 < move.statChance)) {
    for (const sc of move.statChanges) {
      const stageProp = sc.stat as keyof StatStages;
      if (stageProp in attacker.statStages) {
        (attacker.statStages[stageProp] as number) = Math.max(
          -6,
          Math.min(6, (attacker.statStages[stageProp] as number) + sc.change)
        );
        appliedStatChanges.push(sc);
      }
    }
  }

  return {
    attackerPokemonId: attacker.pokemonId,
    targetPokemonId: target.pokemonId,
    moveName: move.name,
    moveType: move.type,
    damageClass: move.damageClass,
    damageDealt: actualDamage,
    effectiveness,
    isCrit,
    missed: false,
    statusApplied,
    statChanges: appliedStatChanges,
    hpDrained,
    isAoe: move.rangeType === "aoe",
  };
}

// ─── End-of-tick status damage ────────────────────────────────────────────────

export function applyStatusDamage(pokemon: BattlePokemon): void {
  if (!pokemon.status || !pokemon.isAlive) return;

  if (pokemon.status === "burn") {
    pokemon.currentHp = Math.max(0, pokemon.currentHp - Math.floor(pokemon.maxHp / 16));
  } else if (pokemon.status === "poison") {
    pokemon.currentHp = Math.max(0, pokemon.currentHp - Math.floor(pokemon.maxHp / 8));
  }

  if (pokemon.currentHp <= 0) pokemon.isAlive = false;
}

// ─── Paralysis / sleep / freeze move skip check ──────────────────────────────

export function canAttack(pokemon: BattlePokemon): boolean {
  if (!pokemon.status) return true;
  if (pokemon.status === "paralysis" && Math.random() < 0.25) return false;
  if (pokemon.status === "sleep") {
    if (pokemon.statusTurnsLeft > 0) {
      pokemon.statusTurnsLeft--;
      return false;
    }
    pokemon.status = null;
  }
  if (pokemon.status === "freeze") {
    if (Math.random() < 0.2) {
      pokemon.status = null;
      return true;
    }
    return false;
  }
  return true;
}

// ─── Initial stat stages ─────────────────────────────────────────────────────

export function defaultStatStages(): StatStages {
  return { attack: 0, defense: 0, specialAtk: 0, specialDef: 0, speed: 0, accuracy: 0, evasion: 0 };
}
