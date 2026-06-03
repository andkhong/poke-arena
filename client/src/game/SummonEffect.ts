import * as PIXI from "pixi.js";

/** Draw a simple pokeball (red top, white bottom, black band + button). */
function drawPokeball(g: PIXI.Graphics, r: number): void {
  g.circle(0, 0, r).fill(0xee3322);                       // red base (top half)
  g.moveTo(r, 0).arc(0, 0, r, 0, Math.PI).fill(0xf5f5f5); // white bottom half
  g.rect(-r, -r * 0.13, r * 2, r * 0.26).fill(0x1a1a1a);  // center band
  g.circle(0, 0, r).stroke({ width: Math.max(1.5, r * 0.08), color: 0x1a1a1a });
  g.circle(0, 0, r * 0.33).fill(0x1a1a1a);                // button ring
  g.circle(0, 0, r * 0.2).fill(0xf5f5f5);                 // button center
}

// Beat between the ball landing and the Pokemon bursting out (it wiggles, then opens).
const SPAWN_DELAY_MS = 320;

/** Plays the "send-out" intro: a spinning pokeball drops from the top, then bursts open. */
export class SummonEffect {
  private container = new PIXI.Container();

  getContainer(): PIXI.Container {
    return this.container;
  }

  clear(): void {
    this.container.removeChildren().forEach((c) => c.destroy());
  }

  /**
   * Drop a spinning pokeball to (x, y) after delayMs (firing onDrop as it starts falling),
   * then — after a short settle delay — burst open and call onOpen().
   */
  dropAndOpen(
    x: number, y: number, color: number, delayMs: number,
    onDrop: () => void, onOpen: () => void,
  ): void {
    const ball = new PIXI.Graphics();
    drawPokeball(ball, 17);
    ball.x = x;
    ball.y = y;
    ball.alpha = 0;
    this.container.addChild(ball);

    const fromY = -70;
    const dropDur = 540;
    const startAt = Date.now() + delayMs;
    let started = false;

    const animate = () => {
      const now = Date.now();
      if (now < startAt) { requestAnimationFrame(animate); return; }
      if (!started) { started = true; onDrop(); } // play the drop sound as it begins to fall
      const t = Math.min((now - startAt) / dropDur, 1);
      ball.alpha = Math.min(1, t * 5);
      // accelerate downward, then a small bounce at the end
      const p = t < 0.82
        ? (t / 0.82) ** 2
        : 1 - Math.sin(((t - 0.82) / 0.18) * Math.PI) * 0.1;
      ball.y = fromY + (y - fromY) * Math.min(1, p);
      ball.rotation += 0.45; // spin clockwise
      if (t < 1) requestAnimationFrame(animate);
      else this.settleThenOpen(ball, x, y, color, onOpen);
    };
    requestAnimationFrame(animate);
  }

  /** The ball sits and wiggles for a beat, then bursts open. */
  private settleThenOpen(ball: PIXI.Graphics, x: number, y: number, color: number, onOpen: () => void): void {
    const start = Date.now();
    const animate = () => {
      const t = Math.min((Date.now() - start) / SPAWN_DELAY_MS, 1);
      ball.rotation = Math.sin(t * Math.PI * 5) * 0.24 * (1 - t); // rock side to side, fading
      if (t < 1) requestAnimationFrame(animate);
      else { ball.rotation = 0; this.openBall(ball, x, y, color, onOpen); }
    };
    requestAnimationFrame(animate);
  }

  private openBall(ball: PIXI.Graphics, x: number, y: number, color: number, onOpen: () => void): void {
    onOpen(); // reveal the Pokemon + play its cry

    const flash = new PIXI.Graphics();
    this.container.addChild(flash);
    const start = Date.now();
    const dur = 340;
    const animate = () => {
      const t = Math.min((Date.now() - start) / dur, 1);
      flash.clear()
        .circle(x, y, 8 + t * 42).fill({ color: 0xffffff, alpha: (1 - t) * 0.85 })
        .circle(x, y, 4 + t * 30).fill({ color, alpha: (1 - t) * 0.5 });
      ball.alpha = Math.max(0, 1 - t * 2.2);
      ball.scale.set(1 + t * 0.4);
      if (t < 1) requestAnimationFrame(animate);
      else {
        this.container.removeChild(flash); flash.destroy();
        this.container.removeChild(ball); ball.destroy();
      }
    };
    requestAnimationFrame(animate);
  }
}
