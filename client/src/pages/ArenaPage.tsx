import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArenaCanvas } from "../components/arena/ArenaCanvas";
import { ArenaHUD } from "../components/arena/ArenaHUD";
import { MatchmakingModal } from "../components/arena/MatchmakingModal";
import { ArenaResultModal } from "../components/arena/ArenaResultModal";
import { BattleLog } from "../components/arena/BattleLog";
import { useMatchmakingStore } from "../store/matchmakingStore";
import { useArenaStore } from "../store/arenaStore";
import { getSocket, disconnectSocket } from "../socket";
import type { ServerToClientEvents } from "@poke-arena/shared";

function BattleCountdown({ startsAt }: { startsAt: number }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      const remaining = startsAt - Date.now();
      if (remaining <= 0) { setCount(null); return; }
      setCount(Math.ceil(remaining / 1000));
    };
    update();
    const id = setInterval(update, 200);
    return () => clearInterval(id);
  }, [startsAt]);

  if (count === null || count <= 0) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
      <div style={{ transform: "skewX(-10deg)" }}>
        <div
          className="px-16 py-3 flex flex-col items-center"
          style={{ background: "#cc1a0a", boxShadow: "4px 4px 0 rgba(0,0,0,0.4)" }}
        >
          <div
            className="text-[11px] font-black tracking-[0.25em] mb-0.5"
            style={{ color: "#ffddcc", fontFamily: "monospace", transform: "skewX(10deg)" }}
          >
            BATTLE STARTS IN
          </div>
          <div
            className="text-6xl font-black leading-none"
            style={{ color: "#ffffff", fontFamily: "monospace", transform: "skewX(10deg)" }}
          >
            {count}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ArenaPage() {
  const navigate = useNavigate();
  const { status, setIdle, isBotMatch, setMatched, selectedPokemonId } = useMatchmakingStore();
  const { result, setMatchStart, startsAt, tick, battleLog } = useArenaStore();
  // Persists across React StrictMode double-invoke so queue:join is only emitted once per mount.
  const botEmittedRef = useRef(false);

  useEffect(() => {
    const socket = getSocket();

    function onQueueStart(payload: Parameters<ServerToClientEvents["queue:start"]>[0]) {
      console.log("[ArenaPage] queue:start received!", payload.roomId, "players=", payload.players.length);
      setMatchStart(payload);
      setMatched(payload.roomId);
    }

    socket.on("queue:start", onQueueStart);
    return () => { socket.off("queue:start", onQueueStart); };
  }, [setMatchStart, setMatched]);

  // Bot-match: emit queue:join as soon as socket is connected. No arbitrary delay —
  // if the socket isn't up yet we listen for the connect event. Fall back to /select
  // after 10s so the user is never stuck on "preparing" forever.
  useEffect(() => {
    if (status !== "queuing" || !isBotMatch || !selectedPokemonId) return;

    // Capture the narrowed (non-null) id so the nested closure keeps the type.
    const pokemonId = selectedPokemonId;
    const socket = getSocket();

    function fireEmit() {
      if (botEmittedRef.current) return;
      botEmittedRef.current = true;
      socket.off("connect", fireEmit);
      console.log("[bot] emitting queue:join pokemonId=", pokemonId, "socketId=", socket.id);
      socket.emit("queue:join", { pokemonId, botMatch: true });
    }

    if (socket.connected) {
      fireEmit();
    } else {
      socket.on("connect", fireEmit);
    }

    const giveUp = setTimeout(() => {
      if (!botEmittedRef.current) {
        socket.off("connect", fireEmit);
        console.warn("[bot] socket never connected — returning to select");
        setIdle();
        navigate("/select");
      }
    }, 10_000);

    return () => {
      clearTimeout(giveUp);
      socket.off("connect", fireEmit);
    };
  }, [status, isBotMatch, selectedPokemonId, setIdle, navigate]);

  function handleCancelQueue() {
    getSocket().emit("queue:leave");
    setIdle();
    navigate("/select");
  }

  // Leave the room early: forfeit (server KO's our Pokemon), disconnect, and return to select.
  function handleLeaveRoom() {
    const roomId = useArenaStore.getState().roomId;
    if (roomId) getSocket().emit("arena:surrender", { roomId });
    disconnectSocket();
    useArenaStore.getState().reset();
    setIdle();
    navigate("/select");
  }

  const showCountdown = status === "matched" && tick === 0 && startsAt > Date.now();

  const showBattleLog = status === "matched" || (result != null && battleLog.length > 0);

  return (
    <div className="relative w-full h-[calc(100vh-56px)]" style={{ background: "#c4a870" }}>
      {status === "matched" && (
        <>
          <ArenaCanvas />
          <ArenaHUD />
          {showCountdown && <BattleCountdown startsAt={startsAt} />}
          {!result && (
            <button
              onClick={handleLeaveRoom}
              className="absolute top-[76px] left-1/2 -translate-x-1/2 z-40 px-3 py-1 text-xs font-bold font-mono rounded text-white transition hover:brightness-110"
              style={{ background: "rgba(180,30,20,0.92)", border: "1px solid rgba(0,0,0,0.45)", boxShadow: "1px 1px 0 rgba(0,0,0,0.3)" }}
            >
              ⤶ LEAVE MATCH
            </button>
          )}
        </>
      )}

      {status === "queuing" && (
        <MatchmakingModal onCancel={handleCancelQueue} isBotMatch={isBotMatch} />
      )}

      {/* BattleLog persists through result modal so user can review */}
      {showBattleLog && <BattleLog />}

      {result && <ArenaResultModal />}
    </div>
  );
}
