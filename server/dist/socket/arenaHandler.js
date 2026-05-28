"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerArenaHandlers = registerArenaHandlers;
const arenaManager_1 = require("../arena/arenaManager");
function registerArenaHandlers(socket) {
    socket.on("arena:surrender", ({ roomId }) => {
        const room = (0, arenaManager_1.getRoom)(roomId);
        if (!room)
            return;
        const state = room.getState();
        const player = state.players.find((p) => p.socketId === socket.id);
        if (!player)
            return;
        // Mark their Pokemon as dead
        player.pokemon.isAlive = false;
        player.pokemon.currentHp = 0;
    });
}
