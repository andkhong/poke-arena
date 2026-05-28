import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArenaCanvas } from "../components/arena/ArenaCanvas";
import { ArenaHUD } from "../components/arena/ArenaHUD";
import { MatchmakingModal } from "../components/arena/MatchmakingModal";
import { ArenaResultModal } from "../components/arena/ArenaResultModal";
import { useMatchmakingStore } from "../store/matchmakingStore";
import { useArenaStore } from "../store/arenaStore";
import { getSocket } from "../socket";
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
  const { result, setMatchStart, startsAt, tick } = useArenaStore();
  const hasFiredRef = useRef(false);

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

  // Bot-match retry: re-emit queue:join if still queuing after 5s
  useEffect(() => {
    if (status !== "queuing" || !isBotMatch || hasFiredRef.current) return;
    const timer = setTimeout(() => {
      const socket = getSocket();
      if (!selectedPokemonId) return;
      hasFiredRef.current = true;
      socket.emit("queue:join", { pokemonId: selectedPokemonId, botMatch: true });
    }, 5000);
    return () => clearTimeout(timer);
  }, [status, isBotMatch, selectedPokemonId]);

  function handleCancelQueue() {
    getSocket().emit("queue:leave");
    setIdle();
    navigate("/select");
  }

  const showCountdown = status === "matched" && tick === 0 && startsAt > Date.now();

  return (
    <div className="relative w-full h-[calc(100vh-56px)]" style={{ background: "#c4a870" }}>
      {status === "matched" && (
        <>
          <ArenaCanvas />
          <ArenaHUD />
          {showCountdown && <BattleCountdown startsAt={startsAt} />}
        </>
      )}

      {status === "queuing" && (
        <MatchmakingModal onCancel={handleCancelQueue} isBotMatch={isBotMatch} />
      )}

      {result && <ArenaResultModal />}
    </div>
  );
}
