"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerArenaHandlers = registerArenaHandlers;
const arenaManager_1 = require("../arena/arenaManager");
function registerArenaHandlers(socket) {
    // Leave the room early: the player's Pokemon is KO'd (the room handles the
    // elimination event, placement, and end-of-match check).
    socket.on("arena:surrender", ({ roomId }) => {
        (0, arenaManager_1.getRoom)(roomId)?.surrender(socket.id);
    });
}
