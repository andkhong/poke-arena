import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MIN_BOT_OPPONENTS, MAX_BOT_OPPONENTS, DEFAULT_BOT_OPPONENTS } from "@poke-arena/shared";
import { PokemonCard } from "../components/pokemon/PokemonCard";
import { PokemonStatPanel } from "../components/pokemon/PokemonStatPanel";
import { GenerationFilter } from "../components/pokemon/GenerationFilter";
import { TypeBadge } from "../components/pokemon/TypeBadge";
import { usePokemonList, usePokemonById } from "../hooks/usePokemonQuery";
import { useMatchmakingStore } from "../store/matchmakingStore";
import { getSocket, connectSocket } from "../socket";
import { useAuthStore } from "../store/authStore";
import type { PokemonSummary } from "@poke-arena/shared";

const ALL_TYPES = [
  "fire","water","grass","electric","ice","fighting","poison",
  "ground","flying","psychic","bug","rock","ghost","dragon","dark","steel","fairy","normal",
];

export function PokemonSelectPage() {
  const navigate = useNavigate();
  const { setQueuing, setBotQueuing } = useMatchmakingStore();
  const { token } = useAuthStore();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [botOpponents, setBotOpponents] = useState(DEFAULT_BOT_OPPONENTS);
  const [gen, setGen] = useState<number | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, isError } = usePokemonList({ page, gen, type, search: debouncedSearch });
  const { data: selectedPokemon } = usePokemonById(selectedId);

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 300);
  }, []);

  function handleSelect(pokemon: PokemonSummary) {
    setSelectedId(pokemon.id === selectedId ? null : pokemon.id);
  }

  function handleEnterArena() {
    if (!selectedId) return;
    if (token) connectSocket(token);
    const socket = getSocket();
    console.log("[arena] emitting queue:join", { pokemonId: selectedId, connected: socket.connected, id: socket.id });
    setQueuing(selectedId);
    socket.emit("queue:join", { pokemonId: selectedId });
    navigate("/arena");
  }

  function handleBotMatch() {
    if (!selectedId) return;
    if (token) connectSocket(token);
    setBotQueuing(selectedId, botOpponents);
    navigate("/arena");
  }

  const OPPONENT_OPTIONS = Array.from(
    { length: MAX_BOT_OPPONENTS - MIN_BOT_OPPONENTS + 1 },
    (_, i) => MIN_BOT_OPPONENTS + i,
  );

  const totalPages = data ? Math.ceil(data.total / 30) : 1;

  return (
    <div className="flex" style={{ height: "calc(100vh - 56px)" }}>
      {/* Left: Pokemon grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-800 space-y-3 bg-[#0f0f1a]">
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search Pokemon..."
            className="w-full bg-[#1a1a2e] border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400"
          />
          <GenerationFilter selected={gen} onChange={(g) => { setGen(g); setPage(1); }} />
          <div className="flex gap-1 flex-wrap">
            {ALL_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => { setType(type === t ? null : t); setPage(1); }}
                style={{ opacity: type && type !== t ? 0.5 : 1 }}
              >
                <TypeBadge type={t} />
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && (
            <div className="text-gray-400 text-center py-12 text-sm">Loading Pokédex...</div>
          )}
          {isError && (
            <div className="text-red-400 text-center py-12 text-sm">
              Failed to load Pokemon. Is the server running?
            </div>
          )}
          {!isLoading && !isError && (
            <div className="grid grid-cols-5 gap-2">
              {data?.items.map((p) => (
                <PokemonCard
                  key={p.id}
                  pokemon={p}
                  selected={selectedId === p.id}
                  onClick={() => handleSelect(p)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && !isLoading && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-gray-700 text-white text-sm rounded disabled:opacity-40 hover:bg-gray-600"
              >
                ← Prev
              </button>
              <span className="text-gray-400 text-sm py-1">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 bg-gray-700 text-white text-sm rounded disabled:opacity-40 hover:bg-gray-600"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: Detail panel */}
      <div className="w-64 border-l border-gray-800 bg-[#0d0d1a] flex flex-col flex-shrink-0">
        {selectedPokemon ? (
          <div className="flex flex-col h-full p-4 space-y-4">
            <div className="text-center">
              <img
                src={selectedPokemon.spriteUrl}
                alt={selectedPokemon.displayName}
                className="mx-auto h-24 object-contain"
                style={{ imageRendering: "pixelated" }}
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  if (!img.src.includes("github")) {
                    img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${selectedPokemon.id}.png`;
                  }
                }}
              />
              <h3 className="text-white font-bold text-lg mt-1">{selectedPokemon.displayName}</h3>
              <p className="text-gray-500 text-xs">
                #{String(selectedPokemon.id).padStart(3, "0")} · Gen {selectedPokemon.generation}
              </p>
              <div className="flex gap-1 justify-center mt-1 flex-wrap">
                {selectedPokemon.types.map((t) => <TypeBadge key={t} type={t} />)}
              </div>
            </div>

            <PokemonStatPanel pokemon={selectedPokemon} />

            <div className="flex-1" />

            <button
              onClick={handleEnterArena}
              className="w-full py-3 bg-yellow-400 text-black font-black text-lg rounded-lg hover:bg-yellow-300 transition"
            >
              ⚔ Enter Arena!
            </button>
            <div>
              <div className="text-gray-400 text-[11px] font-bold tracking-wide mb-1 text-center">
                BOT OPPONENTS
              </div>
              <div className="flex gap-1 justify-center flex-wrap">
                {OPPONENT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setBotOpponents(n)}
                    className={`w-7 h-7 rounded text-sm font-bold transition ${
                      botOpponents === n
                        ? "bg-yellow-400 text-black"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleBotMatch}
              className="w-full py-2 bg-gray-700 text-white font-bold text-sm rounded-lg hover:bg-gray-600 transition"
            >
              vs {botOpponents} Bot{botOpponents > 1 ? "s" : ""}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm text-center px-4">
            Select a Pokemon to see its stats and enter the arena
          </div>
        )}
      </div>
    </div>
  );
}
