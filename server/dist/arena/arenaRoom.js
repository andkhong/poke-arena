"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArenaRoom = void 0;
exports.generateSpawnPositions = generateSpawnPositions;
const events_1 = require("events");
const shared_1 = require("@poke-arena/shared");
const arenaEngine_1 = require("./arenaEngine");
class ArenaRoom extends events_1.EventEmitter {
    constructor(roomId, players, timeLimit) {
        super();
        this.interval = null;
        this.startTime = 0;
        this.userIdToSocketId = new Map();
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
            // Paralysis speed modifier — effective speed for movement
            const effectiveSpeed = pokemon.status === "paralysis"
                ? Math.floor(pokemon.stats.speed / 2)
                : pokemon.stats.speed;
            const nearest = this.nearestEnemy(pokemon, alive);
            if (!nearest)
                continue;
            // Move toward nearest enemy if out of range of any available move
            const maxRange = Math.max(...pokemon.moves.map((m) => {
                if (m.rangeType === "melee")
                    return 80;
                if (m.rangeType === "aoe")
                    return 200;
                if (m.rangeType === "self")
                    return 0;
                return 220;
            }));
            const dist = Math.sqrt((pokemon.x - nearest.x) ** 2 + (pokemon.y - nearest.y) ** 2);
            if (dist > maxRange) {
                (0, arenaEngine_1.moveToward)(pokemon, nearest, effectiveSpeed, shared_1.ARENA_WIDTH, shared_1.ARENA_HEIGHT);
            }
            else {
                pokemon.facingRight = nearest.x >= pokemon.x;
            }
            // Attack if cooldown ready
            if (pokemon.attackCooldown <= 0 && (0, arenaEngine_1.canAttack)(pokemon)) {
                const choice = (0, arenaEngine_1.chooseMove)(pokemon, alive.filter((p) => p.pokemonId !== pokemon.pokemonId), alive);
                if (choice) {
                    this.executeMove(pokemon, choice.move, choice.targets, alive);
                    pokemon.attackCooldown = (0, arenaEngine_1.computeInitialCooldown)(pokemon.stats.speed);
                }
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
    executeMove(attacker, move, targets, _alive) {
        for (const target of targets) {
            const result = (0, arenaEngine_1.applyAttack)(attacker, target, move);
            this.emit("action", {
                attackerPokemonId: result.attackerPokemonId,
                targetPokemonId: result.targetPokemonId,
                moveName: result.moveName,
                moveDisplayName: move.displayName,
                moveType: result.moveType,
                damageClass: result.damageClass,
                damageDealt: result.damageDealt,
                effectiveness: result.effectiveness,
                isCrit: result.isCrit,
                missed: result.missed,
                statusApplied: result.statusApplied,
                isAoe: result.isAoe,
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
    nearestEnemy(pokemon, alive) {
        const enemies = alive.filter((p) => p.pokemonId !== pokemon.pokemonId);
        if (enemies.length === 0)
            return null;
        return enemies.reduce((nearest, p) => {
            const da = Math.sqrt((p.x - pokemon.x) ** 2 + (p.y - pokemon.y) ** 2);
            const db = Math.sqrt((nearest.x - pokemon.x) ** 2 + (nearest.y - pokemon.y) ** 2);
            return da < db ? p : nearest;
        });
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
    const cx = shared_1.ARENA_WIDTH / 2;
    const cy = shared_1.ARENA_HEIGHT / 2;
    return Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * 2 * Math.PI;
        const jitter = (Math.random() - 0.5) * 80;
        return {
            x: Math.round(cx + (shared_1.SPAWN_RADIUS + jitter) * Math.cos(angle)),
            y: Math.round(cy + (shared_1.SPAWN_RADIUS + jitter) * Math.sin(angle)),
        };
    });
}
