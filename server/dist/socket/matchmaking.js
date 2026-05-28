"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupMatchmaking = setupMatchmaking;
exports.joinQueue = joinQueue;
exports.joinBotMatch = joinBotMatch;
exports.leaveQueue = leaveQueue;
const redis_1 = require("../redis");
const db_1 = require("../db");
const config_1 = require("../config");
const arenaManager_1 = require("../arena/arenaManager");
const service_1 = require("../pokemon/service");
const service_2 = require("../leaderboard/service");
const QUEUE_KEY = "pa:queue";
const queueTimers = new Map();
async function buildHumanPlayer(entry) {
    const pokemon = await db_1.db.pokemon.findUnique({ where: { id: entry.pokemonId } });
    const moves = await (0, service_1.getRandomMoves)(entry.pokemonId, 4);
    return { ...entry, pokemonData: pokemon, moves, isAI: false };
}
async function buildAIPlayer(index) {
    const count = await db_1.db.pokemon.count();
    const skip = Math.floor(Math.random() * count);
    const [pokemon] = await db_1.db.pokemon.findMany({ skip, take: 1 });
    const moves = await (0, service_1.getRandomMoves)(pokemon.id, 4);
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
function resolveSocket(io, socketId, directSockets) {
    return directSockets.get(socketId) ?? io.sockets.sockets.get(socketId);
}
async function spawnRoom(io, entries, withAI, isBotMatch, directSockets = new Map()) {
    console.log("[spawnRoom] start", { entries: entries.length, withAI, isBotMatch });
    const aiSlots = withAI ? Math.max(0, config_1.config.MIN_ARENA_PLAYERS - entries.length) : 0;
    console.log("[spawnRoom] aiSlots", aiSlots);
    const humanPlayers = await Promise.all(entries.map(buildHumanPlayer));
    const aiPlayers = await Promise.all(Array.from({ length: aiSlots }, (_, i) => buildAIPlayer(i)));
    console.log("[spawnRoom] humanPlayers built", humanPlayers.length, "aiPlayers built", aiPlayers.length);
    const allPlayers = [...humanPlayers, ...aiPlayers].filter((p) => p.pokemonData);
    console.log("[spawnRoom] allPlayers after filter", allPlayers.length);
    if (allPlayers.length < 2) {
        console.log("[spawnRoom] EARLY RETURN — not enough players");
        return;
    }
    const room = (0, arenaManager_1.createRoom)(allPlayers, config_1.config.ARENA_TIME_LIMIT_MS);
    const state = room.getState();
    room.on("tick", (payload) => io.to(room.roomId).emit("arena:tick", payload));
    room.on("action", (payload) => io.to(room.roomId).emit("arena:action", payload));
    room.on("eliminated", (payload) => io.to(room.roomId).emit("arena:eliminated", payload));
    room.on("end", async (payload) => {
        if (isBotMatch) {
            for (const p of humanPlayers) {
                const socket = resolveSocket(io, p.socketId, directSockets);
                if (socket)
                    socket.emit("arena:end", { ...payload, myNewRecord: null });
            }
        }
        else {
            await Promise.all(humanPlayers.map(async (p) => {
                const isWinner = payload.rankings[0]?.userId === p.userId;
                const user = await db_1.db.user.update({
                    where: { id: p.userId },
                    data: isWinner ? { wins: { increment: 1 } } : { losses: { increment: 1 } },
                });
                await (0, service_2.updateLeaderboard)(user.id, user.username, user.wins);
                const socket = resolveSocket(io, p.socketId, directSockets);
                if (socket) {
                    socket.emit("arena:end", {
                        ...payload,
                        myNewRecord: { wins: user.wins, losses: user.losses },
                    });
                }
            }));
        }
        setTimeout(() => (0, arenaManager_1.destroyRoom)(room.roomId), 10000);
    });
    // Join sockets to room and send start event
    console.log("[spawnRoom] emitting queue:start to", humanPlayers.length, "human players");
    for (const p of humanPlayers) {
        const socket = resolveSocket(io, p.socketId, directSockets);
        console.log("[spawnRoom] socket lookup for", p.socketId, "→", socket ? "found" : "NOT FOUND (checked direct + io.sockets)");
        if (!socket)
            continue;
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
            timeLimit: config_1.config.ARENA_TIME_LIMIT_MS,
            startsAt: Date.now() + 3000,
        });
    }
    room.start(3000);
}
function setupMatchmaking(io) {
    async function tryFormRoom() {
        const queueLen = await redis_1.redis.llen(QUEUE_KEY);
        if (queueLen < config_1.config.MIN_ARENA_PLAYERS)
            return;
        const pipe = redis_1.redis.pipeline();
        for (let i = 0; i < config_1.config.MAX_ARENA_PLAYERS; i++)
            pipe.lpop(QUEUE_KEY);
        const results = await pipe.exec();
        const entries = (results ?? [])
            .map((r) => r?.[1])
            .filter(Boolean)
            .map((raw) => { try {
            return JSON.parse(raw);
        }
        catch {
            return null;
        } })
            .filter(Boolean);
        if (entries.length < 2) {
            for (const e of entries)
                await redis_1.redis.rpush(QUEUE_KEY, JSON.stringify(e));
            return;
        }
        await spawnRoom(io, entries, false, false);
    }
    io._tryFormRoom = tryFormRoom;
    io._spawnRoomWithAI = (entries) => spawnRoom(io, entries, true, false);
}
async function joinQueue(socket, io, userId, username, pokemonId) {
    await leaveQueue(socket.id);
    const entry = { socketId: socket.id, userId, username, pokemonId, joinedAt: Date.now() };
    await redis_1.redis.rpush(QUEUE_KEY, JSON.stringify(entry));
    const position = await redis_1.redis.llen(QUEUE_KEY);
    socket.emit("queue:waiting", { position });
    const tryForm = io._tryFormRoom;
    if (tryForm)
        await tryForm();
    if (position === 1) {
        const timerId = setTimeout(async () => {
            const len = await redis_1.redis.llen(QUEUE_KEY);
            if (len === 0)
                return;
            const pipe = redis_1.redis.pipeline();
            for (let i = 0; i < len; i++)
                pipe.lpop(QUEUE_KEY);
            const results = await pipe.exec();
            const entries = (results ?? [])
                .map((r) => r?.[1])
                .filter(Boolean)
                .map((raw) => { try {
                return JSON.parse(raw);
            }
            catch {
                return null;
            } })
                .filter(Boolean);
            if (entries.length >= 1) {
                const spawnWithAI = io._spawnRoomWithAI;
                await spawnWithAI(entries);
            }
        }, 30000);
        queueTimers.set("fill", timerId);
    }
}
async function joinBotMatch(socket, io, userId, username, pokemonId) {
    console.log("[bot] joinBotMatch called", { socketId: socket.id, userId, pokemonId });
    const entry = { socketId: socket.id, userId, username, pokemonId, joinedAt: Date.now() };
    // Pass the socket reference directly — avoids relying on io.sockets.sockets lookup
    const directSockets = new Map([[socket.id, socket]]);
    await spawnRoom(io, [entry], true, true, directSockets);
}
async function leaveQueue(socketId) {
    const raw = await redis_1.redis.lrange(QUEUE_KEY, 0, -1);
    for (const item of raw) {
        try {
            const entry = JSON.parse(item);
            if (entry.socketId === socketId) {
                await redis_1.redis.lrem(QUEUE_KEY, 1, item);
                break;
            }
        }
        catch { /* skip */ }
    }
}
