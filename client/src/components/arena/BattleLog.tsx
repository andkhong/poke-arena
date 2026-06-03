import { useState, useRef, useEffect } from "react";
import { useArenaStore } from "../../store/arenaStore";
import { TYPE_COLORS } from "../../styles/typeColors";

const STAT_LABELS: Record<string, string> = {
  attack: "Attack",
  defense: "Defense",
  specialAtk: "Sp. Atk",
  specialDef: "Sp. Def",
  speed: "Speed",
  accuracy: "Accuracy",
  evasion: "Evasion",
};

function effectivenessLabel(e: number): { text: string; color: string } | null {
  if (e >= 4)   return { text: "4×", color: "#ff2200" };
  if (e >= 2)   return { text: "2×", color: "#ff6644" };
  if (e <= 0.25) return { text: "¼×", color: "#8888ff" };
  if (e <= 0.5) return { text: "½×", color: "#aabbff" };
  return null;
}

function typeColor(moveType: string): string {
  return TYPE_COLORS[moveType] ?? "#aaaaaa";
}

function stageArrow(change: number): string {
  if (change >= 3) return "⬆⬆⬆";
  if (change === 2) return "⬆⬆";
  if (change === 1) return "⬆";
  if (change <= -3) return "⬇⬇⬇";
  if (change === -2) return "⬇⬇";
  return "⬇";
}

export function BattleLog() {
  const [open, setOpen] = useState(false);
  const { battleLog } = useArenaStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(0);

  // Auto-scroll to top on new entries
  useEffect(() => {
    if (battleLog.length !== prevLenRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    prevLenRef.current = battleLog.length;
  }, [battleLog.length]);

  return (
    <>
      {/* Slide-in panel — zIndex 60 renders above result modal (z-50) */}
      <div
        className="fixed top-14 right-0 flex flex-col"
        style={{
          zIndex: 60,
          width: 300,
          height: "calc(100vh - 56px)",
          background: "rgba(8,8,16,0.95)",
          borderLeft: "1px solid #333",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.22s ease",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2 flex-shrink-0"
          style={{ borderBottom: "1px solid #333" }}
        >
          <span className="text-xs font-black tracking-widest font-mono" style={{ color: "#ddcc88" }}>
            BATTLE LOG
          </span>
          <span className="text-[10px] font-mono" style={{ color: "#555" }}>
            {battleLog.length} moves
          </span>
        </div>

        {/* Entries */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ overscrollBehavior: "contain" }}>
          {battleLog.length === 0 ? (
            <div className="text-center py-8 text-[11px] font-mono" style={{ color: "#444" }}>
              No moves yet
            </div>
          ) : (
            battleLog.map((entry) => {
              const eff = effectivenessLabel(entry.effectiveness);
              const color = typeColor(entry.moveType);
              const hasStatChanges = entry.statChanges.length > 0;
              const hasDrain = entry.hpDrained > 0;

              return (
                <div
                  key={entry.id}
                  className="px-3 py-2"
                  style={{ borderBottom: "1px solid #1a1a2a" }}
                >
                  {/* Move name + type pill */}
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className="inline-block rounded-sm flex-shrink-0"
                      style={{ width: 6, height: 6, background: color }}
                    />
                    <span
                      className="text-[11px] font-bold font-mono truncate"
                      style={{ color }}
                    >
                      {entry.moveDisplayName.toUpperCase()}
                    </span>
                    <span
                      className="text-[9px] font-mono ml-auto flex-shrink-0"
                      style={{ color: "#444" }}
                    >
                      {entry.moveType.toUpperCase()} · {entry.damageClass.toUpperCase()}
                    </span>
                  </div>

                  {/* Attacker → Target */}
                  <div className="flex items-center gap-1 text-[10px] font-mono mb-1">
                    <span style={{ color: "#cccccc" }}>{entry.attackerName}</span>
                    <span style={{ color: "#555" }}>→</span>
                    <span style={{ color: "#aaaaaa" }}>{entry.targetName}</span>
                    {entry.isAoe && (
                      <span className="ml-1 text-[9px] px-1 rounded" style={{ background: "#2a2a1a", color: "#ddaa44" }}>
                        AOE
                      </span>
                    )}
                  </div>

                  {/* Result chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {entry.missed ? (
                      <span className="text-[10px] font-mono font-bold" style={{ color: "#666" }}>
                        MISSED
                      </span>
                    ) : (
                      <>
                        {entry.damageDealt > 0 && (
                          <span
                            className="text-[11px] font-black font-mono"
                            style={{ color: entry.isCrit ? "#ffee22" : "#ffffff" }}
                          >
                            {entry.damageDealt} dmg
                          </span>
                        )}
                        {entry.isCrit && (
                          <span className="text-[9px] font-mono font-bold" style={{ color: "#ffee22" }}>
                            CRIT
                          </span>
                        )}
                        {eff && (
                          <span className="text-[9px] font-mono font-bold" style={{ color: eff.color }}>
                            {eff.text}
                          </span>
                        )}
                        {hasDrain && (
                          <span className="text-[9px] font-mono" style={{ color: "#44ee88" }}>
                            +{entry.hpDrained} HP
                          </span>
                        )}
                        {entry.statusApplied && (
                          <span
                            className="text-[9px] font-mono px-1 rounded"
                            style={{ background: "#2a1a2a", color: "#cc88ff" }}
                          >
                            {entry.statusApplied.toUpperCase()}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Stat changes — each on its own line */}
                  {hasStatChanges && (
                    <div className="mt-1 flex flex-col gap-0.5">
                      {entry.statChanges.map((sc, i) => {
                        const isUp = sc.change > 0;
                        return (
                          <div key={i} className="flex items-center gap-1 text-[10px] font-mono">
                            <span style={{ color: isUp ? "#44dd88" : "#ff6644" }}>
                              {stageArrow(sc.change)}
                            </span>
                            <span style={{ color: isUp ? "#44dd88" : "#ff6644" }}>
                              {STAT_LABELS[sc.stat] ?? sc.stat}
                            </span>
                            <span style={{ color: "#555" }}>
                              ({isUp ? "+" : ""}{sc.change})
                            </span>
                            <span style={{ color: "#555" }}>
                              {entry.attackerName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          className="px-3 py-2 flex-shrink-0 text-[10px] font-mono"
          style={{ borderTop: "1px solid #333", color: "#444" }}
        >
          Showing last {Math.min(battleLog.length, 200)} · newest first
        </div>
      </div>

      {/* Tab trigger — fixed to the right edge, above result modal */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed flex items-center justify-center"
        style={{
          zIndex: 61,
          right: open ? 300 : 0,
          top: "50%",
          transform: "translateY(-50%)",
          writingMode: "vertical-rl",
          background: "rgba(8,8,16,0.90)",
          border: "1px solid #444",
          borderRight: "none",
          color: "#ddcc88",
          fontFamily: "monospace",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.15em",
          padding: "12px 6px",
          cursor: "pointer",
          userSelect: "none",
          borderRadius: "4px 0 0 4px",
          transition: "right 0.22s ease",
        }}
      >
        {open ? "▶ CLOSE" : "◀ BATTLE LOG"}
      </button>
    </>
  );
}
