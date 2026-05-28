import * as PIXI from "pixi.js";
import { HPBarSprite } from "./HPBarSprite";

const SPRITE_SCALE = 2.5;
const FALLBACK_SIZE = 48;

export class PokemonSprite {
  private container: PIXI.Container;
  private sprite: PIXI.Sprite | PIXI.AnimatedSprite | null = null;
  private placeholder: PIXI.Graphics | null = null;
  private hpBar: HPBarSprite;
  private nameLabel: PIXI.Text;
  private isShaking = false;
  private isLunging = false;
  pokemonId: number;

  constructor(pokemonId: number, spriteUrl: string, maxHp: number, displayName: string, isMe: boolean) {
    this.pokemonId = pokemonId;
    this.container = new PIXI.Container();
    console.log("[PokemonSprite] constructor id=", pokemonId, "url=", spriteUrl, "isMe=", isMe);

    // Immediate colored placeholder — visible before async sprite loads
    const ph = new PIXI.Graphics()
      .rect(-FALLBACK_SIZE / 2, -FALLBACK_SIZE, FALLBACK_SIZE, FALLBACK_SIZE)
      .fill({ color: isMe ? 0x44bb66 : 0xee4422 });
    this.placeholder = ph;
    this.container.addChild(ph);

    this.hpBar = new HPBarSprite(maxHp, 72);
    this.hpBar.getContainer().x = -36;
    this.hpBar.getContainer().y = -60;
    this.container.addChild(this.hpBar.getContainer());

    const nameStyle = { fontSize: 10, fill: isMe ? 0x88ff88 : 0xffffff, fontFamily: "monospace" };
    this.nameLabel = new PIXI.Text({ text: displayName, style: nameStyle });
    this.nameLabel.anchor.set(0.5, 1);
    this.nameLabel.y = -62;
    this.container.addChild(this.nameLabel);

    this.loadSprite(spriteUrl);
  }

  // Pixi v8 has no built-in GIF loader — convert animated GIF URLs to their static PNG equivalents
  private static toPngUrl(url: string): string {
    if (!url.endsWith(".gif")) return url;
    const idMatch = url.match(/\/(\d+)\.gif$/);
    if (!idMatch) return url;
    const id = idMatch[1];
    const base = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
    return url.includes("/back/") ? `${base}/back/${id}.png` : `${base}/${id}.png`;
  }

  private async loadSprite(url: string): Promise<void> {
    const loadUrl = PokemonSprite.toPngUrl(url);
    try {
      console.log("[PokemonSprite] loading url=", loadUrl);
      const asset = await PIXI.Assets.load(loadUrl);
      console.log("[PokemonSprite] loaded asset type=", typeof asset, "keys=", asset ? Object.keys(asset).join(",") : "null");

      let sprite: PIXI.Sprite | PIXI.AnimatedSprite;
      if (asset?.textures) {
        sprite = new PIXI.AnimatedSprite(asset.textures as PIXI.Texture[]);
        (sprite as PIXI.AnimatedSprite).animationSpeed = 0.15;
        (sprite as PIXI.AnimatedSprite).play();
      } else {
        sprite = new PIXI.Sprite(asset as PIXI.Texture);
      }
      sprite.anchor.set(0.5, 1);
      sprite.scale.set(SPRITE_SCALE);
      this.sprite = sprite;

      // Remove placeholder and add real sprite
      if (this.placeholder) {
        this.container.removeChild(this.placeholder);
        this.placeholder.destroy();
        this.placeholder = null;
      }
      this.container.addChild(sprite);
      console.log("[PokemonSprite] sprite added id=", this.pokemonId);
    } catch (err) {
      console.error("[PokemonSprite] Failed to load sprite:", url, err);
      // Keep the placeholder but recolor to blue so it's distinguishable
      if (this.placeholder) {
        this.placeholder.clear()
          .rect(-FALLBACK_SIZE / 2, -FALLBACK_SIZE, FALLBACK_SIZE, FALLBACK_SIZE)
          .fill({ color: 0x4466aa });
      }
    }
  }

  setPosition(x: number, y: number, logicalW: number, logicalH: number, canvasW: number, canvasH: number): void {
    this.container.x = (x / logicalW) * canvasW;
    this.container.y = (y / logicalH) * canvasH;
  }

  updateHP(hp: number): void {
    this.hpBar.update(hp);
    if (hp <= 0) this.container.alpha = 0.3;
  }

  updateFacing(facingRight: boolean): void {
    if (this.sprite) {
      this.sprite.scale.x = facingRight ? SPRITE_SCALE : -SPRITE_SCALE;
    } else if (this.placeholder) {
      this.placeholder.scale.x = facingRight ? 1 : -1;
    }
  }

  playAttack(targetX: number, targetY: number): void {
    if (this.isLunging) return;
    this.isLunging = true;
    const origX = this.container.x;
    const origY = this.container.y;
    const dx = (targetX - origX) * 0.15;
    const dy = (targetY - origY) * 0.15;

    const start = Date.now();
    const tick = () => {
      const t = (Date.now() - start) / 200;
      if (t < 0.5) {
        this.container.x = origX + dx * (t * 2);
        this.container.y = origY + dy * (t * 2);
      } else if (t < 1) {
        this.container.x = origX + dx * (2 - t * 2);
        this.container.y = origY + dy * (2 - t * 2);
      } else {
        this.container.x = origX;
        this.container.y = origY;
        this.isLunging = false;
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  playHit(): void {
    if (this.isShaking) return;
    this.isShaking = true;
    const origX = this.container.x;
    const shakes = [8, -8, 6, -6, 0];
    let i = 0;
    const step = () => {
      if (i >= shakes.length) { this.isShaking = false; return; }
      this.container.x = origX + shakes[i++];
      setTimeout(step, 60);
    };
    step();

    // Flash alpha to indicate hit
    const target = this.sprite ?? this.placeholder;
    if (target) {
      target.alpha = 0.2;
      setTimeout(() => { if (target) target.alpha = 1; }, 100);
      setTimeout(() => { if (target) target.alpha = 0.2; }, 150);
      setTimeout(() => { if (target) target.alpha = 1; }, 250);
    }
  }

  getContainer(): PIXI.Container {
    return this.container;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
