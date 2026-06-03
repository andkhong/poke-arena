"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARENA_MARGIN_BOTTOM = exports.ARENA_MARGIN_TOP = exports.ARENA_MARGIN_X = void 0;
exports.computeInitialCooldown = computeInitialCooldown;
exports.computeMovementSpeed = computeMovementSpeed;
exports.distanceBetween = distanceBetween;
exports.moveTowardPoint = moveTowardPoint;
exports.moveToward = moveToward;
exports.pickWanderTarget = pickWanderTarget;
exports.getAttackRange = getAttackRange;
exports.canReach = canReach;
exports.findTargets = findTargets;
exports.calculateDamage = calculateDamage;
exports.chooseMove = chooseMove;
exports.applyAttack = applyAttack;
exports.applyStatusDamage = applyStatusDamage;
exports.canAttack = canAttack;
exports.defaultStatStages = defaultStatStages;
const shared_1 = require("@poke-arena/shared");
// ─── Playable bounds ──────────────────────────────────────────────────────────
// Pokemon are kept inside these margins so their sprites stay fully on-screen. The top
// margin is the largest because sprites are bottom-anchored and drawn UPWARD (a Pokemon at
// y≈0 would render above the canvas), and the HP bars also sit along the top edge.
exports.ARENA_MARGIN_X = 90;
exports.ARENA_MARGIN_TOP = 190;
exports.ARENA_MARGIN_BOTTOM = 80;
// ─── Cooldown ────────────────────────────────────────────────────────────────
function computeInitialCooldown(speed) {
    return Math.round(shared_1.BASE_COOLDOWN_TICKS * (100 / Math.max(speed, 1)));
}
// ─── Movement ────────────────────────────────────────────────────────────────
function computeMovementSpeed(speed) {
    return Math.max(shared_1.MOVEMENT_SPEED_MIN, shared_1.MOVEMENT_SPEED_BASE * (speed / 100));
}
function distanceBetween(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
function moveTowardPoint(pokemon, tx, ty, speed, arenaW, arenaH) {
    const dx = tx - pokemon.x;
    const dy = ty - pokemon.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0)
        return;
    const step = computeMovementSpeed(speed);
    const ratio = Math.min(step / dist, 1);
    pokemon.x = clamp(pokemon.x + dx * ratio, exports.ARENA_MARGIN_X, arenaW - exports.ARENA_MARGIN_X);
    pokemon.y = clamp(pokemon.y + dy * ratio, exports.ARENA_MARGIN_TOP, arenaH - exports.ARENA_MARGIN_BOTTOM);
    pokemon.facingRight = tx >= pokemon.x;
}
function moveToward(pokemon, target, speed, arenaW, arenaH) {
    moveTowardPoint(pokemon, target.x, target.y, speed, arenaW, arenaH);
}
/** Random roaming point: a 150–400px hop from the current position, kept inside the arena. */
function pickWanderTarget(pokemon, arenaW, arenaH) {
    const angle = Math.random() * 2 * Math.PI;
    const dist = 150 + Math.random() * 250;
    return {
        x: clamp(pokemon.x + Math.cos(angle) * dist, exports.ARENA_MARGIN_X, arenaW - exports.ARENA_MARGIN_X),
        y: clamp(pokemon.y + Math.sin(angle) * dist, exports.ARENA_MARGIN_TOP, arenaH - exports.ARENA_MARGIN_BOTTOM),
    };
}
function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}
// ─── Range check ─────────────────────────────────────────────────────────────
function getAttackRange(move) {
    switch (move.rangeType) {
        case "melee": return shared_1.MELEE_RANGE;
        case "aoe": return shared_1.AOE_RANGE;
        default: return shared_1.RANGED_RANGE;
    }
}
function canReach(attacker, target, move) {
    if (move.rangeType === "self")
        return true;
    return distanceBetween(attacker, target) <= getAttackRange(move);
}
// ─── Target selection ────────────────────────────────────────────────────────
function findTargets(attacker, move, allPokemon) {
    if (move.rangeType === "self")
        return [attacker];
    const enemies = allPokemon.filter((p) => p.isAlive && p.pokemonId !== attacker.pokemonId);
    const range = getAttackRange(move);
    const inRange = enemies.filter((e) => distanceBetween(attacker, e) <= range);
    // AoE hits everything in the vicinity; single-target picks a RANDOM enemy in range
    // (not the nearest), so attacks fan out across whoever is close.
    if (move.rangeType === "aoe")
        return inRange;
    if (inRange.length === 0)
        return [];
    return [inRange[Math.floor(Math.random() * inRange.length)]];
}
// ─── Damage calculation ───────────────────────────────────────────────────────
function stageMult(stage) {
    const clamped = Math.max(-6, Math.min(6, stage));
    const [num, den] = shared_1.STAT_STAGE_MULTIPLIERS[clamped];
    return num / den;
}
function effectiveStat(base, stage) {
    return Math.max(1, Math.floor(base * stageMult(stage)));
}
function calculateDamage(attacker, defender, move) {
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
    const A = effectiveStat(isPhysical ? attacker.stats.attack : attacker.stats.specialAtk, attackStage);
    const D = effectiveStat(isPhysical ? defender.stats.defense : defender.stats.specialDef, defenseStage);
    // Crit check — ignores stat stages
    const critThreshold = move.critRate === 0 ? 1 / 16 : move.critRate === 1 ? 1 / 8 : 1 / 2;
    const isCrit = Math.random() < critThreshold;
    const critA = isCrit
        ? effectiveStat(isPhysical ? attacker.stats.attack : attacker.stats.specialAtk, 0)
        : A;
    const critD = isCrit
        ? effectiveStat(isPhysical ? defender.stats.defense : defender.stats.specialDef, 0)
        : D;
    const rawDamage = Math.floor((Math.floor((2 * shared_1.POKEMON_LEVEL) / 5 + 2) * move.power * critA) / critD / 50) + 2;
    const randomFactor = 0.85 + Math.random() * 0.15;
    const stab = attacker.types.includes(move.type) ? 1.5 : 1;
    const effectiveness = (0, shared_1.getTypeEffectiveness)(move.type, defender.types);
    const burnMod = attacker.status === "burn" && isPhysical ? 0.5 : 1;
    const damage = Math.max(1, Math.floor(rawDamage * (isCrit ? 1.5 : 1) * randomFactor * stab * effectiveness * burnMod));
    return { damage, isCrit, effectiveness, randomFactor };
}
// ─── Move selection ───────────────────────────────────────────────────────────
function chooseMove(attacker, allPokemon) {
    if (attacker.moves.length === 0)
        return null;
    // Pick ANY random move — not filtered by target availability. If nothing is in range
    // the move whiffs (the caller turns an empty target list into an attack-into-the-air).
    const move = attacker.moves[Math.floor(Math.random() * attacker.moves.length)];
    return { move, targets: findTargets(attacker, move, allPokemon) };
}
// ─── Apply attack ─────────────────────────────────────────────────────────────
function applyAttack(attacker, target, move) {
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
            sfx: move.sfx,
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
    if (target.currentHp <= 0)
        target.isAlive = false;
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
    let statusApplied = null;
    if (move.ailment &&
        move.ailment !== "none" &&
        !target.status &&
        target.isAlive &&
        Math.random() * 100 < (move.ailmentChance || 100)) {
        target.status = move.ailment;
        target.statusTurnsLeft = move.ailment === "sleep" ? 2 + Math.floor(Math.random() * 2) : -1;
        statusApplied = move.ailment;
    }
    // Stat changes
    const appliedStatChanges = [];
    if (move.statChanges?.length && (move.statChance === 0 || Math.random() * 100 < move.statChance)) {
        for (const sc of move.statChanges) {
            const stageProp = sc.stat;
            if (stageProp in attacker.statStages) {
                attacker.statStages[stageProp] = Math.max(-6, Math.min(6, attacker.statStages[stageProp] + sc.change));
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
        sfx: move.sfx,
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
function applyStatusDamage(pokemon) {
    if (!pokemon.status || !pokemon.isAlive)
        return;
    if (pokemon.status === "burn") {
        pokemon.currentHp = Math.max(0, pokemon.currentHp - Math.floor(pokemon.maxHp / 16));
    }
    else if (pokemon.status === "poison") {
        pokemon.currentHp = Math.max(0, pokemon.currentHp - Math.floor(pokemon.maxHp / 8));
    }
    if (pokemon.currentHp <= 0)
        pokemon.isAlive = false;
}
// ─── Paralysis / sleep / freeze move skip check ──────────────────────────────
function canAttack(pokemon) {
    if (!pokemon.status)
        return true;
    if (pokemon.status === "paralysis" && Math.random() < 0.25)
        return false;
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
function defaultStatStages() {
    return { attack: 0, defense: 0, specialAtk: 0, specialDef: 0, speed: 0, accuracy: 0, evasion: 0 };
}
