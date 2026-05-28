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

  // Floating move name above the attacker
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

  // Floating damage number on the target
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
    _damageClass: string,
    isAoe: boolean,
    _effectiveness: number,
    isCrit: boolean,
  ): void {
    const color = typeColor(moveType);

    if (isAoe) {
      this.spawnSparkleCloud(fromX, fromY, color, 110, 28);
      return;
    }

    // Main burst at the target
    const mainRadius = isCrit ? 80 : 60;
    this.spawnSparkleCloud(toX, toY, color, mainRadius, isCrit ? 26 : 20);

    // Smaller secondary at attacker (matches video — both Pokemon glow)
    this.spawnSparkleCloud(fromX, fromY, color, mainRadius * 0.55, 10);
  }

  private spawnSparkleCloud(cx: number, cy: number, color: number, radius: number, count: number): void {
    const duration = 620;

    // Central soft glow blob
    const glow = new PIXI.Graphics()
      .circle(0, 0, radius * 0.75)
      .fill({ color, alpha: 0.28 });
    glow.x = cx;
    glow.y = cy;
    this.container.addChild(glow);

    const glowStart = Date.now();
    const glowTick = () => {
      const t = Math.min((Date.now() - glowStart) / duration, 1);
      glow.alpha = (1 - t) * 0.28;
      glow.scale.set(1 + t * 0.35);
      if (t < 1) requestAnimationFrame(glowTick);
      else { this.container.removeChild(glow); glow.destroy(); }
    };
    requestAnimationFrame(glowTick);

    // Scatter sparkle particles
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spawnR = Math.random() * radius * 0.5;
      const size = 2.5 + Math.random() * 4.5;
      const speed = 0.55 + Math.random() * 0.7;
      const startAlpha = 0.65 + Math.random() * 0.35;

      const p = new PIXI.Graphics()
        .circle(0, 0, size)
        .fill({ color, alpha: startAlpha });
      p.x = cx + Math.cos(angle) * spawnR;
      p.y = cy + Math.sin(angle) * spawnR;
      this.container.addChild(p);

      const pStart = Date.now() + Math.random() * 80; // slight stagger
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
