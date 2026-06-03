// Move animation "archetypes": the choreography layer. Each archetype composes the
// low-level `showEffect` primitive (defined on MoveEffect) into a recognizable look —
// a streaming breath (Flamethrower), a beam (Ice Beam), a strike from the sky
// (Thunderbolt), etc. — modeled on how Pokemon Showdown animates its moves.
//
// Every move resolves to an archetype: a curated MOVE_OVERRIDES entry if one exists,
// otherwise a sensible default derived from damageClass/isAoe/type. So uncurated moves
// still get a reasonable animation, and adding a new tuned move is a one-line override.

import type { EffectState, ShowEffectOpts } from "./MoveEffect";

// Narrow view of MoveEffect that the renderers are allowed to use. MoveEffect
// satisfies this structurally, so we avoid a runtime import cycle.
export interface EffectEngine {
  showEffect(texName: string, start: EffectState, end: EffectState, opts?: ShowEffectOpts): void;
  ringPulse(cx: number, cy: number, color: number, maxRadius: number): void;
  spawnSparkleCloud(cx: number, cy: number, color: number, radius: number, count: number): void;
}

export type Archetype =
  | "projectile"
  | "scatter"
  | "beam"
  | "stream"
  | "strike_from_sky"
  | "melee_contact"
  | "self_buff"
  | "field_aoe"
  | "recoil_drain";

export interface MoveAnimContext {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  moveName: string;
  moveType: string;
  damageClass: string;
  isAoe: boolean;
  color: number;       // type color, used for sparkles / fallback orbs
  defaultTex: string;  // the type's default fx sprite name
  isCrit: boolean;
  effectiveness: number;
}

export interface MoveOverride {
  archetype: Archetype;
  tex?: string;        // override sprite (else ctx.defaultTex)
  count?: number;      // stream / scatter / strike particle count
  baseSize?: number;   // px the sprite's largest dim maps to
  durationMs?: number;
  tint?: number;       // recolor the sprite itself
  blendAdd?: boolean;  // additive blend for glowy effects
  charge?: boolean;    // beam: flash at the attacker before firing
}

type Renderer = (engine: EffectEngine, ctx: MoveAnimContext, o?: MoveOverride) => void;

// Unit perpendicular to the attacker→target axis (for spreading particles sideways).
function perp(ctx: MoveAnimContext): { px: number; py: number } {
  const dx = ctx.toX - ctx.fromX;
  const dy = ctx.toY - ctx.fromY;
  const len = Math.hypot(dx, dy) || 1;
  return { px: -dy / len, py: dx / len };
}

// ─── Archetype renderers ──────────────────────────────────────────────────────

const projectile: Renderer = (engine, ctx, o) => {
  const tex = o?.tex ?? ctx.defaultTex;
  const size = (o?.baseSize ?? 46) * (ctx.isCrit ? 1.25 : 1);
  engine.showEffect(
    tex,
    { x: ctx.fromX, y: ctx.fromY, scale: 0.8 },
    { x: ctx.toX, y: ctx.toY, scale: 1, time: o?.durationMs ?? 300 },
    { baseSize: size, tint: o?.tint, glowColor: ctx.color, blendAdd: o?.blendAdd, easing: "ballistic", spin: 0.32, after: "explode" },
  );
};

// Flamethrower / Water Gun: a continuous wave of sprites flowing to the target.
const stream: Renderer = (engine, ctx, o) => {
  const tex = o?.tex ?? ctx.defaultTex;
  const count = o?.count ?? 10;
  const size = (o?.baseSize ?? 34) * (ctx.isCrit ? 1.2 : 1);
  const { px, py } = perp(ctx);
  for (let i = 0; i < count; i++) {
    const jitter = (Math.random() - 0.5) * 28;
    const sx = ctx.fromX + px * jitter * 0.3;
    const sy = ctx.fromY + py * jitter * 0.3;
    const ex = ctx.toX + px * jitter;
    const ey = ctx.toY + py * jitter;
    engine.showEffect(
      tex,
      { x: sx, y: sy, scale: 0.45, opacity: 0.95, time: i * 28 },
      { x: ex, y: ey, scale: 1.15, opacity: 0.65, time: o?.durationMs ?? 270 },
      { baseSize: size, tint: o?.tint, glowColor: ctx.color, blendAdd: o?.blendAdd ?? false, easing: "decel", spin: 0.12, after: "fade" },
    );
  }
  engine.spawnSparkleCloud(ctx.toX, ctx.toY, ctx.color, ctx.isCrit ? 42 : 30, ctx.isCrit ? 12 : 8);
};

// Ice Beam / Hyper Beam: a held line of sprites along the path. `charge` flashes first.
const beam: Renderer = (engine, ctx, o) => {
  const tex = o?.tex ?? ctx.defaultTex;
  const segs = 9;
  const size = (o?.baseSize ?? 30) * (ctx.isCrit ? 1.2 : 1);
  const fire = () => {
    for (let i = 0; i <= segs; i++) {
      const f = i / segs;
      const x = ctx.fromX + (ctx.toX - ctx.fromX) * f;
      const y = ctx.fromY + (ctx.toY - ctx.fromY) * f;
      engine.showEffect(
        tex,
        { x, y, scale: 0.5, opacity: 0, time: i * 14 },
        { x, y, scale: 1, opacity: 0.95, time: o?.durationMs ?? 230 },
        { baseSize: size, tint: o?.tint, glowColor: ctx.color, blendAdd: o?.blendAdd ?? false, easing: "decel", after: "fade" },
      );
    }
    engine.spawnSparkleCloud(ctx.toX, ctx.toY, ctx.color, ctx.isCrit ? 52 : 40, ctx.isCrit ? 16 : 11);
  };
  if (o?.charge) {
    engine.showEffect(
      tex,
      { x: ctx.fromX, y: ctx.fromY, scale: 0.2, opacity: 0.25 },
      { x: ctx.fromX, y: ctx.fromY, scale: 1.5, opacity: 0.9, time: 280 },
      { baseSize: size * 1.4, glowColor: ctx.color, blendAdd: true, easing: "accel", after: "fade" },
    );
    setTimeout(fire, 320);
  } else {
    fire();
  }
};

// Thunderbolt / Thunder: bolt(s) drop vertically onto the target.
const strikeFromSky: Renderer = (engine, ctx, o) => {
  const tex = o?.tex ?? ctx.defaultTex;
  const bolts = o?.count ?? (ctx.isCrit ? 2 : 1);
  const size = (o?.baseSize ?? 62) * (ctx.isCrit ? 1.25 : 1);
  for (let i = 0; i < bolts; i++) {
    const jx = i === 0 ? 0 : (Math.random() - 0.5) * 36;
    engine.showEffect(
      tex,
      { x: ctx.toX + jx, y: ctx.toY - 230, scale: 0.5, opacity: 0.2, time: i * 90 },
      { x: ctx.toX + jx, y: ctx.toY, scale: 1.1, opacity: 1, time: o?.durationMs ?? 170 },
      { baseSize: size, tint: o?.tint, glowColor: ctx.color, blendAdd: o?.blendAdd ?? false, easing: "accel", after: "explode" },
    );
  }
};

// Razor Leaf / Rock Slide: several sprites fan out toward the target.
const scatter: Renderer = (engine, ctx, o) => {
  const tex = o?.tex ?? ctx.defaultTex;
  const count = o?.count ?? 6;
  const size = (o?.baseSize ?? 30) * (ctx.isCrit ? 1.2 : 1);
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const r = 10 + Math.random() * 30;
    const ex = ctx.toX + Math.cos(ang) * r;
    const ey = ctx.toY + Math.sin(ang) * r;
    engine.showEffect(
      tex,
      { x: ctx.fromX, y: ctx.fromY, scale: 0.6, time: i * 35 },
      { x: ex, y: ey, scale: 1, time: (o?.durationMs ?? 280) + Math.random() * 80 },
      { baseSize: size, tint: o?.tint, glowColor: ctx.color, blendAdd: o?.blendAdd, easing: "ballistic", spin: 0.22, after: "fade" },
    );
  }
  engine.spawnSparkleCloud(ctx.toX, ctx.toY, ctx.color, ctx.isCrit ? 40 : 30, ctx.isCrit ? 10 : 7);
};

// Slash / contact: a quick impact flash at the target (pairs with the attacker lunge).
const meleeContact: Renderer = (engine, ctx, o) => {
  const tex = o?.tex ?? ctx.defaultTex;
  const size = (o?.baseSize ?? 54) * (ctx.isCrit ? 1.3 : 1);
  const rot = (Math.random() - 0.5) * 0.7;
  engine.showEffect(
    tex,
    { x: ctx.toX, y: ctx.toY, scale: 0.5, opacity: 0.95, rotation: rot },
    { x: ctx.toX, y: ctx.toY, scale: 1.25, opacity: 0, rotation: rot, time: o?.durationMs ?? 220 },
    { baseSize: size, tint: o?.tint, glowColor: ctx.color, blendAdd: o?.blendAdd, easing: "decel", after: "remove" },
  );
  engine.spawnSparkleCloud(ctx.toX, ctx.toY, ctx.color, ctx.isCrit ? 46 : 34, ctx.isCrit ? 12 : 8);
};

// Swords Dance / stat buffs: rings + orbs rising around the user, no projectile.
const selfBuff: Renderer = (engine, ctx, o) => {
  const tex = o?.tex ?? ctx.defaultTex;
  engine.ringPulse(ctx.fromX, ctx.fromY, ctx.color, ctx.isCrit ? 120 : 95);
  engine.spawnSparkleCloud(ctx.fromX, ctx.fromY, ctx.color, 52, 14);
  const count = o?.count ?? 5;
  for (let i = 0; i < count; i++) {
    const ox = ctx.fromX + (Math.random() - 0.5) * 54;
    engine.showEffect(
      tex,
      { x: ox, y: ctx.fromY + 22, scale: 0.4, opacity: 0.9, time: i * 60 },
      { x: ox, y: ctx.fromY - 54, scale: 0.95, opacity: 0, time: o?.durationMs ?? 480 },
      { baseSize: o?.baseSize ?? 26, tint: o?.tint, glowColor: ctx.color, blendAdd: o?.blendAdd ?? false, easing: "decel", after: "remove" },
    );
  }
};

// Earthquake / Surf: expanding rings + low debris flung outward from the user.
const fieldAoe: Renderer = (engine, ctx, o) => {
  const tex = o?.tex ?? ctx.defaultTex;
  engine.ringPulse(ctx.fromX, ctx.fromY, ctx.color, ctx.isCrit ? 200 : 160);
  const count = o?.count ?? 10;
  const size = (o?.baseSize ?? 30) * (ctx.isCrit ? 1.2 : 1);
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const r = 60 + Math.random() * 120;
    engine.showEffect(
      tex,
      { x: ctx.fromX, y: ctx.fromY, scale: 0.5, opacity: 0.9, time: Math.random() * 60 },
      { x: ctx.fromX + Math.cos(ang) * r, y: ctx.fromY + Math.abs(Math.sin(ang)) * r * 0.5, scale: 0.9, opacity: 0, time: o?.durationMs ?? 420 },
      { baseSize: size, tint: o?.tint, glowColor: ctx.color, blendAdd: o?.blendAdd, easing: "decel", spin: 0.15, after: "remove" },
    );
  }
  engine.spawnSparkleCloud(ctx.fromX, ctx.fromY, ctx.color, 62, 16);
};

// Giga Drain / Absorb: a normal hit, then energy drains back to the attacker.
const recoilDrain: Renderer = (engine, ctx, o) => {
  projectile(engine, ctx, o);
  const tex = o?.tex ?? ctx.defaultTex;
  setTimeout(() => {
    for (let i = 0; i < 4; i++) {
      engine.showEffect(
        tex,
        { x: ctx.toX + (Math.random() - 0.5) * 22, y: ctx.toY, scale: 0.5, opacity: 0.85, time: i * 40 },
        { x: ctx.fromX, y: ctx.fromY, scale: 0.3, opacity: 0, time: 360 },
        { baseSize: 24, glowColor: ctx.color, blendAdd: true, easing: "accel", after: "remove" },
      );
    }
  }, 320);
};

const RENDERERS: Record<Archetype, Renderer> = {
  projectile,
  scatter,
  beam,
  stream,
  strike_from_sky: strikeFromSky,
  melee_contact: meleeContact,
  self_buff: selfBuff,
  field_aoe: fieldAoe,
  recoil_drain: recoilDrain,
};

// ─── Resolution ─────────────────────────────────────────────────────────────

export function defaultArchetype(_moveType: string, damageClass: string, isAoe: boolean): Archetype {
  if (isAoe) return "field_aoe";
  if (damageClass === "status") return "self_buff";
  if (damageClass === "physical") return "melee_contact";
  return "projectile";
}

// Curated per-move looks. Keyed on the lowercase internal move name. ~10 examples
// that exercise every archetype; extend this map one line at a time.
export const MOVE_OVERRIDES: Record<string, MoveOverride> = {
  flamethrower: { archetype: "stream", tex: "fireball", count: 12 },
  thunderbolt:  { archetype: "strike_from_sky", tex: "lightning" },
  "hydro-pump": { archetype: "beam", tex: "waterwisp" },
  "ice-beam":   { archetype: "beam", tex: "iceball" },
  "solar-beam": { archetype: "beam", tex: "energyball", charge: true },
  earthquake:   { archetype: "field_aoe", tex: "rock1" },
  "razor-leaf": { archetype: "scatter", tex: "leaf1", count: 6 },
  "leaf-blade": { archetype: "melee_contact", tex: "leftslash" },
  "shadow-ball": { archetype: "projectile", tex: "shadowball", blendAdd: true },
  "swords-dance": { archetype: "self_buff", tex: "sword" },
};

/** Resolve the move to an archetype and render it. */
export function playMove(engine: EffectEngine, ctx: MoveAnimContext): void {
  const override = MOVE_OVERRIDES[ctx.moveName];
  const archetype = override?.archetype ?? defaultArchetype(ctx.moveType, ctx.damageClass, ctx.isAoe);
  (RENDERERS[archetype] ?? projectile)(engine, ctx, override);
}
