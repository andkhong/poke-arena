import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@poke-arena/shared";
import { redis } from "../redis";
import { db } from "../db";
import { config } from "../config";
import { createRoom, destroyRoom } from "../arena/arenaManager";
import { getRandomMoves } from "../pokemon/service";
import { getCachedPokemonById, getRandomCachedPokemon } from "../cache/pokemonCache";
import { updateLeaderboard } from "../leaderboard/service";

const QUEUE_KEY = "pa:queue";

interface QueueEntry {
  socketId: string;
  userId: string;
  username: string;
  pokemonId: number;
  joinedAt: number;
}

const queueTimers = new Map<string, ReturnType<typeof setTimeout>>();

async function buildHumanPlayer(entry: QueueEntry) {
  const pokemon = await getCachedPokemonById(entry.pokemonId);
  const moves = await getRandomMoves(entry.pokemonId, 4);
  return { ...entry, pokemonData: pokemon!, moves, isAI: false };
}

async function buildAIPlayer(index: number) {
  const pokemon = await getRandomCachedPokemon();
  if (!pokemon) throw new Error("No Pokemon found in cache — cache may not be warmed yet");
  const moves = await getRandomMoves(pokemon.id, 4);
  return {
    socketId: `ai-${index}-${Date.now()}`,
    userId: `ai-${index}`,
    username: `CPU ${pokemon.displayName}`,
    pokemonId: pokemon.id,
    joinedAt: Date.now(),
    pokemonData: pokemon,
    moves,
    isAI: true,
  };
}

type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

function resolveSocket(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socketId: string,
  directSockets: Map<string, IoSocket>
): IoSocket | undefined {
  return directSockets.get(socketId) ?? io.sockets.sockets.get(socketId);
}

async function spawnRoom(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  entries: QueueEntry[],
  withAI: boolean,
  isBotMatch: boolean,
  directSockets: Map<string, IoSocket> = new Map()
): Promise<void> {
  console.log("[spawnRoom] start", { entries: entries.length, withAI, isBotMatch });
  const aiSlots = withAI ? Math.max(0, config.MIN_ARENA_PLAYERS - entries.length) : 0;
  console.log("[spawnRoom] aiSlots", aiSlots);

  const humanPlayers = await Promise.all(entries.map(buildHumanPlayer));
  const aiPlayers = await Promise.all(
    Array.from({ length: aiSlots }, (_, i) => buildAIPlayer(i))
  );

  console.log("[spawnRoom] humanPlayers built", humanPlayers.length, "aiPlayers built", aiPlayers.length);

  const allPlayers = [...humanPlayers, ...aiPlayers].filter((p) => p.pokemonData);
  console.log("[spawnRoom] allPlayers after filter", allPlayers.length);
  if (allPlayers.length < 2) {
    console.log("[spawnRoom] EARLY RETURN — not enough players");
    return;
  }

  const room = createRoom(allPlayers, config.ARENA_TIME_LIMIT_MS);
  const state = room.getState();

  room.on("tick",       (payload) => io.to(room.roomId).emit("arena:tick", payload));
  room.on("action",     (payload) => io.to(room.roomId).emit("arena:action", payload));
  room.on("eliminated", (payload) => io.to(room.roomId).emit("arena:eliminated", payload));

  room.on("end", async (payload) => {
    if (isBotMatch) {
      for (const p of humanPlayers) {
        const socket = resolveSocket(io, p.socketId, directSockets);
        if (socket) socket.emit("arena:end", { ...payload, myNewRecord: null });
      }
    } else {
      await Promise.all(
        humanPlayers.map(async (p) => {
          const isWinner = payload.rankings[0]?.userId === p.userId;
          const user = await db.user.update({
            where: { id: p.userId },
            data: isWinner ? { wins: { increment: 1 } } : { losses: { increment: 1 } },
          });
          await updateLeaderboard(user.id, user.username, user.wins);
          const socket = resolveSocket(io, p.socketId, directSockets);
          if (socket) {
            socket.emit("arena:end", {
              ...payload,
              myNewRecord: { wins: user.wins, losses: user.losses },
            });
          }
        })
      );
    }

    setTimeout(() => destroyRoom(room.roomId), 10_000);
  });

  // Join sockets to room and send start event
  console.log("[spawnRoom] emitting queue:start to", humanPlayers.length, "human players");
  for (const p of humanPlayers) {
    const socket = resolveSocket(io, p.socketId, directSockets);
    console.log("[spawnRoom] socket lookup for", p.socketId, "→", socket ? "found" : "NOT FOUND (checked direct + io.sockets)");
    if (!socket) continue;
    socket.join(room.roomId);
    socket.emit("queue:start", {
      roomId: room.roomId,
      arenaW: state.arenaW,
      arenaH: state.arenaH,
      isBotMatch,
      players: state.players.map((ap) => ({
        userId: ap.userId,
        username: ap.username,
        pokemon: ap.pokemon,
        isMe: ap.userId === p.userId,
        isAI: ap.isAI,
      })),
      timeLimit: config.ARENA_TIME_LIMIT_MS,
      startsAt: Date.now() + 3000,
    });
  }

  room.start(3000);
}

export function setupMatchmaking(
  io: Server<ClientToServerEvents, ServerToClientEvents>
): void {
  async function tryFormRoom(): Promise<void> {
    const queueLen = await redis.llen(QUEUE_KEY);
    if (queueLen < config.MIN_ARENA_PLAYERS) return;

    const pipe = redis.pipeline();
    for (let i = 0; i < config.MAX_ARENA_PLAYERS; i++) pipe.lpop(QUEUE_KEY);
    const results = await pipe.exec();
    const entries: QueueEntry[] = (results ?? [])
      .map((r) => r?.[1])
      .filter(Boolean)
      .map((raw) => { try { return JSON.parse(raw as string) as QueueEntry; } catch { return null; } })
      .filter(Boolean) as QueueEntry[];

    if (entries.length < 2) {
      for (const e of entries) await redis.rpush(QUEUE_KEY, JSON.stringify(e));
      return;
    }
    await spawnRoom(io, entries, false, false);
  }

  (io as unknown as Record<string, unknown>)._tryFormRoom = tryFormRoom;
  (io as unknown as Record<string, unknown>)._spawnRoomWithAI = (entries: QueueEntry[]) =>
    spawnRoom(io, entries, true, false);
}

export async function joinQueue(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  userId: string,
  username: string,
  pokemonId: number
): Promise<void> {
  await leaveQueue(socket.id);

  const entry: QueueEntry = { socketId: socket.id, userId, username, pokemonId, joinedAt: Date.now() };
  await redis.rpush(QUEUE_KEY, JSON.stringify(entry));

  const position = await redis.llen(QUEUE_KEY);
  socket.emit("queue:waiting", { position });

  const tryForm = (io as unknown as Record<string, unknown>)._tryFormRoom as (() => Promise<void>) | undefined;
  if (tryForm) await tryForm();

  if (position === 1) {
    const timerId = setTimeout(async () => {
      const len = await redis.llen(QUEUE_KEY);
      if (len === 0) return;
      const pipe = redis.pipeline();
      for (let i = 0; i < len; i++) pipe.lpop(QUEUE_KEY);
      const results = await pipe.exec();
      const entries: QueueEntry[] = (results ?? [])
        .map((r) => r?.[1])
        .filter(Boolean)
        .map((raw) => { try { return JSON.parse(raw as string) as QueueEntry; } catch { return null; } })
        .filter(Boolean) as QueueEntry[];
      if (entries.length >= 1) {
        const spawnWithAI = (io as unknown as Record<string, unknown>)._spawnRoomWithAI as (e: QueueEntry[]) => Promise<void>;
        await spawnWithAI(entries);
      }
    }, 30_000);
    queueTimers.set("fill", timerId);
  }
}

export async function joinBotMatch(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  userId: string,
  username: string,
  pokemonId: number
): Promise<void> {
  console.log("[bot] joinBotMatch called", { socketId: socket.id, userId, pokemonId });
  const entry: QueueEntry = { socketId: socket.id, userId, username, pokemonId, joinedAt: Date.now() };
  // Pass the socket reference directly — avoids relying on io.sockets.sockets lookup
  const directSockets = new Map([[socket.id, socket]]);
  await spawnRoom(io, [entry], true, true, directSockets);
}

export async function leaveQueue(socketId: string): Promise<void> {
  const raw = await redis.lrange(QUEUE_KEY, 0, -1);
  for (const item of raw) {
    try {
      const entry = JSON.parse(item) as QueueEntry;
      if (entry.socketId === socketId) { await redis.lrem(QUEUE_KEY, 1, item); break; }
    } catch { /* skip */ }
  }
}
