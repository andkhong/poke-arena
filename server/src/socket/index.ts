import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@poke-arena/shared";
import { verifyToken, isTokenBlocked } from "../auth/service";
import { setupMatchmaking, joinQueue, joinBotMatch, leaveQueue } from "./matchmaking";
import { registerArenaHandlers } from "./arenaHandler";
import { getRoomBySocketId, destroyRoom } from "../arena/arenaManager";
import { config } from "../config";

export function attachSocketServer(httpServer: HttpServer): Server {
  const corsOrigins = config.CORS_ORIGIN.split(",").map((s) => s.trim());

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
  });

  // Auth middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) { next(new Error("Missing token")); return; }
    try {
      const payload = verifyToken(token);
      if (await isTokenBlocked(payload.jti)) { next(new Error("Token revoked")); return; }
      (socket as unknown as Record<string, unknown>).userId = payload.sub;
      (socket as unknown as Record<string, unknown>).username = payload.username;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  setupMatchmaking(io);

  io.on("connection", (socket) => {
    const userId = (socket as unknown as Record<string, string>).userId;
    const username = (socket as unknown as Record<string, string>).username;

    socket.on("queue:join", async ({ pokemonId, botMatch, opponents }) => {
      try {
        if (botMatch) {
          await joinBotMatch(socket, io, userId, username, pokemonId, opponents);
        } else {
          await joinQueue(socket, io, userId, username, pokemonId);
        }
      } catch (err) {
        socket.emit("error:socket", { code: "QUEUE_ERROR", message: (err as Error).message });
      }
    });

    socket.on("queue:leave", async () => {
      await leaveQueue(socket.id);
    });

    socket.on("disconnect", async () => {
      await leaveQueue(socket.id);
      // If they were in an active battle, KO their Pokemon. Tear the room down once no
      // human players remain connected (e.g. they left a bot match).
      const room = getRoomBySocketId(socket.id);
      if (room) {
        room.surrender(socket.id);
        const humansLeft = room.getState().players.some(
          (p) => !p.isAI && p.socketId !== socket.id && io.sockets.sockets.has(p.socketId)
        );
        if (!humansLeft) destroyRoom(room.roomId);
      }
    });

    registerArenaHandlers(socket);
  });

  return io;
}
