"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoom = createRoom;
exports.getRoom = getRoom;
exports.destroyRoom = destroyRoom;
exports.getRoomCount = getRoomCount;
const crypto_1 = require("crypto");
const arenaRoom_1 = require("./arenaRoom");
const arenaEngine_1 = require("./arenaEngine");
const rooms = new Map();
function createRoom(players, timeLimit) {
    const roomId = (0, crypto_1.randomUUID)();
    const positions = (0, arenaRoom_1.generateSpawnPositions)(players.length);
    const arenaPlayers = players.map((p, i) => {
        const pos = positions[i];
        const moveData = p.moves.map((m) => ({
            id: m.id,
            name: m.name,
            displayName: m.displayName,
            type: m.type,
            damageClass: m.damageClass,
            power: m.power,
            accuracy: m.accuracy,
            pp: m.pp,
            priority: m.priority,
            rangeType: m.rangeType,
            ailment: m.ailment,
            ailmentChance: m.ailmentChance,
            drain: m.drain,
            healing: m.healing,
            critRate: m.critRate,
            statChanges: m.statChanges,
            statChance: m.statChance,
        }));
        const pokemon = {
            pokemonId: p.pokemonData.id,
            name: p.pokemonData.name,
            displayName: p.pokemonData.displayName,
            types: p.pokemonData.types,
            spriteUrl: p.pokemonData.spriteUrl,
            backSpriteUrl: p.pokemonData.backSpriteUrl,
            stats: {
                hp: p.pokemonData.hp,
                attack: p.pokemonData.attack,
                defense: p.pokemonData.defense,
                specialAtk: p.pokemonData.specialAtk,
                specialDef: p.pokemonData.specialDef,
                speed: p.pokemonData.speed,
            },
            currentHp: p.pokemonData.hp,
            maxHp: p.pokemonData.hp,
            status: null,
            statusTurnsLeft: 0,
            statStages: (0, arenaEngine_1.defaultStatStages)(),
            x: pos.x,
            y: pos.y,
            facingRight: true,
            attackCooldown: (0, arenaEngine_1.computeInitialCooldown)(p.pokemonData.speed),
            moves: moveData,
            isAlive: true,
            placement: null,
        };
        return {
            userId: p.userId,
            username: p.username,
            socketId: p.socketId,
            pokemon,
            isAI: p.isAI,
        };
    });
    const room = new arenaRoom_1.ArenaRoom(roomId, arenaPlayers, timeLimit);
    rooms.set(roomId, room);
    return room;
}
function getRoom(roomId) {
    return rooms.get(roomId);
}
function destroyRoom(roomId) {
    const room = rooms.get(roomId);
    if (room) {
        room.destroy();
        rooms.delete(roomId);
    }
}
function getRoomCount() {
    return rooms.size;
}
