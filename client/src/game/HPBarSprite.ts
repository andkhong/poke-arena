import * as PIXI from "pixi.js";

export class HPBarSprite {
  private container: PIXI.Container;
  private bg: PIXI.Graphics;
  private bar: PIXI.Graphics;
  private label: PIXI.Text;
  private maxHp: number;
  private width: number;

  constructor(maxHp: number, width = 64) {
    this.maxHp = maxHp;
    this.width = width;
    this.container = new PIXI.Container();

    this.bg = new PIXI.Graphics()
      .rect(0, 0, width, 7)
      .fill({ color: 0x222222 });

    this.bar = new PIXI.Graphics();

    this.label = new PIXI.Text({
      text: `${maxHp}`,
      style: { fontSize: 9, fill: 0xffffff, fontFamily: "monospace" },
    });
    this.label.y = 9;

    this.container.addChild(this.bg, this.bar, this.label);
    this.update(maxHp);
  }

  update(currentHp: number): void {
    const pct = Math.max(0, currentHp / this.maxHp);
    const color = pct > 0.5 ? 0x44cc44 : pct > 0.25 ? 0xffcc00 : 0xff4444;

    this.bar.clear()
      .rect(0, 0, Math.floor(this.width * pct), 7)
      .fill({ color });

    this.label.text = `${currentHp}`;
  }

  getContainer(): PIXI.Container {
    return this.container;
  }
}
