import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getSocket, connectSocket } from "../socket";
import { useArenaStore } from "../store/arenaStore";
import { useMatchmakingStore } from "../store/matchmakingStore";
import { useAuthStore } from "../store/authStore";
import type { ServerToClientEvents } from "@poke-arena/shared";

export function useArenaSocket() {
  const navigate = useNavigate();
  const { setMatchStart, applyTick, addAction, addElimination, setResult } = useArenaStore();
  const { setMatched, setIdle } = useMatchmakingStore();
  const { updateRecord, token, logout } = useAuthStore();
  // Guards the connect_error handler so the logout/redirect fires once, not on every retry.
  const handledConnectErrorRef = useRef(false);

  // Connect the socket whenever we have a token. authStore only calls connectSocket() inside
  // login(); on a page refresh the token is rehydrated but never reconnected, so the socket
  // stays disconnected until a match click — and any handshake rejection is then invisible.
  useEffect(() => {
    if (token) connectSocket(token);
  }, [token]);

  useEffect(() => {
    const socket = getSocket();

    function onQueueStart(payload: Parameters<ServerToClientEvents["queue:start"]>[0]) {
      console.log("[socket] queue:start received roomId=", payload.roomId, "isBotMatch=", payload.isBotMatch, "players=", payload.players.length);
      setMatchStart(payload);
      setMatched(payload.roomId);
      // Only navigate if not already on /arena (bot match pre-navigates)
      if (!window.location.pathname.startsWith("/arena")) {
        navigate("/arena");
      }
    }

    function onArenaEnd(payload: Parameters<ServerToClientEvents["arena:end"]>[0]) {
      setResult(payload);
      if (payload.myNewRecord) {
        updateRecord(payload.myNewRecord.wins, payload.myNewRecord.losses);
      }
    }

    function onSocketError(payload: Parameters<ServerToClientEvents["error:socket"]>[0]) {
      console.error("[socket error]", payload.code, payload.message);
      setIdle();
      alert(`Match error (${payload.code}): ${payload.message}`);
    }

    function registerAll() {
      socket.off("queue:start").on("queue:start", onQueueStart);
      socket.off("arena:tick").on("arena:tick", applyTick);
      socket.off("arena:action").on("arena:action", addAction);
      socket.off("arena:eliminated").on("arena:eliminated", addElimination);
      socket.off("arena:end").on("arena:end", onArenaEnd);
      socket.off("error:socket").on("error:socket", onSocketError);
    }

    // Spy: log every event the socket receives so we can trace the pipeline
    const spy = (event: string, ...args: unknown[]) =>
      console.log("[socket:any]", event, args);
    socket.onAny(spy);

    // Register immediately, and re-register after every reconnect so listeners
    // survive socket.disconnect() + socket.connect() cycles (e.g. re-login).
    registerAll();
    socket.on("connect", () => {
      console.log("[socket] connected id=", socket.id);
      handledConnectErrorRef.current = false;
      registerAll();
    });
    function onConnectError(err: Error) {
      console.error("[socket] connect_error", err.message);
      if (handledConnectErrorRef.current) return;
      // Auth rejections from the io.use middleware: "Missing token" / "Invalid token" / "Token revoked".
      if (/token/i.test(err.message)) {
        handledConnectErrorRef.current = true;
        setIdle(); // clear any "queuing" state so the user isn't left on the spinner
        logout(); // drop the stale token and disconnect, stopping the retry loop
        alert("Your session has expired. Please log in again.");
        navigate("/login");
      }
    }
    socket.on("connect_error", onConnectError);
    socket.on("disconnect", (reason) => console.log("[socket] disconnected", reason));

    return () => {
      socket.offAny(spy);
      socket.off("queue:start", onQueueStart);
      socket.off("arena:tick", applyTick);
      socket.off("arena:action", addAction);
      socket.off("arena:eliminated", addElimination);
      socket.off("arena:end", onArenaEnd);
      socket.off("error:socket", onSocketError);
      socket.off("connect");
      socket.off("connect_error");
      socket.off("disconnect");
    };
  }, [navigate, setMatchStart, applyTick, addAction, addElimination, setResult, setMatched, setIdle, updateRecord, logout]);
}
