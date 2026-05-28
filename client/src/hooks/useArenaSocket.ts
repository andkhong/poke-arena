import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSocket } from "../socket";
import { useArenaStore } from "../store/arenaStore";
import { useMatchmakingStore } from "../store/matchmakingStore";
import { useAuthStore } from "../store/authStore";
import type { ServerToClientEvents } from "@poke-arena/shared";

export function useArenaSocket() {
  const navigate = useNavigate();
  const { setMatchStart, applyTick, addAction, addElimination, setResult } = useArenaStore();
  const { setMatched, setIdle } = useMatchmakingStore();
  const { updateRecord } = useAuthStore();

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
      registerAll();
    });
    socket.on("connect_error", (err) => console.error("[socket] connect_error", err.message));
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
  }, [navigate, setMatchStart, applyTick, addAction, addElimination, setResult, setMatched, setIdle, updateRecord]);
}
