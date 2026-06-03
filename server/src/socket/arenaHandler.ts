import type { Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@poke-arena/shared";
import { getRoom } from "../arena/arenaManager";

export function registerArenaHandlers(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
): void {
  // Leave the room early: the player's Pokemon is KO'd (the room handles the
  // elimination event, placement, and end-of-match check).
  socket.on("arena:surrender", ({ roomId }) => {
    getRoom(roomId)?.surrender(socket.id);
  });
}
