import * as PIXI from "pixi.js";
import { ArenaBackground } from "./ArenaBackground";
import { PokemonSprite } from "./PokemonSprite";
import { MoveEffect } from "./MoveEffect";
import { SummonEffect } from "./SummonEffect";
import { playCry } from "./audio";
import { TYPE_COLORS } from "../styles/typeColors";
import type { ArenaPlayerInfo, PendingAction } from "../store/arenaStore";

function typeColor(t: string): number {
  return parseInt((TYPE_COLORS[t] ?? "#dddddd").replace("#", ""), 16);
}

export class ArenaRenderer {
  private app: PIXI.Application;
  private background: ArenaBackground;
  private sprites = new Map<number, PokemonSprite>();
  private moveEffect: MoveEffect;
  private summon: SummonEffect;
  private logicalW = 1200;
  private logicalH = 800;

  constructor(app: PIXI.Application) {
    this.app = app;
    this.background = new ArenaBackground(app.canvas.width, app.canvas.height);
    this.moveEffect = new MoveEffect();
    this.summon = new SummonEffect();
    this.app.stage.addChild(this.background.getContainer());
    // sprites added in initPlayers, then summon + moveEffect on top
  }

  initPlayers(players: ArenaPlayerInfo[], arenaW: number, arenaH: number): void {
    this.logicalW = arenaW;
    this.logicalH = arenaH;

    // Clear existing
    for (const [, sprite] of this.sprites) sprite.destroy();
    this.sprites.clear();
    this.summon.clear();

    const cx = this.app.canvas.width / 2;
    const cy = this.app.canvas.height / 2;
    const created: Array<{ p: ArenaPlayerInfo; sprite: PokemonSprite; sx: number; sy: number }> = [];

    for (const p of players) {
      // Compute initial facing toward nearest enemy, ignoring server's hardcoded facingRight: true
      const others = players.filter((o) => o.pokemon.pokemonId !== p.pokemon.pokemonId);
      let facingRight = true;
      if (others.length > 0) {
        const nearest = others.reduce((best, o) => {
          const da = (o.pokemon.x - p.pokemon.x) ** 2 + (o.pokemon.y - p.pokemon.y) ** 2;
          const db = (best.pokemon.x - p.pokemon.x) ** 2 + (best.pokemon.y - p.pokemon.y) ** 2;
          return da < db ? o : best;
        });
        facingRight = nearest.pokemon.x >= p.pokemon.x;
      }

      const s = new PokemonSprite(
        p.pokemon.pokemonId, p.pokemon.spriteUrl, p.pokemon.maxHp, p.pokemon.displayName, p.isMe
      );
      s.setPosition(
        p.pokemon.x, p.pokemon.y,
        this.logicalW, this.logicalH,
        this.app.canvas.width, this.app.canvas.height
      );
      s.updateFacing(facingRight);
      s.hideForSummon();
      this.sprites.set(p.pokemon.pokemonId, s);
      this.app.stage.addChild(s.getContainer());

      const sx = (p.pokemon.x / arenaW) * this.app.canvas.width;
      const sy = (p.pokemon.y / arenaH) * this.app.canvas.height;
      created.push({ p, sprite: s, sx, sy });
    }

    // Pokeballs + move effects render above the sprites
    this.app.stage.addChild(this.summon.getContainer());
    this.app.stage.addChild(this.moveEffect.getContainer());

    // Summon each Pokemon in CLOCKWISE order from the top: a pokeball drops in and pops open.
    created.sort((a, b) =>
      Math.atan2(a.sx - cx, -(a.sy - cy)) - Math.atan2(b.sx - cx, -(b.sy - cy))
    );
    const STAGGER = 320;
    created.forEach((c, i) => {
      const color = typeColor(c.p.pokemon.types?.[0] ?? "normal");
      this.summon.dropAndOpen(c.sx, c.sy - 22, color, 300 + i * STAGGER, () => {
        c.sprite.popIn();
        playCry(c.p.pokemon.pokemonId);
      });
    });
  }

  update(
    players: ArenaPlayerInfo[],
    pendingActions: PendingAction[]
  ): void {
    const cW = this.app.canvas.width;
    const cH = this.app.canvas.height;

    for (const p of players) {
      const sprite = this.sprites.get(p.pokemon.pokemonId);
      if (!sprite) continue;
      sprite.setPosition(p.pokemon.x, p.pokemon.y, this.logicalW, this.logicalH, cW, cH);
      sprite.updateHP(p.pokemon.currentHp);
      sprite.updateFacing(p.pokemon.facingRight);
    }

    // Process pending actions (animations)
    for (const action of pendingActions) {
      const attacker = this.sprites.get(action.attackerPokemonId);
      if (!attacker) continue;
      // targetPokemonId < 0 (or a missing sprite) means a whiff — the move hits nothing.
      const target = this.sprites.get(action.targetPokemonId);

      const ax = attacker.getContainer().x;
      const ay = attacker.getContainer().y;

      let tx: number, ty: number;
      if (target) {
        tx = target.getContainer().x;
        ty = target.getContainer().y;
      } else {
        // Whiff: aim the attack ahead, in the attacker's facing direction.
        const ap = players.find((p) => p.pokemon.pokemonId === action.attackerPokemonId);
        const facing = ap?.pokemon.facingRight ?? true;
        tx = ax + (facing ? 1 : -1) * 170;
        ty = ay + (Math.random() - 0.5) * 30;
      }

      // Physical moves lunge, special/status moves don't
      if (action.damageClass === "physical") {
        attacker.playAttack(tx, ty);
      }

      if (!action.missed) {
        if (target) target.playHit();
        this.moveEffect.fire(ax, ay, tx, ty, action.moveType, action.damageClass, action.isAoe, action.effectiveness, action.isCrit);
        if (target) this.moveEffect.showDamage(tx, ty, action.damageDealt, action.effectiveness, action.isCrit);
      }
    }
  }

  resize(width: number, height: number): void {
    this.app.renderer.resize(width, height);
  }

  destroy(): void {
    for (const [, s] of this.sprites) s.destroy();
    this.sprites.clear();
  }
}
