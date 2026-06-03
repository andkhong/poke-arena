import { useEffect, useRef, useState } from "react";
import { useArenaStore } from "../../store/arenaStore";
import { useAuthStore } from "../../store/authStore";
import type { ArenaPlayerInfo } from "../../store/arenaStore";

// Classic Gen 1/2 HP bar: a two-tone colored fill (lighter top, darker bottom) that
// steps green → amber → red as HP drops.
const HP_TIERS = {
  high: { top: "#74c034", bottom: "#4e8c1e" },
  mid:  { top: "#f4a020", bottom: "#c06c0c" },
  low:  { top: "#e83c2c", bottom: "#a81c12" },
};

function hpTier(pct: number) {
  if (pct > 0.5) return HP_TIERS.high;
  if (pct > 0.2) return HP_TIERS.mid;
  return HP_TIERS.low;
}

const FRAME = "#181c22"; // near-black border for the bar + wedge
const BOX_BG = "rgba(242,233,200,0.96)";
const BOX_BORDER = "#22262e";

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  burn:      { label: "BRN", bg: "#c84820", color: "#fff" },
  paralysis: { label: "PAR", bg: "#b89000", color: "#fff" },
  poison:    { label: "PSN", bg: "#8840a8", color: "#fff" },
  sleep:     { label: "SLP", bg: "#607898", color: "#fff" },
  freeze:    { label: "FRZ", bg: "#50a0c0", color: "#fff" },
};

const ALIVE_NAMES = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE"];

/** Gen 1/2-style HP bar: dark frame, light track, two-tone fill. Shows "OUT" over a
 *  greyed track when the Pokemon has fainted. */
function HPBar({ pct, alive }: { pct: number; alive: boolean }) {
  const tier = hpTier(pct);
  const width = Math.max(0, Math.min(100, pct * 100));
  return (
    <div style={{ background: FRAME, borderRadius: 1, padding: 1 }}>
      <div
        style={{
          position: "relative",
          height: 8,
          background: alive ? "#c4c2a8" : "#a8a698",
          overflow: "hidden",
        }}
      >
        {alive ? (
          <div
            style={{
              height: "100%",
              width: `${width.toFixed(1)}%`,
              background: `linear-gradient(180deg, ${tier.top} 0%, ${tier.top} 50%, ${tier.bottom} 50%, ${tier.bottom} 100%)`,
              transition: "width 0.2s ease-out, background 0.3s",
            }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span
              style={{
                fontFamily: "monospace", fontSize: 9, fontWeight: 900,
                letterSpacing: "0.14em", color: "#d81818", lineHeight: 1,
                textShadow: "0 1px 0 rgba(255,255,255,0.35)",
              }}
            >
              OUT
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Bold black wedge that points toward the arena (right for the left column, left for the right). */
function Wedge({ dir }: { dir: "left" | "right" }) {
  return (
    <div
      style={{
        width: 0, height: 0, flexShrink: 0, alignSelf: "center",
        borderTop: "15px solid transparent",
        borderBottom: "15px solid transparent",
        ...(dir === "right"
          ? { borderLeft: `13px solid ${FRAME}` }
          : { borderRight: `13px solid ${FRAME}` }),
      }}
    />
  );
}

function StatusBadge({ info }: { info: { label: string; bg: string; color: string } }) {
  return (
    <span
      style={{
        fontSize: 8, fontFamily: "monospace", fontWeight: 700,
        background: info.bg, color: info.color,
        borderRadius: 2, padding: "1px 3px", lineHeight: 1, flexShrink: 0,
      }}
    >
      {info.label}
    </span>
  );
}

function ArenaAnnouncement({ alive }: { alive: number }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevAliveRef = useRef(alive);

  useEffect(() => {
    if (alive >= prevAliveRef.current) {
      prevAliveRef.current = alive;
      return;
    }
    prevAliveRef.current = alive;
    if (alive < 1 || alive > 5) return;
    const text = alive === 1 ? "LAST ONE STANDING!" : `ONLY ${ALIVE_NAMES[alive]} LEFT!`;
    setMsg(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMsg(null), 2600);
  }, [alive]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  if (!msg) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "14%",
        left: "50%",
        zIndex: 30,
        pointerEvents: "none",
        transform: "translateX(-50%) skewX(-8deg)",
      }}
    >
      <div
        style={{
          background: "#cc1a0a",
          padding: "9px 32px",
          boxShadow: "4px 4px 0 rgba(0,0,0,0.45)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ color: "#fff", fontSize: 17, display: "inline-block", transform: "skewX(8deg)" }}>⚠</span>
        <span
          style={{
            color: "#fff",
            fontFamily: "monospace",
            fontSize: 15,
            fontWeight: 900,
            letterSpacing: "0.18em",
            display: "inline-block",
            transform: "skewX(8deg)",
            textShadow: "1px 1px 0 rgba(0,0,0,0.4)",
          }}
        >
          {msg}
        </span>
      </div>
    </div>
  );
}

/** One opponent/teammate HP plate. `side` controls which way the name aligns and the
 *  wedge points so both columns lean toward the centre of the arena. */
function BarEntry({ p, side }: { p: ArenaPlayerInfo; side: "left" | "right" }) {
  const pct = p.pokemon.maxHp > 0 ? p.pokemon.currentHp / p.pokemon.maxHp : 0;
  const alive = p.pokemon.isAlive;
  const statusInfo = p.pokemon.status ? STATUS_LABELS[p.pokemon.status] : null;
  const isLeft = side === "left";

  const box = (
    <div
      style={{
        background: BOX_BG,
        border: `2px solid ${BOX_BORDER}`,
        borderRadius: 2,
        padding: isLeft ? "3px 8px 4px 7px" : "3px 7px 4px 8px",
        minWidth: 150,
        maxWidth: 176,
        boxShadow: "1px 1px 0 rgba(0,0,0,0.25)",
      }}
    >
      <div className="flex items-center gap-1 mb-1" style={isLeft ? undefined : { flexDirection: "row-reverse" }}>
        <span
          style={{
            fontFamily: "monospace", fontSize: 11, fontWeight: 800,
            letterSpacing: "0.06em", color: "#1a1a1a", lineHeight: 1,
            flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            textAlign: isLeft ? "left" : "right",
          }}
        >
          {p.pokemon.displayName.toUpperCase()}
        </span>
        {statusInfo && alive && <StatusBadge info={statusInfo} />}
      </div>
      <HPBar pct={pct} alive={alive} />
    </div>
  );

  const wedge = <Wedge dir={isLeft ? "right" : "left"} />;

  return (
    <div className="flex items-center" style={{ opacity: alive ? 1 : 0.72 }}>
      {isLeft ? <>{box}{wedge}</> : <>{wedge}{box}</>}
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

      {/* Milestone announcements */}
      <ArenaAnnouncement alive={alive} />

      {/* Left sidebar */}
      <div className="absolute top-0 left-0 flex flex-col gap-1.5 pt-2 pl-1">
        {leftPlayers.map((p) => (
          <BarEntry key={p.pokemon.pokemonId} p={p} side="left" />
        ))}
      </div>

      {/* Right sidebar */}
      <div className="absolute top-0 right-0 flex flex-col gap-1.5 pt-2 pr-1" style={{ alignItems: "flex-end" }}>
        {rightPlayers.map((p) => (
          <BarEntry key={p.pokemon.pokemonId} p={p} side="right" />
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
            background: BOX_BG,
            border: `1.5px solid ${BOX_BORDER}`,
            borderRadius: 3,
            padding: "1px 8px",
            color: "#333",
          }}
        >
          {alive} / {players.length} REMAINING
        </div>
      </div>

      {/* My Pokemon quick info — bottom panel */}
      {me && me.pokemon.isAlive && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center">
          <div
            style={{
              background: BOX_BG,
              border: `2px solid ${BOX_BORDER}`,
              borderRadius: 2,
              padding: "4px 12px 5px 10px",
              minWidth: 190,
              boxShadow: "1px 1px 0 rgba(0,0,0,0.25)",
            }}
          >
            <div className="flex items-center gap-1 mb-1">
              <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", color: "#1a1a1a", flex: 1 }}>
                {me.pokemon.displayName.toUpperCase()}
              </span>
              {meStatus && <StatusBadge info={meStatus} />}
              <span style={{ fontSize: 9, fontFamily: "monospace", color: "#555", marginLeft: 4 }}>
                {me.pokemon.currentHp}/{me.pokemon.maxHp}
              </span>
            </div>
            <HPBar pct={mePct} alive={me.pokemon.isAlive} />
          </div>
          <Wedge dir="right" />
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
