import { Router } from "express";
import { listPokemon, getPokemonById } from "./service";

export const pokemonRouter = Router();

pokemonRouter.get("/", async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const gen = req.query.gen ? Number(req.query.gen) : undefined;
  const type = typeof req.query.type === "string" ? req.query.type : undefined;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;

  const result = await listPokemon({ page, limit, gen, type, search });
  res.json(result);
});

pokemonRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const pokemon = await getPokemonById(id);
  if (!pokemon) { res.status(404).json({ error: "Not found" }); return; }
  res.json(pokemon);
});
