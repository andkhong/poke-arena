import * as PIXI from "pixi.js";

const SPRITE_SCALE = 1.5;
const FALLBACK_SIZE = 32;

export class PokemonSprite {
  private container: PIXI.Container;
  private sprite: PIXI.Sprite | PIXI.AnimatedSprite | null = null;
  private placeholder: PIXI.Graphics | null = null;
  private isShaking = false;
  private isLunging = false;
  private isDestroyed = false;
  private isFainting = false;
  private lastHp = Infinity;
  pokemonId: number;

  constructor(pokemonId: number, spriteUrl: string, _maxHp: number, _displayName: string, _isMe: boolean) {
    this.pokemonId = pokemonId;
    this.container = new PIXI.Container();

    // Ground shadow oval
    const shadow = new PIXI.Graphics()
      .ellipse(0, 0, 18, 7)
      .fill({ color: 0x000000, alpha: 0.18 });
    this.container.addChild(shadow);

    // Immediate colored placeholder (replaced once sprite loads)
    const ph = new PIXI.Graphics()
      .rect(-FALLBACK_SIZE / 2, -FALLBACK_SIZE, FALLBACK_SIZE, FALLBACK_SIZE)
      .fill({ color: 0x888888, alpha: 0.4 });
    this.placeholder = ph;
    this.container.addChild(ph);

    this.loadSprite(spriteUrl);
  }

  // Pixi v8 has no built-in GIF loader — use the static PNG equivalent
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
      const asset = await PIXI.Assets.load(loadUrl);
      if (this.isDestroyed) return; // sprite was destroyed while loading

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

      if (this.placeholder) {
        this.container.removeChild(this.placeholder);
        this.placeholder.destroy();
        this.placeholder = null;
      }
      this.container.addChild(sprite);
    } catch (err) {
      if (this.isDestroyed) return;
      console.error("[PokemonSprite] Failed to load:", loadUrl, err);
      if (this.placeholder) {
        this.placeholder.clear()
          .rect(-FALLBACK_SIZE / 2, -FALLBACK_SIZE, FALLBACK_SIZE, FALLBACK_SIZE)
          .fill({ color: 0x888888, alpha: 0.6 });
      }
    }
  }

  setPosition(x: number, y: number, logicalW: number, logicalH: number, canvasW: number, canvasH: number): void {
    this.container.x = (x / logicalW) * canvasW;
    this.container.y = (y / logicalH) * canvasH;
  }

  /** Hide the sprite before its summon (scale 0 keeps it invisible regardless of HP/alpha resets). */
  hideForSummon(): void {
    this.container.scale.set(0);
    this.container.alpha = 0;
  }

  /** Pop the sprite out of its pokeball with a slight overshoot. */
  popIn(): void {
    this.container.alpha = 1;
    const start = Date.now();
    const dur = 380;
    const step = () => {
      if (this.isDestroyed) return;
      const t = Math.min((Date.now() - start) / dur, 1);
      // 0 → 1.15 → 1 overshoot
      const s = t < 0.7 ? (t / 0.7) * 1.15 : 1.15 - ((t - 0.7) / 0.3) * 0.15;
      this.container.scale.set(s);
      if (t < 1) requestAnimationFrame(step);
      else this.container.scale.set(1);
    };
    requestAnimationFrame(step);
  }

  updateHP(hp: number): void {
    const wasAlive = this.lastHp > 0;
    this.lastHp = hp;
    if (hp <= 0) {
      if (wasAlive && !this.isFainting) this.playFaint();
      else if (!this.isFainting) this.container.alpha = 0.08;
    } else {
      this.container.alpha = 1;
    }
  }

  private playFaint(): void {
    this.isFainting = true;
    let flash = 0;
    const totalFlashes = 6;
    const step = () => {
      if (this.isDestroyed) return;
      if (flash >= totalFlashes) {
        this.container.alpha = 0.08;
        this.isFainting = false;
        return;
      }
      this.container.alpha = flash % 2 === 0 ? 0.05 : 1;
      flash++;
      setTimeout(step, 65);
    };
    step();
  }

  updateFacing(facingRight: boolean): void {
    const scale = facingRight ? SPRITE_SCALE : -SPRITE_SCALE;
    if (this.sprite) {
      this.sprite.scale.x = scale;
    } else if (this.placeholder) {
      this.placeholder.scale.x = facingRight ? 1 : -1;
    }
  }

  playAttack(targetX: number, targetY: number): void {
    if (this.isLunging) return;
    this.isLunging = true;
    const origX = this.container.x;
    const origY = this.container.y;
    const dx = (targetX - origX) * 0.18;
    const dy = (targetY - origY) * 0.18;

    const start = Date.now();
    const animate = () => {
      const t = (Date.now() - start) / 180;
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
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  playHit(): void {
    if (this.isShaking) return;
    this.isShaking = true;
    const origX = this.container.x;
    const shakes = [7, -7, 5, -5, 3, -3, 0];
    let i = 0;
    const step = () => {
      if (i >= shakes.length) { this.container.x = origX; this.isShaking = false; return; }
      this.container.x = origX + shakes[i++];
      setTimeout(step, 45);
    };
    step();

    const visual = this.sprite ?? this.placeholder;
    if (visual) {
      visual.alpha = 0.15;
      setTimeout(() => { if (visual) visual.alpha = 1; }, 80);
      setTimeout(() => { if (visual) visual.alpha = 0.15; }, 130);
      setTimeout(() => { if (visual) visual.alpha = 1; }, 210);
    }
  }

  getContainer(): PIXI.Container {
    return this.container;
  }

  destroy(): void {
    this.isDestroyed = true;
    this.container.destroy({ children: true });
  }
}
