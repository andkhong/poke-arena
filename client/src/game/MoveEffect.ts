import * as PIXI from "pixi.js";
import { TYPE_COLORS } from "../styles/typeColors";
import { MOVE_OVERRIDES, playMove, type MoveAnimContext } from "./moveArchetypes";

function typeColor(moveType: string): number {
  return parseInt((TYPE_COLORS[moveType] ?? "#66ddff").replace("#", ""), 16);
}

// Downloaded Pokemon Showdown effect sprites (served from client/public/fx), mapped per
// move TYPE. A move with no curated override picks one of its type's sprites for variety.
const FX_BASE = "/fx";
const FALLBACK_FX = "wisp";
const TYPE_FX: Record<string, string[]> = {
  normal:   ["energyball", "wisp"],
  fire:     ["fireball", "flareball"],
  water:    ["waterwisp"],
  electric: ["electroball", "lightning"],
  grass:    ["leaf1", "leaf2", "petal"],
  ice:      ["iceball", "icicle"],
  fighting: ["caltrop", "sword"],
  poison:   ["poisonwisp"],
  ground:   ["mudwisp", "rock1"],
  flying:   ["wisp", "energyball"],
  psychic:  ["mistball"],
  bug:      ["web", "leaf1"],
  rock:     ["rock1", "rock2", "rock3"],
  ghost:    ["shadowball"],
  dragon:   ["energyball", "mistball"],
  dark:     ["shadowball", "mistball"],
  steel:    ["sword", "rock1"],
  fairy:    ["mistball", "petal"],
};

// Extra sprites referenced by archetypes/overrides that aren't in TYPE_FX. Preloaded
// alongside the type sprites; any missing file degrades to a tinted orb (see showEffect).
const EXTRA_FX = ["leftslash", "rightslash", "impact", "fist"];

// ─── Low-level effect primitive types (modeled on Showdown's scene.showEffect) ──
export type Easing = "linear" | "accel" | "decel" | "swing" | "ballistic";

export interface EffectState {
  x: number;
  y: number;
  scale?: number;    // multiplied onto the texture's base-size scale (default 1)
  opacity?: number;  // 0..1 (default 1)
  rotation?: number; // radians (default 0); ignored if opts.spin is set
  time?: number;     // on `start`: delay before the tween begins; on `end`: tween duration (ms)
}

export interface ShowEffectOpts {
  baseSize?: number;   // px the texture's largest dimension maps to (default 48)
  tint?: number;       // recolor the sprite itself
  glowColor?: number;  // color of explode sparkles / fallback orb (default tint, else white)
  blendAdd?: boolean;  // additive blend for glowy effects
  easing?: Easing;     // position/scale/opacity easing (default "linear")
  arcHeight?: number;  // extra vertical arc for "ballistic" (negative = up)
  spin?: number;       // continuous rotation delta per frame instead of lerping rotation
  after?: "fade" | "explode" | "remove"; // end behavior (default "fade")
}

const EASING: Record<Easing, (t: number) => number> = {
  linear: (t) => t,
  accel: (t) => t * t,
  decel: (t) => 1 - (1 - t) * (1 - t),
  swing: (t) => 0.5 - 0.5 * Math.cos(Math.PI * t),
  ballistic: (t) => t, // position is linear; the arc is added separately
};

export class MoveEffect {
  private container: PIXI.Container;
  private textures = new Map<string, PIXI.Texture>();
  private lazyLoads = new Map<string, Promise<void>>();

  constructor() {
    this.container = new PIXI.Container();
    void this.preloadTextures();
  }

  /** Preload every sprite referenced by type defaults, curated overrides, and extras. */
  private async preloadTextures(): Promise<void> {
    const names = Array.from(
      new Set([
        ...Object.values(TYPE_FX).flat(),
        ...Object.values(MOVE_OVERRIDES).map((o) => o.tex).filter((t): t is string => !!t),
        ...EXTRA_FX,
        FALLBACK_FX,
      ])
    );
    await Promise.all(names.map((name) => this.lazyLoad(name)));
  }

  getContainer(): PIXI.Container {
    return this.container;
  }

  /** Kick off (once) an async load for an fx sprite, caching it on success. */
  private lazyLoad(name: string): Promise<void> {
    const existing = this.lazyLoads.get(name);
    if (existing) return existing;
    const p = PIXI.Assets.load(`${FX_BASE}/${name}.png`)
      .then((tex) => { this.textures.set(name, tex as PIXI.Texture); })
      .catch((err) => { console.warn("[MoveEffect] failed to load fx", name, err); });
    this.lazyLoads.set(name, p);
    return p;
  }

  /** Return a loaded texture, or null if not ready yet (kicks off a lazy load). */
  private getTexture(name: string): PIXI.Texture | null {
    const cached = this.textures.get(name);
    if (cached) return cached;
    void this.lazyLoad(name);
    return null;
  }

  /** Pick a default fx sprite NAME for a move's type (random among its variants). */
  pickFxName(moveType: string): string {
    const names = TYPE_FX[moveType] ?? [FALLBACK_FX];
    return names[Math.floor(Math.random() * names.length)] ?? FALLBACK_FX;
  }

  /** Scale a texture so its largest dimension is roughly `target` px. */
  private scaleFor(tex: PIXI.Texture, target: number): number {
    return target / (Math.max(tex.width, tex.height) || target);
  }

  // ─── The primitive every archetype composes ─────────────────────────────────
  /**
   * Spawn one fx sprite and tween position/scale/opacity/rotation from `start` to
   * `end` over `end.time` ms (after an optional `start.time` ms delay), then resolve
   * per `opts.after`. If the texture isn't loaded, renders a tinted orb so a move
   * never renders nothing.
   */
  showEffect(texName: string, start: EffectState, end: EffectState, opts: ShowEffectOpts = {}): void {
    const baseSize = opts.baseSize ?? 48;
    const glow = opts.glowColor ?? opts.tint ?? 0xffffff;
    const after = opts.after ?? "fade";
    const delay = Math.max(0, start.time ?? 0);
    const dur = Math.max(1, end.time ?? 300);
    const ease = EASING[opts.easing ?? "linear"];

    const tex = this.getTexture(texName);
    let display: PIXI.Sprite | PIXI.Graphics;
    let texScale: number;
    if (tex) {
      const sprite = new PIXI.Sprite(tex);
      sprite.anchor.set(0.5);
      if (opts.tint !== undefined) sprite.tint = opts.tint;
      display = sprite;
      texScale = this.scaleFor(tex, baseSize);
    } else {
      display = new PIXI.Graphics().circle(0, 0, baseSize / 2).fill({ color: glow });
      texScale = 1;
    }
    if (opts.blendAdd) display.blendMode = "add";

    const s0 = start.scale ?? 1;
    const s1 = end.scale ?? s0;
    const o0 = start.opacity ?? 1;
    const o1 = end.opacity ?? o0;
    const r0 = start.rotation ?? 0;
    const r1 = end.rotation ?? r0;
    const dist = Math.hypot(end.x - start.x, end.y - start.y);
    const arc = opts.arcHeight ?? (opts.easing === "ballistic" ? -Math.min(40, dist * 0.12) : 0);

    display.x = start.x;
    display.y = start.y;
    display.scale.set(texScale * s0);
    display.alpha = o0;
    display.rotation = r0;
    display.visible = delay === 0;
    this.container.addChild(display);

    const startAt = Date.now() + delay;
    const tick = () => {
      const now = Date.now();
      if (now < startAt) { requestAnimationFrame(tick); return; }
      display.visible = true;
      const lin = Math.min((now - startAt) / dur, 1);
      const k = ease(lin);
      display.x = start.x + (end.x - start.x) * k;
      display.y = start.y + (end.y - start.y) * k + Math.sin(lin * Math.PI) * arc;
      display.scale.set(texScale * (s0 + (s1 - s0) * k));
      display.alpha = o0 + (o1 - o0) * k;
      if (opts.spin) display.rotation += opts.spin;
      else display.rotation = r0 + (r1 - r0) * k;
      if (lin < 1) requestAnimationFrame(tick);
      else this.finishEffect(display, end.x, end.y, glow, after);
    };
    requestAnimationFrame(tick);
  }

  private finishEffect(
    display: PIXI.Sprite | PIXI.Graphics,
    x: number, y: number,
    color: number,
    after: "fade" | "explode" | "remove",
  ): void {
    if (after === "remove") { this.container.removeChild(display); display.destroy(); return; }
    if (after === "explode") this.spawnSparkleCloud(x, y, color, 46, 12);
    const dur = after === "explode" ? 170 : 120;
    const startAlpha = display.alpha;
    const baseScale = display.scale.x;
    const start = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - start) / dur, 1);
      display.alpha = startAlpha * (1 - t);
      if (after === "explode") display.scale.set(baseScale * (1 + t * 0.9));
      if (t < 1) requestAnimationFrame(tick);
      else { this.container.removeChild(display); display.destroy(); }
    };
    requestAnimationFrame(tick);
  }

  // ─── Dispatcher: route a move to its archetype animation ─────────────────────
  fire(
    fromX: number, fromY: number,
    toX: number, toY: number,
    moveName: string,
    moveType: string,
    damageClass: string,
    isAoe: boolean,
    effectiveness: number,
    isCrit: boolean,
  ): void {
    const ctx: MoveAnimContext = {
      fromX, fromY, toX, toY,
      moveName,
      moveType,
      damageClass,
      isAoe,
      color: typeColor(moveType),
      defaultTex: this.pickFxName(moveType),
      isCrit,
      effectiveness,
    };
    playMove(this, ctx);
  }

  showMoveName(x: number, y: number, moveName: string, moveType: string): void {
    const color = typeColor(moveType);
    const label = new PIXI.Text({
      text: moveName.toUpperCase(),
      style: {
        fontSize: 12,
        fill: color,
        fontFamily: "monospace",
        fontWeight: "bold",
        stroke: { color: 0x000000, width: 4 },
      },
    });
    label.anchor.set(0.5, 1);
    label.x = x;
    label.y = y - 52;
    this.container.addChild(label);

    const start = Date.now();
    const startY = label.y;
    const tick = () => {
      const t = Math.min((Date.now() - start) / 1000, 1);
      label.y = startY - t * 28;
      label.alpha = t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45;
      if (t < 1) requestAnimationFrame(tick);
      else { this.container.removeChild(label); label.destroy(); }
    };
    requestAnimationFrame(tick);
  }

  showDamage(x: number, y: number, damage: number, effectiveness: number, isCrit: boolean): void {
    if (damage <= 0) return;
    const text = isCrit ? `${damage}!` : String(damage);
    const color = isCrit ? 0xffee22
      : effectiveness >= 2 ? 0xff4422
      : effectiveness <= 0.5 ? 0x88aaff
      : 0xffffff;

    const label = new PIXI.Text({
      text,
      style: {
        fontSize: isCrit ? 22 : 16,
        fill: color,
        fontFamily: "monospace",
        fontWeight: "bold",
        stroke: { color: 0x000000, width: 4 },
      },
    });
    label.anchor.set(0.5, 1);
    label.x = x + (Math.random() - 0.5) * 20;
    label.y = y - 10;
    this.container.addChild(label);

    const start = Date.now();
    const startY = label.y;
    const tick = () => {
      const t = Math.min((Date.now() - start) / 850, 1);
      label.y = startY - t * 50;
      label.alpha = t < 0.45 ? 1 : 1 - (t - 0.45) / 0.55;
      if (t < 1) requestAnimationFrame(tick);
      else { this.container.removeChild(label); label.destroy(); }
    };
    requestAnimationFrame(tick);
  }

  // ─── Ring pulse: concentric expanding rings (AoE / self-buff) ────────────────
  ringPulse(cx: number, cy: number, color: number, maxRadius: number): void {
    const ringCount = 3;
    const baseDur = 520;

    for (let r = 0; r < ringCount; r++) {
      const delay = r * 110;
      const g = new PIXI.Graphics();
      this.container.addChild(g);

      const startTime = Date.now() + delay;
      const animate = () => {
        const now = Date.now();
        if (now < startTime) { requestAnimationFrame(animate); return; }
        const t = Math.min((now - startTime) / baseDur, 1);
        g.clear()
          .circle(cx, cy, t * maxRadius)
          .stroke({ width: 3, color, alpha: (1 - t) * 0.85 });
        if (t < 1) requestAnimationFrame(animate);
        else { this.container.removeChild(g); g.destroy(); }
      };
      requestAnimationFrame(animate);
    }
  }

  // ─── Generic sparkle cloud (impact burst + fallback) ─────────────────────────
  spawnSparkleCloud(cx: number, cy: number, color: number, radius: number, count: number): void {
    const duration = 580;

    const glow = new PIXI.Graphics()
      .circle(0, 0, radius * 0.7)
      .fill({ color, alpha: 0.25 });
    glow.x = cx;
    glow.y = cy;
    this.container.addChild(glow);

    const glowStart = Date.now();
    const glowTick = () => {
      const t = Math.min((Date.now() - glowStart) / duration, 1);
      glow.alpha = (1 - t) * 0.25;
      glow.scale.set(1 + t * 0.35);
      if (t < 1) requestAnimationFrame(glowTick);
      else { this.container.removeChild(glow); glow.destroy(); }
    };
    requestAnimationFrame(glowTick);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spawnR = Math.random() * radius * 0.45;
      const size = 2.5 + Math.random() * 4.5;
      const speed = 0.55 + Math.random() * 0.7;
      const startAlpha = 0.65 + Math.random() * 0.35;

      const p = new PIXI.Graphics()
        .circle(0, 0, size)
        .fill({ color, alpha: startAlpha });
      p.x = cx + Math.cos(angle) * spawnR;
      p.y = cy + Math.sin(angle) * spawnR;
      this.container.addChild(p);

      const pStart = Date.now() + Math.random() * 80;
      const pTick = () => {
        const now = Date.now();
        if (now < pStart) { requestAnimationFrame(pTick); return; }
        const t = Math.min((now - pStart) / (duration * speed), 1);
        p.x = cx + Math.cos(angle) * (spawnR + t * radius * 0.65);
        p.y = cy + Math.sin(angle) * (spawnR + t * radius * 0.65);
        p.alpha = startAlpha * (1 - t);
        if (t < 1) requestAnimationFrame(pTick);
        else { this.container.removeChild(p); p.destroy(); }
      };
      requestAnimationFrame(pTick);
    }
  }
}
