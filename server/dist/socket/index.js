"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachSocketServer = attachSocketServer;
const socket_io_1 = require("socket.io");
const service_1 = require("../auth/service");
const matchmaking_1 = require("./matchmaking");
const arenaHandler_1 = require("./arenaHandler");
const arenaManager_1 = require("../arena/arenaManager");
const config_1 = require("../config");
function attachSocketServer(httpServer) {
    const corsOrigins = config_1.config.CORS_ORIGIN.split(",").map((s) => s.trim());
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: corsOrigins,
            credentials: true,
        },
    });
    // Auth middleware
    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            next(new Error("Missing token"));
            return;
        }
        try {
            const payload = (0, service_1.verifyToken)(token);
            if (await (0, service_1.isTokenBlocked)(payload.jti)) {
                next(new Error("Token revoked"));
                return;
            }
            socket.userId = payload.sub;
            socket.username = payload.username;
            next();
        }
        catch {
            next(new Error("Invalid token"));
        }
    });
    (0, matchmaking_1.setupMatchmaking)(io);
    io.on("connection", (socket) => {
        const userId = socket.userId;
        const username = socket.username;
        socket.on("queue:join", async ({ pokemonId, botMatch }) => {
            try {
                if (botMatch) {
                    await (0, matchmaking_1.joinBotMatch)(socket, io, userId, username, pokemonId);
                }
                else {
                    await (0, matchmaking_1.joinQueue)(socket, io, userId, username, pokemonId);
                }
            }
            catch (err) {
                socket.emit("error:socket", { code: "QUEUE_ERROR", message: err.message });
            }
        });
        socket.on("queue:leave", async () => {
            await (0, matchmaking_1.leaveQueue)(socket.id);
        });
        socket.on("disconnect", async () => {
            await (0, matchmaking_1.leaveQueue)(socket.id);
            // If they were in an active battle, KO their Pokemon. Tear the room down once no
            // human players remain connected (e.g. they left a bot match).
            const room = (0, arenaManager_1.getRoomBySocketId)(socket.id);
            if (room) {
                room.surrender(socket.id);
                const humansLeft = room.getState().players.some((p) => !p.isAI && p.socketId !== socket.id && io.sockets.sockets.has(p.socketId));
                if (!humansLeft)
                    (0, arenaManager_1.destroyRoom)(room.roomId);
            }
        });
        (0, arenaHandler_1.registerArenaHandlers)(socket);
    });
    return io;
}
