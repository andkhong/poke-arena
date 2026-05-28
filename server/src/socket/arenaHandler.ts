import type { Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@poke-arena/shared";
import { getRoom, destroyRoom } from "../arena/arenaManager";

export function registerArenaHandlers(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
): void {
  socket.on("arena:surrender", ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room) return;

    const state = room.getState();
    const player = state.players.find((p) => p.socketId === socket.id);
    if (!player) return;

    // Mark their Pokemon as dead
    player.pokemon.isAlive = false;
    player.pokemon.currentHp = 0;
  });
}
