import * as PIXI from "pixi.js";

export class ArenaBackground {
  private container: PIXI.Container;

  constructor(width: number, height: number) {
    this.container = new PIXI.Container();

    // Outer background — warm tan-brown
    const bg = new PIXI.Graphics()
      .rect(0, 0, width, height)
      .fill({ color: 0xc4a870 });
    this.container.addChild(bg);

    // Octagonal arena floor — light cream/sand
    const mx = width * 0.10;   // horizontal margin
    const my = height * 0.09;  // vertical margin
    const cut = Math.min(width, height) * 0.095; // corner cut size

    const pts = [
      mx + cut,         my,
      width - mx - cut, my,
      width - mx,       my + cut,
      width - mx,       height - my - cut,
      width - mx - cut, height - my,
      mx + cut,         height - my,
      mx,               height - my - cut,
      mx,               my + cut,
    ];

    const floor = new PIXI.Graphics()
      .poly(pts)
      .fill({ color: 0xe8d4a0 });
    this.container.addChild(floor);

    // Subtle inner shadow border
    const border = new PIXI.Graphics()
      .poly(pts)
      .stroke({ width: 3, color: 0xb89860, alpha: 0.45 });
    this.container.addChild(border);
  }

  getContainer(): PIXI.Container {
    return this.container;
  }
}
