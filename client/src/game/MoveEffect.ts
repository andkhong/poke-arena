import * as PIXI from "pixi.js";
import { TYPE_COLORS } from "../styles/typeColors";

function typeColor(moveType: string): number {
  return parseInt((TYPE_COLORS[moveType] ?? "#ffffff").replace("#", ""), 16);
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
      text: moveName,
      style: {
        fontSize: 13,
        fill: color,
        fontFamily: "monospace",
        fontWeight: "bold",
        stroke: { color: 0x000000, width: 3 },
      },
    });
    label.anchor.set(0.5, 1);
    label.x = x;
    label.y = y - 65;
    this.container.addChild(label);

    const start = Date.now();
    const duration = 1100;
    const startY = label.y;
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      label.y = startY - t * 35;
      label.alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
      if (t < 1) requestAnimationFrame(tick);
      else { this.container.removeChild(label); label.destroy(); }
    };
    requestAnimationFrame(tick);
  }

  // Floating damage number on the target
  showDamage(x: number, y: number, damage: number, effectiveness: number, isCrit: boolean): void {
    if (damage <= 0) return;
    const text = isCrit ? `${damage}!` : String(damage);
    const color = isCrit ? 0xffdd00
      : effectiveness >= 2 ? 0xff5544
      : effectiveness <= 0.5 ? 0x88aaff
      : 0xffffff;

    const label = new PIXI.Text({
      text,
      style: {
        fontSize: isCrit ? 20 : 15,
        fill: color,
        fontFamily: "monospace",
        fontWeight: "bold",
        stroke: { color: 0x000000, width: 3 },
      },
    });
    label.anchor.set(0.5, 1);
    label.x = x + (Math.random() - 0.5) * 24;
    label.y = y - 20;
    this.container.addChild(label);

    const start = Date.now();
    const duration = 900;
    const startY = label.y;
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      label.y = startY - t * 55;
      label.alpha = t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5;
      if (t < 1) requestAnimationFrame(tick);
      else { this.container.removeChild(label); label.destroy(); }
    };
    requestAnimationFrame(tick);
  }

  fire(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    moveType: string,
    damageClass: string,
    isAoe: boolean,
    effectiveness: number,
    isCrit: boolean,
  ): void {
    const color = typeColor(moveType);

    if (isAoe) {
      this.spawnAoeRing(fromX, fromY, color);
      return;
    }

    if (damageClass === "physical") {
      // Physical: fast dash line + impact burst at target
      this.spawnDashLine(fromX, fromY, toX, toY, color);
      setTimeout(() => this.spawnImpactBurst(toX, toY, color, isCrit), 80);
    } else if (damageClass === "special") {
      // Special: projectile orb flying toward target
      this.spawnProjectile(fromX, fromY, toX, toY, color, effectiveness, isCrit);
    } else {
      // Status: sparkle at target
      this.spawnSparkle(toX, toY, color);
    }
  }

  private spawnProjectile(
    fromX: number, fromY: number,
    toX: number, toY: number,
    color: number, effectiveness: number, isCrit: boolean
  ): void {
    const size = isCrit ? 16 : effectiveness >= 2 ? 14 : effectiveness <= 0.5 ? 8 : 11;

    const orb = new PIXI.Graphics()
      .circle(0, 0, size)
      .fill({ color, alpha: 0.95 });

    if (effectiveness >= 2 || isCrit) {
      const glow = new PIXI.Graphics()
        .circle(0, 0, size + 7)
        .fill({ color, alpha: 0.25 });
      orb.addChild(glow);
    }

    orb.x = fromX;
    orb.y = fromY;
    this.container.addChild(orb);

    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = Math.max(120, Math.min(380, dist * 1.1));
    const start = Date.now();

    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      orb.x = fromX + dx * t;
      orb.y = fromY + dy * t;
      orb.alpha = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        this.container.removeChild(orb);
        orb.destroy();
        this.spawnImpactBurst(toX, toY, color, isCrit);
      }
    };
    requestAnimationFrame(tick);
  }

  private spawnDashLine(fromX: number, fromY: number, toX: number, toY: number, color: number): void {
    const line = new PIXI.Graphics();
    line.setStrokeStyle({ width: 3, color, alpha: 0.8 });
    line.moveTo(fromX, fromY).lineTo(toX, toY).stroke();
    this.container.addChild(line);

    const start = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - start) / 180, 1);
      line.alpha = 1 - t;
      if (t < 1) requestAnimationFrame(tick);
      else { this.container.removeChild(line); line.destroy(); }
    };
    requestAnimationFrame(tick);
  }

  private spawnImpactBurst(cx: number, cy: number, color: number, isCrit: boolean): void {
    const maxR = isCrit ? 55 : 35;
    const burst = new PIXI.Graphics();
    this.container.addChild(burst);

    const start = Date.now();
    const duration = 280;
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      burst.clear()
        .circle(cx, cy, t * maxR)
        .fill({ color, alpha: (1 - t) * 0.65 });
      if (t < 1) requestAnimationFrame(tick);
      else { this.container.removeChild(burst); burst.destroy(); }
    };
    requestAnimationFrame(tick);
  }

  private spawnSparkle(cx: number, cy: number, color: number): void {
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const dot = new PIXI.Graphics().circle(0, 0, 5).fill({ color, alpha: 0.9 });
      dot.x = cx + Math.cos(angle) * 20;
      dot.y = cy + Math.sin(angle) * 20;
      this.container.addChild(dot);

      const start = Date.now();
      const speed = 0.8 + Math.random() * 0.4;
      const tick = () => {
        const t = Math.min((Date.now() - start) / (500 * speed), 1);
        dot.x = cx + Math.cos(angle) * (20 + t * 40);
        dot.y = cy + Math.sin(angle) * (20 + t * 40);
        dot.alpha = 1 - t;
        if (t < 1) requestAnimationFrame(tick);
        else { this.container.removeChild(dot); dot.destroy(); }
      };
      requestAnimationFrame(tick);
    }
  }

  private spawnAoeRing(cx: number, cy: number, color: number): void {
    const ring = new PIXI.Graphics();
    this.container.addChild(ring);

    const start = Date.now();
    const duration = 500;
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      ring.clear()
        .circle(cx, cy, t * 180)
        .stroke({ width: 4, color, alpha: (1 - t) * 0.85 });
      if (t < 1) requestAnimationFrame(tick);
      else { this.container.removeChild(ring); ring.destroy(); }
    };
    requestAnimationFrame(tick);
  }
}
