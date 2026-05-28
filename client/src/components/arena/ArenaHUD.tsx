import { useArenaStore } from "../../store/arenaStore";
import { useAuthStore } from "../../store/authStore";
import type { ArenaPlayerInfo } from "../../store/arenaStore";

function hpColor(pct: number): string {
  if (pct > 0.5) return "#22dd22";
  if (pct > 0.25) return "#ddaa00";
  return "#dd2200";
}

function PlayerEntry({ p, side }: { p: ArenaPlayerInfo; side: "left" | "right" }) {
  const pct = p.pokemon.maxHp > 0 ? p.pokemon.currentHp / p.pokemon.maxHp : 0;
  const alive = p.pokemon.isAlive;

  const clip =
    side === "left"
      ? "polygon(0 0, calc(100% - 13px) 0, 100% 50%, calc(100% - 13px) 100%, 0 100%)"
      : "polygon(13px 0, 100% 0, 100% 100%, 13px 100%, 0 50%)";

  return (
    <div
      className="flex flex-col gap-0.5 px-2 pt-1.5 pb-1.5"
      style={{
        background: "rgba(8, 8, 12, 0.88)",
        clipPath: clip,
        paddingRight: side === "left" ? "22px" : "8px",
        paddingLeft: side === "right" ? "22px" : "8px",
        opacity: alive ? 1 : 0.42,
        minWidth: 160,
      }}
    >
      <span
        className="text-[11px] font-bold tracking-wider truncate"
        style={{ fontFamily: "monospace", color: alive ? "#ffffff" : "#888888" }}
      >
        {p.pokemon.displayName.toUpperCase()}
      </span>
      <div
        className="rounded-sm overflow-hidden"
        style={{ height: 8, background: "#333333", width: "100%" }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.max(0, pct * 100).toFixed(1)}%`,
            background: alive ? hpColor(pct) : "#555555",
            transition: "width 0.15s ease-out, background 0.3s",
          }}
        />
      </div>
    </div>
  );
}

function formatTime(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function ArenaHUD() {
  const { players, timeRemaining, eliminations } = useArenaStore();
  const { user } = useAuthStore();

  // Split players into left/right by spawn x position
  const sorted = [...players].sort((a, b) => a.pokemon.x - b.pokemon.x);
  const half = Math.ceil(sorted.length / 2);
  const leftPlayers = sorted.slice(0, half);
  const rightPlayers = sorted.slice(half);

  const alive = players.filter((p) => p.pokemon.isAlive).length;
  const me = players.find((p) => p.userId === user?.id);
  const timeColor =
    timeRemaining > 60000 ? "#22dd22" :
    timeRemaining > 30000 ? "#ddaa00" : "#ff3322";

  return (
    <div className="absolute inset-0 pointer-events-none z-10">

      {/* Left sidebar */}
      <div className="absolute top-0 left-0 flex flex-col gap-1 pt-2">
        {leftPlayers.map((p) => (
          <PlayerEntry key={p.pokemon.pokemonId} p={p} side="left" />
        ))}
      </div>

      {/* Right sidebar */}
      <div className="absolute top-0 right-0 flex flex-col items-end gap-1 pt-2">
        {rightPlayers.map((p) => (
          <PlayerEntry key={p.pokemon.pokemonId} p={p} side="right" />
        ))}
      </div>

      {/* Top center — timer + remaining count */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5">
        <div
          className="text-3xl font-black font-mono"
          style={{ color: timeColor, textShadow: "0 0 8px rgba(0,0,0,0.7)" }}
        >
          {formatTime(timeRemaining)}
        </div>
        <div className="text-[11px] font-bold tracking-widest" style={{ color: "#ddcc88", fontFamily: "monospace" }}>
          {alive} / {players.length} REMAINING
        </div>
      </div>

      {/* My Pokemon quick info — bottom center */}
      {me && me.pokemon.isAlive && (
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 flex items-center gap-3"
          style={{ background: "rgba(8,8,12,0.82)", border: "1px solid #444" }}
        >
          <span className="text-yellow-300 text-xs font-bold font-mono tracking-wider">
            {me.pokemon.displayName.toUpperCase()}
          </span>
          <div className="flex items-center gap-1.5">
            <div style={{ height: 8, width: 100, background: "#333", borderRadius: 2 }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.max(0, (me.pokemon.currentHp / me.pokemon.maxHp) * 100).toFixed(1)}%`,
                  background: hpColor(me.pokemon.currentHp / me.pokemon.maxHp),
                  transition: "width 0.15s ease-out",
                  borderRadius: 2,
                }}
              />
            </div>
            <span className="text-[10px] font-mono" style={{ color: "#aaaaaa" }}>
              {me.pokemon.currentHp}/{me.pokemon.maxHp}
            </span>
          </div>
        </div>
      )}

      {/* Elimination feed — bottom-right */}
      <div className="absolute bottom-12 right-3 flex flex-col-reverse gap-1">
        {eliminations.slice(-4).map((e, i) => (
          <div
            key={i}
            className="text-[10px] font-mono px-2 py-0.5"
            style={{ background: "rgba(8,8,12,0.82)", color: "#ff5544", borderLeft: "2px solid #ff5544" }}
          >
            ✕ {e.username.toUpperCase()} — #{e.placement}
          </div>
        ))}
      </div>

    </div>
  );
}
