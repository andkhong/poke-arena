"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArenaRoom = void 0;
exports.generateSpawnPositions = generateSpawnPositions;
const events_1 = require("events");
const shared_1 = require("@poke-arena/shared");
const arenaEngine_1 = require("./arenaEngine");
// Chance per attack to deliberately whiff (use a move with no target) even when an enemy
// is in range. Out-of-range attacks always whiff regardless.
const WHIFF_CHANCE = 0.2;
// Chance per tick to pick a fresh wander destination mid-route (keeps roaming unpredictable).
const WANDER_REROLL_CHANCE = 0.015;
// Ticks a Pokemon stops in place to perform its attack animation (~0.5s at 50ms/tick).
const ATTACK_PAUSE_TICKS = 10;
class ArenaRoom extends events_1.EventEmitter {
    constructor(roomId, players, timeLimit) {
        super();
        this.interval = null;
        this.startTime = 0;
        this.userIdToSocketId = new Map();
        this.wanderTargets = new Map();
        this.attackPause = new Map();
        this.roomId = roomId;
        this.timeLimit = timeLimit;
        this.placementCounter = players.length;
        players.forEach((p) => {
            this.userIdToSocketId.set(p.userId, p.socketId);
        });
        this.state = {
            roomId,
            status: "countdown",
            players,
            tick: 0,
            timeRemaining: timeLimit,
            eliminationOrder: [],
            arenaW: shared_1.ARENA_WIDTH,
            arenaH: shared_1.ARENA_HEIGHT,
        };
    }
    start(countdownMs = 3000) {
        setTimeout(() => {
            this.state.status = "active";
            this.startTime = Date.now();
            this.interval = setInterval(() => this.tick(), shared_1.TICK_RATE_MS);
        }, countdownMs);
    }
    getState() {
        return this.state;
    }
    getSocketIds() {
        return this.state.players.map((p) => p.socketId);
    }
    alivePokemon() {
        return this.state.players
            .map((p) => p.pokemon)
            .filter((pk) => pk.isAlive);
    }
    tick() {
        if (this.state.status !== "active")
            return;
        this.state.tick++;
        this.state.timeRemaining = Math.max(0, this.timeLimit - (Date.now() - this.startTime));
        const alive = this.alivePokemon();
        for (const pokemon of alive) {
            // Decrement cooldown
            if (pokemon.attackCooldown > 0)
                pokemon.attackCooldown--;
            // Tick down the brief pause that follows an attack (stop-in-place to "cast").
            let pause = this.attackPause.get(pokemon.pokemonId) ?? 0;
            if (pause > 0) {
                pause--;
                this.attackPause.set(pokemon.pokemonId, pause);
            }
            // Attack when off cooldown and not mid-animation: a random move aimed at a random
            // enemy in range — or a whiff (no target) if nothing is in range or it swings at air.
            if (pause <= 0 && pokemon.attackCooldown <= 0 && (0, arenaEngine_1.canAttack)(pokemon)) {
                const choice = (0, arenaEngine_1.chooseMove)(pokemon, alive);
                if (choice) {
                    const { move, targets } = choice;
                    const forceWhiff = move.rangeType !== "self" && Math.random() < WHIFF_CHANCE;
                    if (targets.length === 0 || forceWhiff) {
                        this.executeWhiff(pokemon, move);
                    }
                    else {
                        this.executeMove(pokemon, move, targets, alive);
                    }
                    pokemon.attackCooldown = (0, arenaEngine_1.computeInitialCooldown)(pokemon.stats.speed);
                    // Freeze in place so the attack animation plays before it roams again.
                    pause = ATTACK_PAUSE_TICKS;
                    this.attackPause.set(pokemon.pokemonId, pause);
                }
            }
            // Move only when not mid-attack — the Pokemon stops in place to perform its move.
            if (pause <= 0) {
                const effectiveSpeed = pokemon.status === "paralysis"
                    ? Math.floor(pokemon.stats.speed / 2)
                    : pokemon.stats.speed;
                let dest = this.wanderTargets.get(pokemon.pokemonId);
                const arrived = dest != null && Math.hypot(dest.x - pokemon.x, dest.y - pokemon.y) < 40;
                if (dest == null || arrived || Math.random() < WANDER_REROLL_CHANCE) {
                    dest = (0, arenaEngine_1.pickWanderTarget)(pokemon, shared_1.ARENA_WIDTH, shared_1.ARENA_HEIGHT);
                    this.wanderTargets.set(pokemon.pokemonId, dest);
                }
                (0, arenaEngine_1.moveTowardPoint)(pokemon, dest.x, dest.y, effectiveSpeed, shared_1.ARENA_WIDTH, shared_1.ARENA_HEIGHT);
            }
        }
        // End-of-tick status damage
        for (const pokemon of alive) {
            if (pokemon.isAlive)
                (0, arenaEngine_1.applyStatusDamage)(pokemon);
            this.checkElimination(pokemon);
        }
        // Broadcast tick
        const updates = this.state.players
            .filter((p) => p.pokemon.isAlive || this.state.tick % 10 === 0)
            .map((p) => ({
            pokemonId: p.pokemon.pokemonId,
            x: p.pokemon.x,
            y: p.pokemon.y,
            hp: p.pokemon.currentHp,
            status: p.pokemon.status,
            facingRight: p.pokemon.facingRight,
        }));
        this.emit("tick", {
            tick: this.state.tick,
            timeRemaining: this.state.timeRemaining,
            updates,
        });
        // Check end conditions
        const stillAlive = this.alivePokemon();
        if (stillAlive.length <= 1 || this.state.timeRemaining <= 0) {
            this.endArena(stillAlive.length <= 1 ? "lastalive" : "timeout");
        }
    }
    executeWhiff(attacker, move) {
        // Used a move but hit nothing — broadcast so the client shows the banner + an attack
        // thrown into the air. targetPokemonId -1 marks "no target"; missed:false lets the
        // visual effect still fire (it's a whiff, not an accuracy miss).
        this.emit("action", {
            attackerPokemonId: attacker.pokemonId,
            targetPokemonId: -1,
            moveName: move.name,
            moveDisplayName: move.displayName,
            moveType: move.type,
            damageClass: move.damageClass,
            sfx: move.sfx,
            damageDealt: 0,
            effectiveness: 1,
            isCrit: false,
            missed: false,
            statusApplied: null,
            isAoe: move.rangeType === "aoe",
            statChanges: [],
            hpDrained: 0,
        });
    }
    executeMove(attacker, move, targets, _alive) {
        // Face the Pokemon it's striking (cosmetic; damage is position-independent)
        if (targets.length > 0 && targets[0].pokemonId !== attacker.pokemonId) {
            attacker.facingRight = targets[0].x >= attacker.x;
        }
        for (const target of targets) {
            const result = (0, arenaEngine_1.applyAttack)(attacker, target, move);
            this.emit("action", {
                attackerPokemonId: result.attackerPokemonId,
                targetPokemonId: result.targetPokemonId,
                moveName: result.moveName,
                moveDisplayName: move.displayName,
                moveType: result.moveType,
                damageClass: result.damageClass,
                sfx: result.sfx,
                damageDealt: result.damageDealt,
                effectiveness: result.effectiveness,
                isCrit: result.isCrit,
                missed: result.missed,
                statusApplied: result.statusApplied,
                isAoe: result.isAoe,
                statChanges: result.statChanges,
                hpDrained: result.hpDrained,
            });
            this.checkElimination(target);
        }
    }
    checkElimination(pokemon) {
        if (!pokemon.isAlive && pokemon.placement === null) {
            pokemon.placement = this.placementCounter--;
            this.state.eliminationOrder.push({
                pokemonId: pokemon.pokemonId,
                placement: pokemon.placement,
            });
            const player = this.state.players.find((p) => p.pokemon.pokemonId === pokemon.pokemonId);
            this.emit("eliminated", {
                pokemonId: pokemon.pokemonId,
                killedByPokemonId: null,
                killedByUsername: null,
                placement: pokemon.placement,
                username: player?.username ?? "Unknown",
            });
        }
    }
    /** A player leaves early: KO their Pokemon, record the elimination, and end if only one remains. */
    surrender(socketId) {
        if (this.state.status === "ended")
            return;
        const player = this.state.players.find((p) => p.socketId === socketId);
        if (!player || !player.pokemon.isAlive)
            return;
        player.pokemon.isAlive = false;
        player.pokemon.currentHp = 0;
        this.checkElimination(player.pokemon);
        if (this.alivePokemon().length <= 1)
            this.endArena("lastalive");
    }
    endArena(reason) {
        if (this.state.status === "ended")
            return;
        this.state.status = "ended";
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        // Assign remaining placements by HP%
        const remaining = this.alivePokemon().sort((a, b) => b.currentHp / b.maxHp - a.currentHp / a.maxHp);
        let rank = remaining.length;
        for (const pk of remaining) {
            if (pk.placement === null) {
                pk.placement = rank--;
            }
        }
        const rankings = this.state.players
            .map((p) => ({
            userId: p.userId,
            username: p.username,
            pokemonId: p.pokemon.pokemonId,
            pokemonName: p.pokemon.displayName,
            placement: p.pokemon.placement ?? this.state.players.length,
            hpPercent: p.pokemon.maxHp > 0
                ? Math.round((p.pokemon.currentHp / p.pokemon.maxHp) * 100)
                : 0,
        }))
            .sort((a, b) => a.placement - b.placement);
        this.emit("end", { reason, rankings, myNewRecord: null });
    }
    destroy() {
        if (this.interval)
            clearInterval(this.interval);
        this.state.status = "ended";
        this.removeAllListeners();
    }
}
exports.ArenaRoom = ArenaRoom;
// ─── Spawn positions ─────────────────────────────────────────────────────────
function generateSpawnPositions(count) {
    const minX = arenaEngine_1.ARENA_MARGIN_X, maxX = shared_1.ARENA_WIDTH - arenaEngine_1.ARENA_MARGIN_X;
    const minY = arenaEngine_1.ARENA_MARGIN_TOP, maxY = shared_1.ARENA_HEIGHT - arenaEngine_1.ARENA_MARGIN_BOTTOM;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    // Spawn on a ring sized to fit inside the playable region (tighter for 1v1 so they meet).
    const fill = count <= 2 ? 0.42 : 0.82;
    const rx = ((maxX - minX) / 2) * fill;
    const ry = ((maxY - minY) / 2) * fill;
    return Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
        const jr = 1 + (Math.random() - 0.5) * 0.16;
        return {
            x: Math.round(Math.max(minX, Math.min(maxX, cx + rx * jr * Math.cos(angle)))),
            y: Math.round(Math.max(minY, Math.min(maxY, cy + ry * jr * Math.sin(angle)))),
        };
    });
}
