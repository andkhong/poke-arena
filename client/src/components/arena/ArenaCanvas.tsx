import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { ArenaRenderer } from "../../game/ArenaRenderer";
import { useArenaStore } from "../../store/arenaStore";
import { TYPE_COLORS } from "../../styles/typeColors";

interface BannerItem {
  id: number;
  name: string;
  type: string;
  xPct: number;
  yPct: number;
  toRight: boolean;
}

export function ArenaCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<ArenaRenderer | null>(null);
  const lastTickRef = useRef(-1);
  const initDoneRef = useRef(false); // true once app.init() resolves successfully
  const spritesInitRef = useRef(false); // true once initPlayers has been called

  const [debugInfo, setDebugInfo] = useState("pixi: initializing...");
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const bannerIdRef = useRef(0);

  const { players, tick, arenaW, arenaH, pendingActions, clearPendingActions } = useArenaStore();
  const storeSnapshot = useRef({ players, arenaW, arenaH });
  storeSnapshot.current = { players, arenaW, arenaH };

  // Init Pixi exactly once — safe for React Strict Mode double-invoke
  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    // Guard: if we already initialized (Strict Mode second run sees this), skip
    if (initDoneRef.current) return;

    const app = new PIXI.Application();
    let mounted = true;

    const w = container.clientWidth || window.innerWidth || 800;
    const h = container.clientHeight || (window.innerHeight - 56) || 600;

    console.log("[ArenaCanvas] starting Pixi init w=", w, "h=", h);
    setDebugInfo(`pixi: init (${w}×${h})`);

    app
      .init({ width: w, height: h, backgroundColor: 0xc4a870, antialias: false })
      .then(() => {
        if (!mounted) {
          try { app.destroy(true); } catch { /* ignore */ }
          return;
        }

        initDoneRef.current = true;
        const canvas = app.canvas as HTMLCanvasElement;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.display = "block";
        container.appendChild(canvas);

        const r = new ArenaRenderer(app);
        rendererRef.current = r;

        const { players: p, arenaW: aw, arenaH: ah } = storeSnapshot.current;
        console.log("[ArenaCanvas] Pixi ready. players in snapshot:", p.length, "arenaW:", aw, "arenaH:", ah);
        setDebugInfo(`pixi: ready | sprites: 0 | players: ${p.length}`);

        if (p.length > 0 && !spritesInitRef.current) {
          spritesInitRef.current = true;
          r.initPlayers(p, aw, ah);
          setDebugInfo(`pixi: ready | sprites: ${p.length} | tick: 0`);
        }
      })
      .catch((err) => {
        console.error("[ArenaCanvas] Pixi init failed:", err);
        setDebugInfo(`pixi: FAILED — ${String(err)}`);
      });

    const handleResize = () => {
      if (!container || !rendererRef.current) return;
      rendererRef.current.resize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      mounted = false;
      window.removeEventListener("resize", handleResize);
      if (initDoneRef.current) {
        rendererRef.current?.destroy();
        rendererRef.current = null;
        try { app.destroy(true); } catch { /* ignore */ }
        initDoneRef.current = false;
      }
      lastTickRef.current = -1;
      spritesInitRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Init sprites once renderer is ready and players arrive (covers the case where players
  // arrive after Pixi init, e.g. slow socket)
  useEffect(() => {
    const r = rendererRef.current;
    if (!r || players.length === 0) return;
    if (spritesInitRef.current) return; // already initialized by Pixi .then() or prior call
    spritesInitRef.current = true;
    console.log("[ArenaCanvas] players effect: initPlayers count=", players.length);
    r.initPlayers(players, arenaW, arenaH);
    setDebugInfo(`pixi: ready | sprites: ${players.length} | tick: 0`);
  }, [players, arenaW, arenaH]);

  // Drive renderer every server tick
  useEffect(() => {
    const r = rendererRef.current;
    if (!r || tick === lastTickRef.current) return;
    lastTickRef.current = tick;

    r.update(players, pendingActions);
    setDebugInfo(`pixi: ready | sprites: ${players.length} | tick: ${tick}`);

    if (pendingActions.length > 0) {
      // One banner per unique attacker this tick
      const seen = new Set<number>();
      const newBanners: BannerItem[] = [];
      for (const a of pendingActions) {
        if (seen.has(a.attackerPokemonId)) continue;
        seen.add(a.attackerPokemonId);
        const attacker = players.find((p) => p.pokemon.pokemonId === a.attackerPokemonId);
        const target = players.find((p) => p.pokemon.pokemonId === a.targetPokemonId);
        if (!attacker) continue;
        bannerIdRef.current++;
        newBanners.push({
          id: bannerIdRef.current,
          name: a.moveDisplayName,
          type: a.moveType,
          xPct: (attacker.pokemon.x / arenaW) * 100,
          yPct: (attacker.pokemon.y / arenaH) * 100,
          toRight: target ? target.pokemon.x >= attacker.pokemon.x : attacker.pokemon.facingRight,
        });
      }
      if (newBanners.length > 0) {
        setBanners((prev) => [...prev, ...newBanners].slice(-5));
        const ids = newBanners.map((b) => b.id);
        setTimeout(() => setBanners((prev) => prev.filter((b) => !ids.includes(b.id))), 1400);
      }
      clearPendingActions();
    }
  }, [tick, players, pendingActions, arenaW, arenaH, clearPendingActions]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={canvasRef}
        className="w-full h-full"
        style={{ touchAction: "none", overflow: "hidden" }}
      />

      {/* Move name banners — DOM overlay so CSS clip-path + fonts are crisp */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 15 }}>
        {banners.map((b) => {
          const bg = TYPE_COLORS[b.type] ?? "#888888";
          const clipRight = "polygon(12px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)";
          const clipLeft  = "polygon(0% 0%, calc(100% - 12px) 0%, 100% 100%, 8px 100%)";
          return (
            <div
              key={b.id}
              style={{
                position: "absolute",
                top: `${Math.max(4, b.yPct - 9)}%`,
                ...(b.toRight
                  ? { left: `${Math.min(b.xPct + 2, 54)}%` }
                  : { right: `${Math.min(100 - b.xPct + 2, 54)}%` }),
                background: bg,
                clipPath: b.toRight ? clipRight : clipLeft,
                padding: "5px 22px 5px 16px",
                filter: "brightness(0.88) saturate(1.2)",
                boxShadow: "2px 3px 0 rgba(0,0,0,0.4)",
                animation: `${b.toRight ? "move-banner-right" : "move-banner-left"} 1.4s ease forwards`,
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  color: "#ffffff",
                  fontFamily: "monospace",
                  fontSize: 13,
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textShadow: "1px 1px 0 rgba(0,0,0,0.5)",
                }}
              >
                {b.name.toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Render diagnostic */}
      <div className="absolute bottom-1 left-1 z-50 bg-black/80 text-yellow-300 text-[10px] px-2 py-1 rounded font-mono pointer-events-none">
        {debugInfo}
      </div>
    </div>
  );
}
