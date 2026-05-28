import { io, Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@poke-arena/shared";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    const token = localStorage.getItem("pa_token");
    socket = io(window.location.origin, {
      auth: { token },
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(token: string): void {
  const s = getSocket();
  s.auth = { token };
  if (!s.connected) s.connect();
}

export function disconnectSocket(): void {
  socket?.disconnect();
  // Keep the singleton — don't null it. connectSocket() will reconnect it with new auth.
  // Nulling here causes useArenaSocket's listeners (registered on the old instance) to
  // go dead when a new socket is created after re-login.
}
