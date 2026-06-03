import * as PIXI from "pixi.js";
import { TYPE_COLORS } from "../styles/typeColors";

function typeColor(moveType: string): number {
  return parseInt((TYPE_COLORS[moveType] ?? "#66ddff").replace("#", ""), 16);
}

export class MoveEffect {
  private container: PIXI.Container;

  constructor() {
    this.container = new PIXI.Container();
  }

  getContainer(): PIXI.Container {
    return this.container;
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

    if (isAoe) {
      this.ringPulse(fromX, fromY, color, isCrit ? 160 : 120);
      return;
    }

    if (damageClass === "status") {
      this.ringPulse(fromX, fromY, color, isCrit ? 100 : 70);
      return;
    }

    switch (moveType) {
      case "fire":
      case "dragon":
        this.flameBeam(fromX, fromY, toX, toY, color, isCrit);
        break;
      case "electric":
        this.lightningBolt(fromX, fromY, toX, toY, color, isCrit);
        break;
      case "water":
      case "ice":
        this.waterSplash(toX, toY, color, isCrit);
        this.spawnSparkleCloud(fromX, fromY, color, 25, 7);
        break;
      case "psychic":
      case "fairy":
      case "ghost":
        this.ringPulse(toX, toY, color, isCrit ? 90 : 65);
        this.spawnSparkleCloud(fromX, fromY, color, 28, 8);
        break;
      case "poison":
      case "bug":
        this.poisonCloud(toX, toY, color, isCrit);
        break;
      case "grass":
        this.leafBurst(toX, toY, color, isCrit);
        break;
      case "ground":
      case "rock":
        this.rockChunks(toX, toY, color, isCrit);
        break;
      default:
        if (damageClass === "physical") {
          this.slashMark(toX, toY, color, isCrit);
        } else {
          this.spawnSparkleCloud(toX, toY, color, isCrit ? 80 : 60, isCrit ? 26 : 20);
          this.spawnSparkleCloud(fromX, fromY, color, isCrit ? 44 : 33, 10);
        }
    }
  }

  // ─── Flame beam: chain of expanding fireballs from attacker to target ─────────
  private flameBeam(fromX: number, fromY: number, toX: number, toY: number, color: number, isCrit: boolean): void {
    const count = isCrit ? 10 : 7;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const totalDur = 380;

    for (let i = 0; i < count; i++) {
      const t0 = i / (count - 1);
      const cx = fromX + dx * t0;
      const cy = fromY + dy * t0;
      const baseR = (isCrit ? 15 : 11) * (0.4 + t0 * 0.6);
      const delay = i * 30;

      const g = new PIXI.Graphics();
      this.container.addChild(g);

      const startTime = Date.now() + delay;
      const animate = () => {
        const now = Date.now();
        if (now < startTime) { requestAnimationFrame(animate); return; }
        const t = Math.min((now - startTime) / totalDur, 1);
        g.clear()
          .circle(0, 0, baseR * (1 + t * 0.6))
          .fill({ color, alpha: (1 - t) * 0.92 });
        // Bright yellow core
        g.circle(0, 0, baseR * 0.45)
          .fill({ color: 0xffdd44, alpha: (1 - t) * 0.85 });
        g.x = cx;
        g.y = cy;
        if (t < 1) requestAnimationFrame(animate);
        else { this.container.removeChild(g); g.destroy(); }
      };
      requestAnimationFrame(animate);
    }

    // Impact burst
    this.spawnSparkleCloud(toX, toY, color, isCrit ? 70 : 50, isCrit ? 20 : 13);
  }

  // ─── Lightning bolt: zigzag line from attacker to target ─────────────────────
  private lightningBolt(fromX: number, fromY: number, toX: number, toY: number, color: number, isCrit: boolean): void {
    const segs = isCrit ? 6 : 4;
    const len = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
    if (len < 1) return;

    const pts: { x: number; y: number }[] = [{ x: fromX, y: fromY }];
    const nx = -(toY - fromY) / len;
    const ny = (toX - fromX) / len;
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const mx = fromX + (toX - fromX) * t;
      const my = fromY + (toY - fromY) * t;
      const perp = (Math.random() - 0.5) * (isCrit ? 44 : 28);
      pts.push({ x: mx + nx * perp, y: my + ny * perp });
    }
    pts.push({ x: toX, y: toY });

    const g = new PIXI.Graphics();
    this.container.addChild(g);

    const duration = 300;
    const startTime = Date.now();
    const animate = () => {
      const t = Math.min((Date.now() - startTime) / duration, 1);
      const alpha = 1 - t;
      g.clear();
      // Outer glow stroke
      g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
      g.stroke({ width: isCrit ? 6 : 4, color, alpha: alpha * 0.55 });
      // Main bolt
      g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
      g.stroke({ width: isCrit ? 3 : 2, color, alpha });
      // White core
      g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
      g.stroke({ width: isCrit ? 1.5 : 1, color: 0xffffff, alpha: alpha * 0.9 });
      if (t < 1) requestAnimationFrame(animate);
      else { this.container.removeChild(g); g.destroy(); }
    };
    requestAnimationFrame(animate);

    this.spawnSparkleCloud(toX, toY, color, isCrit ? 55 : 40, isCrit ? 14 : 9);
  }

  // ─── Water splash: fan of droplets at target ──────────────────────────────────
  private waterSplash(cx: number, cy: number, color: number, isCrit: boolean): void {
    const count = isCrit ? 20 : 13;
    const radius = isCrit ? 72 : 52;
    const duration = 480;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 0.6 + Math.random() * 0.5;
      const g = new PIXI.Graphics()
        .ellipse(0, 0, 3.5, 8)
        .fill({ color, alpha: 0.88 });
      g.rotation = angle + Math.PI / 2;
      g.x = cx;
      g.y = cy;
      this.container.addChild(g);

      const startTime = Date.now();
      const animate = () => {
        const t = Math.min((Date.now() - startTime) / (duration * speed), 1);
        g.x = cx + Math.cos(angle) * t * radius;
        g.y = cy + Math.sin(angle) * t * radius + t * t * 18;
        g.alpha = t < 0.45 ? 0.88 : 0.88 * (1 - (t - 0.45) / 0.55);
        if (t < 1) requestAnimationFrame(animate);
        else { this.container.removeChild(g); g.destroy(); }
      };
      requestAnimationFrame(animate);
    }
  }

  // ─── Ring pulse: concentric expanding rings ───────────────────────────────────
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

  // ─── Poison cloud: upward-drifting bubbles ────────────────────────────────────
  private poisonCloud(cx: number, cy: number, color: number, isCrit: boolean): void {
    const count = isCrit ? 22 : 14;
    const duration = 680;

    for (let i = 0; i < count; i++) {
      const r = 3 + Math.random() * 5.5;
      const startX = cx + (Math.random() - 0.5) * 55;
      const startY = cy + (Math.random() - 0.5) * 30;
      const driftX = (Math.random() - 0.5) * 38;
      const driftY = -(22 + Math.random() * 45);
      const delay = Math.random() * 180;

      const g = new PIXI.Graphics()
        .circle(0, 0, r)
        .fill({ color, alpha: 0 });
      g.x = startX;
      g.y = startY;
      this.container.addChild(g);

      const startTime = Date.now() + delay;
      const animate = () => {
        const now = Date.now();
        if (now < startTime) { requestAnimationFrame(animate); return; }
        const t = Math.min((now - startTime) / duration, 1);
        g.x = startX + driftX * t;
        g.y = startY + driftY * t;
        g.alpha = t < 0.2 ? t * 5 * 0.78 : 0.78 * (1 - (t - 0.2) / 0.8);
        if (t < 1) requestAnimationFrame(animate);
        else { this.container.removeChild(g); g.destroy(); }
      };
      requestAnimationFrame(animate);
    }
  }

  // ─── Leaf burst: spinning leaves radiating outward ────────────────────────────
  private leafBurst(cx: number, cy: number, color: number, isCrit: boolean): void {
    const count = isCrit ? 16 : 10;
    const radius = isCrit ? 68 : 48;
    const duration = 560;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 0.65 + Math.random() * 0.55;
      const delay = i * 18;

      const g = new PIXI.Graphics()
        .ellipse(0, 0, 4.5, 10)
        .fill({ color, alpha: 0.92 });
      g.rotation = angle + Math.PI;
      g.x = cx;
      g.y = cy;
      this.container.addChild(g);

      const startTime = Date.now() + delay;
      const animate = () => {
        const now = Date.now();
        if (now < startTime) { requestAnimationFrame(animate); return; }
        const t = Math.min((now - startTime) / (duration * speed), 1);
        g.x = cx + Math.cos(angle) * t * radius;
        g.y = cy + Math.sin(angle) * t * radius;
        g.rotation = angle + t * Math.PI * 3.5;
        g.alpha = t < 0.5 ? 0.92 : 0.92 * (1 - (t - 0.5) / 0.5);
        if (t < 1) requestAnimationFrame(animate);
        else { this.container.removeChild(g); g.destroy(); }
      };
      requestAnimationFrame(animate);
    }
  }

  // ─── Slash marks: diagonal lines at target ────────────────────────────────────
  private slashMark(cx: number, cy: number, color: number, isCrit: boolean): void {
    const slashes = isCrit ? 3 : 2;
    const length = isCrit ? 58 : 42;
    const duration = 360;

    for (let s = 0; s < slashes; s++) {
      const angle = -Math.PI / 4 + s * (Math.PI / 8);
      const offset = (s - (slashes - 1) / 2) * 14;
      const perpAngle = angle + Math.PI / 2;
      const sx = cx + Math.cos(perpAngle) * offset;
      const sy = cy + Math.sin(perpAngle) * offset;
      const x1 = sx - Math.cos(angle) * length / 2;
      const y1 = sy - Math.sin(angle) * length / 2;
      const x2 = sx + Math.cos(angle) * length / 2;
      const y2 = sy + Math.sin(angle) * length / 2;
      const delay = s * 45;

      const g = new PIXI.Graphics();
      this.container.addChild(g);

      const startTime = Date.now() + delay;
      const animate = () => {
        const now = Date.now();
        if (now < startTime) { requestAnimationFrame(animate); return; }
        const t = Math.min((now - startTime) / duration, 1);
        const alpha = t < 0.25 ? 1 : 1 - (t - 0.25) / 0.75;
        g.clear();
        g.moveTo(x1, y1).lineTo(x2, y2).stroke({ width: 3.5, color, alpha });
        g.moveTo(x1, y1).lineTo(x2, y2).stroke({ width: 1.5, color: 0xffffff, alpha: alpha * 0.75 });
        if (t < 1) requestAnimationFrame(animate);
        else { this.container.removeChild(g); g.destroy(); }
      };
      requestAnimationFrame(animate);
    }
  }

  // ─── Rock chunks: falling boulders ───────────────────────────────────────────
  private rockChunks(cx: number, cy: number, color: number, isCrit: boolean): void {
    const count = isCrit ? 12 : 8;
    const duration = 500;

    for (let i = 0; i < count; i++) {
      const size = 4 + Math.random() * 7;
      const vx = (Math.random() - 0.5) * 80;
      const vy = -30 - Math.random() * 50;
      const startX = cx + (Math.random() - 0.5) * 40;
      const delay = Math.random() * 120;

      const g = new PIXI.Graphics()
        .rect(-size / 2, -size / 2, size, size)
        .fill({ color, alpha: 0.9 });
      g.rotation = Math.random() * Math.PI;
      g.x = startX;
      g.y = cy;
      this.container.addChild(g);

      const startTime = Date.now() + delay;
      const animate = () => {
        const now = Date.now();
        if (now < startTime) { requestAnimationFrame(animate); return; }
        const t = Math.min((now - startTime) / duration, 1);
        g.x = startX + vx * t;
        g.y = cy + vy * t + 120 * t * t; // gravity
        g.rotation += 0.04;
        g.alpha = t < 0.5 ? 0.9 : 0.9 * (1 - (t - 0.5) / 0.5);
        if (t < 1) requestAnimationFrame(animate);
        else { this.container.removeChild(g); g.destroy(); }
      };
      requestAnimationFrame(animate);
    }
  }

  // ─── Generic sparkle cloud (fallback + secondary hit burst) ──────────────────
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
