import * as PIXI from "pixi.js";
import { TYPE_COLORS } from "../styles/typeColors";

function typeColor(moveType: string): number {
  return parseInt((TYPE_COLORS[moveType] ?? "#66ddff").replace("#", ""), 16);
}

// Downloaded Pokemon Showdown effect sprites (served from client/public/fx), mapped per
// move TYPE. A move picks one of its type's sprites at random for variety.
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

export class MoveEffect {
  private container: PIXI.Container;
  private textures = new Map<string, PIXI.Texture>();

  constructor() {
    this.container = new PIXI.Container();
    void this.preloadTextures();
  }

  /** Preload every FX sprite once so attacks can render instantly. */
  private async preloadTextures(): Promise<void> {
    const names = Array.from(new Set([...Object.values(TYPE_FX).flat(), FALLBACK_FX]));
    await Promise.all(
      names.map(async (name) => {
        try {
          const tex = (await PIXI.Assets.load(`${FX_BASE}/${name}.png`)) as PIXI.Texture;
          this.textures.set(name, tex);
        } catch (err) {
          console.warn("[MoveEffect] failed to load fx", name, err);
        }
      })
    );
  }

  getContainer(): PIXI.Container {
    return this.container;
  }

  /** Pick a loaded texture for the move's type (random among its variants), or fallback. */
  private pickTexture(moveType: string): PIXI.Texture | null {
    const names = [...(TYPE_FX[moveType] ?? [FALLBACK_FX])].sort(() => Math.random() - 0.5);
    for (const n of names) {
      const t = this.textures.get(n);
      if (t) return t;
    }
    return this.textures.get(FALLBACK_FX) ?? null;
  }

  /** Scale a texture so its largest dimension is roughly `target` px. */
  private scaleFor(tex: PIXI.Texture, target: number): number {
    return target / (Math.max(tex.width, tex.height) || target);
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

  fire(
    fromX: number, fromY: number,
    toX: number, toY: number,
    moveType: string,
    damageClass: string,
    isAoe: boolean,
    _effectiveness: number,
    isCrit: boolean,
  ): void {
    const color = typeColor(moveType);
    const tex = this.pickTexture(moveType);

    // Fallback to procedural sparkles if assets haven't finished loading.
    if (!tex) {
      if (isAoe || damageClass === "status") this.ringPulse(fromX, fromY, color, isCrit ? 140 : 100);
      else this.spawnSparkleCloud(toX, toY, color, isCrit ? 70 : 50, isCrit ? 20 : 14);
      return;
    }

    if (isAoe) {
      this.ringPulse(fromX, fromY, color, isCrit ? 150 : 110);
      this.burstFx(tex, fromX, fromY, color, isCrit ? 2.4 : 1.9, isCrit);
      return;
    }
    if (damageClass === "status") {
      this.burstFx(tex, fromX, fromY, color, isCrit ? 1.5 : 1.2, isCrit);
      return;
    }
    this.flyProjectile(tex, fromX, fromY, toX, toY, color, isCrit);
  }

  // ─── Textured projectile: fly the FX sprite from attacker to target ──────────
  private flyProjectile(
    tex: PIXI.Texture,
    fromX: number, fromY: number,
    toX: number, toY: number,
    color: number, isCrit: boolean,
  ): void {
    const sprite = new PIXI.Sprite(tex);
    sprite.anchor.set(0.5);
    const baseScale = this.scaleFor(tex, isCrit ? 58 : 46);
    sprite.scale.set(baseScale);
    sprite.x = fromX;
    sprite.y = fromY;
    this.container.addChild(sprite);

    const dur = 300;
    const start = Date.now();
    const arc = -Math.min(40, Math.hypot(toX - fromX, toY - fromY) * 0.12);
    const animate = () => {
      const t = Math.min((Date.now() - start) / dur, 1);
      sprite.x = fromX + (toX - fromX) * t;
      sprite.y = fromY + (toY - fromY) * t + Math.sin(t * Math.PI) * arc;
      sprite.rotation += 0.35;
      sprite.scale.set(baseScale * (1 + t * 0.15));
      if (t < 1) requestAnimationFrame(animate);
      else {
        this.container.removeChild(sprite); sprite.destroy();
        this.impactFx(tex, toX, toY, color, isCrit);
      }
    };
    requestAnimationFrame(animate);
  }

  // ─── Impact: a quick expanding pop of the sprite + a sparkle burst ───────────
  private impactFx(tex: PIXI.Texture, x: number, y: number, color: number, isCrit: boolean): void {
    const s = new PIXI.Sprite(tex);
    s.anchor.set(0.5);
    s.x = x;
    s.y = y;
    const base = this.scaleFor(tex, isCrit ? 64 : 50);
    this.container.addChild(s);

    const dur = 240;
    const start = Date.now();
    const animate = () => {
      const t = Math.min((Date.now() - start) / dur, 1);
      s.scale.set(base * (1 + t * 1.3));
      s.alpha = 1 - t;
      s.rotation += 0.1;
      if (t < 1) requestAnimationFrame(animate);
      else { this.container.removeChild(s); s.destroy(); }
    };
    requestAnimationFrame(animate);
    this.spawnSparkleCloud(x, y, color, isCrit ? 60 : 42, isCrit ? 16 : 11);
  }

  // ─── Burst in place (status / AoE) ───────────────────────────────────────────
  private burstFx(tex: PIXI.Texture, x: number, y: number, color: number, scaleMul: number, isCrit: boolean): void {
    const s = new PIXI.Sprite(tex);
    s.anchor.set(0.5);
    s.x = x;
    s.y = y;
    const base = this.scaleFor(tex, 52) * scaleMul;
    this.container.addChild(s);

    const dur = 360;
    const start = Date.now();
    const animate = () => {
      const t = Math.min((Date.now() - start) / dur, 1);
      s.scale.set(base * (0.6 + t * 0.7));
      s.alpha = t < 0.4 ? 1 : 1 - (t - 0.4) / 0.6;
      s.rotation += 0.06;
      if (t < 1) requestAnimationFrame(animate);
      else { this.container.removeChild(s); s.destroy(); }
    };
    requestAnimationFrame(animate);
    this.spawnSparkleCloud(x, y, color, isCrit ? 50 : 36, isCrit ? 12 : 9);
  }

  // ─── Ring pulse: concentric expanding rings (AoE / status / fallback) ────────
  private ringPulse(cx: number, cy: number, color: number, maxRadius: number): void {
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
  private spawnSparkleCloud(cx: number, cy: number, color: number, radius: number, count: number): void {
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
