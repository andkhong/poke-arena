import * as PIXI from "pixi.js";
import { ArenaBackground } from "./ArenaBackground";
import { PokemonSprite } from "./PokemonSprite";
import { MoveEffect } from "./MoveEffect";
import type { ArenaPlayerInfo, PendingAction } from "../store/arenaStore";

export class ArenaRenderer {
  private app: PIXI.Application;
  private background: ArenaBackground;
  private sprites = new Map<number, PokemonSprite>();
  private moveEffect: MoveEffect;
  private logicalW = 1200;
  private logicalH = 800;

  constructor(app: PIXI.Application) {
    this.app = app;
    this.background = new ArenaBackground(app.canvas.width, app.canvas.height);
    this.moveEffect = new MoveEffect();
    this.app.stage.addChild(this.background.getContainer());
    // sprites added in initPlayers, then moveEffect on top
  }

  initPlayers(players: ArenaPlayerInfo[], arenaW: number, arenaH: number): void {
    this.logicalW = arenaW;
    this.logicalH = arenaH;

    console.log("[ArenaRenderer] initPlayers count=", players.length, "arenaW=", arenaW, "arenaH=", arenaH,
      "canvasW=", this.app.canvas.width, "canvasH=", this.app.canvas.height);

    // Clear existing
    for (const [, sprite] of this.sprites) sprite.destroy();
    this.sprites.clear();

    for (const p of players) {
      const url = p.pokemon.spriteUrl; // always front-facing sprite
      console.log("[ArenaRenderer] creating sprite id=", p.pokemon.pokemonId,
        "name=", p.pokemon.displayName, "x=", p.pokemon.x, "y=", p.pokemon.y,
        "isMe=", p.isMe, "url=", url);

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
        p.pokemon.pokemonId,
        url,
        p.pokemon.maxHp,
        p.pokemon.displayName,
        p.isMe
      );
      const cx = (p.pokemon.x / arenaW) * this.app.canvas.width;
      const cy = (p.pokemon.y / arenaH) * this.app.canvas.height;
      console.log("[ArenaRenderer] sprite canvas pos=", cx.toFixed(0), cy.toFixed(0), "facingRight=", facingRight);

      s.setPosition(
        p.pokemon.x, p.pokemon.y,
        this.logicalW, this.logicalH,
        this.app.canvas.width, this.app.canvas.height
      );
      s.updateFacing(facingRight);
      this.sprites.set(p.pokemon.pokemonId, s);
      this.app.stage.addChild(s.getContainer());
    }
    // Keep moveEffect on top of all sprites
    this.app.stage.addChild(this.moveEffect.getContainer());
    console.log("[ArenaRenderer] stage children count=", this.app.stage.children.length);
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
      const target = this.sprites.get(action.targetPokemonId);
      if (!attacker || !target) continue;

      const ax = attacker.getContainer().x;
      const ay = attacker.getContainer().y;
      const tx = target.getContainer().x;
      const ty = target.getContainer().y;

      // Physical moves lunge, special/status moves don't
      if (action.damageClass === "physical") {
        attacker.playAttack(tx, ty);
      }

      if (!action.missed) {
        target.playHit();
        this.moveEffect.fire(ax, ay, tx, ty, action.moveType, action.damageClass, action.isAoe, action.effectiveness, action.isCrit);
        this.moveEffect.showDamage(tx, ty, action.damageDealt, action.effectiveness, action.isCrit);
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
