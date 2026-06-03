import { randomUUID } from "crypto";
import { ArenaRoom, generateSpawnPositions } from "./arenaRoom";
import { computeInitialCooldown, defaultStatStages } from "./arenaEngine";
import type { ArenaPlayer } from "@poke-arena/shared";
import type { BattlePokemon, MoveData } from "@poke-arena/shared";
import { POKEMON_LEVEL } from "@poke-arena/shared";
import type { Move } from "@prisma/client";

const rooms = new Map<string, ArenaRoom>();

export function createRoom(
  players: Array<{
    userId: string;
    username: string;
    socketId: string;
    pokemonData: {
      id: number;
      name: string;
      displayName: string;
      types: string[];
      spriteUrl: string;
      backSpriteUrl: string;
      hp: number;
      attack: number;
      defense: number;
      specialAtk: number;
      specialDef: number;
      speed: number;
    };
    moves: Move[];
    isAI: boolean;
  }>,
  timeLimit: number
): ArenaRoom {
  const roomId = randomUUID();
  const positions = generateSpawnPositions(players.length);

  const arenaPlayers: ArenaPlayer[] = players.map((p, i) => {
    const pos = positions[i];
    const moveData: MoveData[] = p.moves.map((m) => ({
      id: m.id,
      name: m.name,
      displayName: m.displayName,
      type: m.type,
      damageClass: m.damageClass as MoveData["damageClass"],
      sfx: m.sfx,
      power: m.power,
      accuracy: m.accuracy,
      pp: m.pp,
      priority: m.priority,
      rangeType: m.rangeType as MoveData["rangeType"],
      ailment: m.ailment,
      ailmentChance: m.ailmentChance,
      drain: m.drain,
      healing: m.healing,
      critRate: m.critRate,
      statChanges: m.statChanges as Array<{ stat: string; change: number }>,
      statChance: m.statChance,
    }));

    const pokemon: BattlePokemon = {
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
      currentHp: Math.floor(2 * p.pokemonData.hp * POKEMON_LEVEL / 100) + POKEMON_LEVEL + 10,
      maxHp: Math.floor(2 * p.pokemonData.hp * POKEMON_LEVEL / 100) + POKEMON_LEVEL + 10,
      status: null,
      statusTurnsLeft: 0,
      statStages: defaultStatStages(),
      x: pos.x,
      y: pos.y,
      facingRight: true,
      attackCooldown: computeInitialCooldown(p.pokemonData.speed),
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

  const room = new ArenaRoom(roomId, arenaPlayers, timeLimit);
  rooms.set(roomId, room);
  return room;
}

export function getRoom(roomId: string): ArenaRoom | undefined {
  return rooms.get(roomId);
}

export function getRoomBySocketId(socketId: string): ArenaRoom | undefined {
  for (const room of rooms.values()) {
    if (room.getSocketIds().includes(socketId)) return room;
  }
  return undefined;
}

export function destroyRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (room) {
    room.destroy();
    rooms.delete(roomId);
  }
}

export function getRoomCount(): number {
  return rooms.size;
}
