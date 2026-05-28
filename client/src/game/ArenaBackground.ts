import * as PIXI from "pixi.js";

export class ArenaBackground {
  private container: PIXI.Container;

  constructor(width: number, height: number) {
    this.container = new PIXI.Container();

    // Dark grass field
    const bg = new PIXI.Graphics()
      .rect(0, 0, width, height)
      .fill({ color: 0x1a2e1a });
    this.container.addChild(bg);

    // Grid lines for depth
    const grid = new PIXI.Graphics();
    grid.setStrokeStyle({ width: 1, color: 0x2a3e2a, alpha: 0.5 });
    for (let x = 0; x < width; x += 80) {
      grid.moveTo(x, 0).lineTo(x, height);
    }
    for (let y = 0; y < height; y += 80) {
      grid.moveTo(0, y).lineTo(width, y);
    }
    grid.stroke();
    this.container.addChild(grid);

    // Center circle
    const circle = new PIXI.Graphics()
      .circle(width / 2, height / 2, 120)
      .stroke({ width: 2, color: 0x3a5e3a, alpha: 0.7 });
    this.container.addChild(circle);

    // Arena border
    const border = new PIXI.Graphics()
      .rect(2, 2, width - 4, height - 4)
      .stroke({ width: 3, color: 0x4a7a4a, alpha: 0.8 });
    this.container.addChild(border);
  }

  getContainer(): PIXI.Container {
    return this.container;
  }
}
