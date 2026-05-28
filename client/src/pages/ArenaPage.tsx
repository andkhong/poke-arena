import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArenaCanvas } from "../components/arena/ArenaCanvas";
import { ArenaHUD } from "../components/arena/ArenaHUD";
import { MatchmakingModal } from "../components/arena/MatchmakingModal";
import { ArenaResultModal } from "../components/arena/ArenaResultModal";
import { useMatchmakingStore } from "../store/matchmakingStore";
import { useArenaStore } from "../store/arenaStore";
import { getSocket } from "../socket";
import type { ServerToClientEvents } from "@poke-arena/shared";

export function ArenaPage() {
  const navigate = useNavigate();
  const { status, setIdle, isBotMatch, setMatched, selectedPokemonId } = useMatchmakingStore();
  const { result, setMatchStart } = useArenaStore();
  const [socketInfo, setSocketInfo] = useState("checking...");

  // Direct fallback: register queue:start here in case useArenaSocket's listener misses it
  useEffect(() => {
    const socket = getSocket();

    function onQueueStart(payload: Parameters<ServerToClientEvents["queue:start"]>[0]) {
      console.log("[ArenaPage] queue:start received!", payload.roomId, "players=", payload.players.length);
      setMatchStart(payload);
      setMatched(payload.roomId);
    }

    socket.on("queue:start", onQueueStart);
    console.log("[ArenaPage] mounted, queue:start fallback registered. socket.connected=", socket.connected, "id=", socket.id);

    return () => {
      socket.off("queue:start", onQueueStart);
    };
  }, [setMatchStart, setMatched]);

  // Bot-match retry: if still queuing after 5s, re-emit queue:join in case the first was dropped
  useEffect(() => {
    if (status !== "queuing" || !isBotMatch) return;
    const timer = setTimeout(() => {
      const socket = getSocket();
      if (!selectedPokemonId) return;
      console.log("[ArenaPage] bot match retry after 5s, re-emitting queue:join pokemonId=", selectedPokemonId);
      socket.emit("queue:join", { pokemonId: selectedPokemonId, botMatch: true });
    }, 5000);
    return () => clearTimeout(timer);
  }, [status, isBotMatch, selectedPokemonId]);

  useEffect(() => {
    const socket = getSocket();
    const update = () =>
      setSocketInfo(`connected=${socket.connected} id=${socket.id ?? "none"}`);
    update();
    socket.on("connect", update);
    socket.on("disconnect", update);
    return () => { socket.off("connect", update); socket.off("disconnect", update); };
  }, []);

  function handleCancelQueue() {
    getSocket().emit("queue:leave");
    setIdle();
    navigate("/select");
  }

  return (
    <div className="relative w-full h-[calc(100vh-56px)] bg-[#0a0a0f]">
      {/* DEBUG: remove once fixed */}
      <div className="absolute top-1 left-1 z-[999] bg-black/70 text-white text-[10px] px-2 py-1 rounded font-mono pointer-events-none">
        status={status} | {socketInfo}
      </div>

      {status === "matched" && (
        <>
          <ArenaCanvas />
          <ArenaHUD />
        </>
      )}

      {status === "queuing" && (
        <MatchmakingModal onCancel={handleCancelQueue} isBotMatch={isBotMatch} />
      )}

      {result && <ArenaResultModal />}
    </div>
  );
}
