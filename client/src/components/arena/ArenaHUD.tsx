import { useArenaStore } from "../../store/arenaStore";
import { useAuthStore } from "../../store/authStore";
import type { ArenaPlayerInfo } from "../../store/arenaStore";

function hpColor(pct: number): string {
  if (pct > 0.5) return "#52c441";
  if (pct > 0.25) return "#f0a000";
  return "#e83030";
}

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  burn:      { label: "BRN", bg: "#c84820", color: "#fff" },
  paralysis: { label: "PAR", bg: "#b89000", color: "#fff" },
  poison:    { label: "PSN", bg: "#8840a8", color: "#fff" },
  sleep:     { label: "SLP", bg: "#607898", color: "#fff" },
  freeze:    { label: "FRZ", bg: "#50a0c0", color: "#fff" },
};

function PlayerEntry({ p }: { p: ArenaPlayerInfo }) {
  const pct = p.pokemon.maxHp > 0 ? p.pokemon.currentHp / p.pokemon.maxHp : 0;
  const alive = p.pokemon.isAlive;
  const statusInfo = p.pokemon.status ? STATUS_LABELS[p.pokemon.status] : null;
  const fill = alive ? hpColor(pct) : "#aaaaaa";

  return (
    <div
      className="flex items-center gap-1"
      style={{ opacity: alive ? 1 : 0.45 }}
    >
      {/* Black left-pointing triangle */}
      <div
        style={{
          width: 0,
          height: 0,
          borderTop: "6px solid transparent",
          borderBottom: "6px solid transparent",
          borderRight: "9px solid #111111",
          flexShrink: 0,
        }}
      />

      {/* Name + HP bar card */}
      <div
        style={{
          background: "rgba(240,232,200,0.94)",
          border: "1.5px solid #888",
          borderRadius: 3,
          padding: "3px 8px 4px 6px",
          minWidth: 148,
          maxWidth: 172,
        }}
      >
        {/* Name row */}
        <div className="flex items-center gap-1 mb-1">
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: "#111",
              lineHeight: 1,
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {p.pokemon.displayName.toUpperCase()}
          </span>
          {statusInfo && (
            <span
              style={{
                fontSize: 8,
                fontFamily: "monospace",
                fontWeight: 700,
                background: statusInfo.bg,
                color: statusInfo.color,
                borderRadius: 2,
                padding: "1px 3px",
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              {statusInfo.label}
            </span>
          )}
        </div>

        {/* HP bar */}
        <div
          style={{
            height: 7,
            background: "#e0e0e0",
            border: "1px solid #999",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.max(0, pct * 100).toFixed(1)}%`,
              background: fill,
              transition: "width 0.15s ease-out, background 0.3s",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function RightPlayerEntry({ p }: { p: ArenaPlayerInfo }) {
  const pct = p.pokemon.maxHp > 0 ? p.pokemon.currentHp / p.pokemon.maxHp : 0;
  const alive = p.pokemon.isAlive;
  const statusInfo = p.pokemon.status ? STATUS_LABELS[p.pokemon.status] : null;
  const fill = alive ? hpColor(pct) : "#aaaaaa";

  return (
    <div
      className="flex items-center gap-1"
      style={{ opacity: alive ? 1 : 0.45, flexDirection: "row-reverse" }}
    >
      {/* Black right-pointing triangle */}
      <div
        style={{
          width: 0,
          height: 0,
          borderTop: "6px solid transparent",
          borderBottom: "6px solid transparent",
          borderLeft: "9px solid #111111",
          flexShrink: 0,
        }}
      />

      {/* Name + HP bar card */}
      <div
        style={{
          background: "rgba(240,232,200,0.94)",
          border: "1.5px solid #888",
          borderRadius: 3,
          padding: "3px 6px 4px 8px",
          minWidth: 148,
          maxWidth: 172,
        }}
      >
        {/* Name row */}
        <div className="flex items-center gap-1 mb-1" style={{ flexDirection: "row-reverse" }}>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: "#111",
              lineHeight: 1,
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textAlign: "right",
            }}
          >
            {p.pokemon.displayName.toUpperCase()}
          </span>
          {statusInfo && (
            <span
              style={{
                fontSize: 8,
                fontFamily: "monospace",
                fontWeight: 700,
                background: statusInfo.bg,
                color: statusInfo.color,
                borderRadius: 2,
                padding: "1px 3px",
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              {statusInfo.label}
            </span>
          )}
        </div>

        {/* HP bar */}
        <div
          style={{
            height: 7,
            background: "#e0e0e0",
            border: "1px solid #999",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.max(0, pct * 100).toFixed(1)}%`,
              background: fill,
              transition: "width 0.15s ease-out, background 0.3s",
            }}
          />
        </div>
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

  const sorted = [...players].sort((a, b) => a.pokemon.x - b.pokemon.x);
  const half = Math.ceil(sorted.length / 2);
  const leftPlayers = sorted.slice(0, half);
  const rightPlayers = sorted.slice(half);

  const alive = players.filter((p) => p.pokemon.isAlive).length;
  const me = players.find((p) => p.userId === user?.id);
  const mePct = me ? me.pokemon.currentHp / me.pokemon.maxHp : 0;
  const meStatus = me?.pokemon.status ? STATUS_LABELS[me.pokemon.status] : null;
  const timeColor =
    timeRemaining > 60000 ? "#22cc22" :
    timeRemaining > 30000 ? "#ddaa00" : "#ff3322";

  return (
    <div className="absolute inset-0 pointer-events-none z-10">

      {/* Left sidebar */}
      <div className="absolute top-0 left-0 flex flex-col gap-1.5 pt-2 pl-1">
        {leftPlayers.map((p) => (
          <PlayerEntry key={p.pokemon.pokemonId} p={p} />
        ))}
      </div>

      {/* Right sidebar — flip the triangle to point right */}
      <div className="absolute top-0 right-0 flex flex-col gap-1.5 pt-2 pr-1" style={{ alignItems: "flex-end" }}>
        {rightPlayers.map((p) => (
          <RightPlayerEntry key={p.pokemon.pokemonId} p={p} />
        ))}
      </div>

      {/* Top center — timer + remaining count */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5">
        <div
          className="text-3xl font-black font-mono"
          style={{ color: timeColor, textShadow: "0 2px 6px rgba(0,0,0,0.55)" }}
        >
          {formatTime(timeRemaining)}
        </div>
        <div
          className="text-[10px] font-bold tracking-widest font-mono"
          style={{
            background: "rgba(240,232,200,0.88)",
            border: "1.5px solid #888",
            borderRadius: 3,
            padding: "1px 8px",
            color: "#333",
          }}
        >
          {alive} / {players.length} REMAINING
        </div>
      </div>

      {/* My Pokemon quick info — DS-style bottom panel */}
      {me && me.pokemon.isAlive && (
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1"
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderTop: "6px solid transparent",
              borderBottom: "6px solid transparent",
              borderRight: "9px solid #111",
              flexShrink: 0,
            }}
          />
          <div
            style={{
              background: "rgba(240,232,200,0.96)",
              border: "1.5px solid #888",
              borderRadius: 3,
              padding: "4px 12px 5px 8px",
              minWidth: 180,
            }}
          >
            <div className="flex items-center gap-1 mb-1">
              <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", color: "#111", flex: 1 }}>
                {me.pokemon.displayName.toUpperCase()}
              </span>
              {meStatus && (
                <span style={{ fontSize: 8, fontFamily: "monospace", fontWeight: 700, background: meStatus.bg, color: meStatus.color, borderRadius: 2, padding: "1px 3px", lineHeight: 1 }}>
                  {meStatus.label}
                </span>
              )}
              <span style={{ fontSize: 9, fontFamily: "monospace", color: "#555", marginLeft: 4 }}>
                {me.pokemon.currentHp}/{me.pokemon.maxHp}
              </span>
            </div>
            <div style={{ height: 7, background: "#e0e0e0", border: "1px solid #999", borderRadius: 2, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.max(0, mePct * 100).toFixed(1)}%`,
                  background: hpColor(mePct),
                  transition: "width 0.15s ease-out, background 0.3s",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Elimination feed — bottom-right */}
      <div className="absolute bottom-12 right-3 flex flex-col-reverse gap-1">
        {eliminations.slice(-4).map((e, i) => (
          <div
            key={i}
            className="text-[10px] font-mono px-2 py-0.5"
            style={{ background: "rgba(240,232,200,0.92)", color: "#cc2200", borderLeft: "2px solid #cc2200", border: "1px solid #999" }}
          >
            ✕ {e.username.toUpperCase()} — #{e.placement}
          </div>
        ))}
      </div>

    </div>
  );
}
