"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pokemonRouter = void 0;
const express_1 = require("express");
const service_1 = require("./service");
exports.pokemonRouter = (0, express_1.Router)();
exports.pokemonRouter.get("/", async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const gen = req.query.gen ? Number(req.query.gen) : undefined;
    const type = typeof req.query.type === "string" ? req.query.type : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const result = await (0, service_1.listPokemon)({ page, limit, gen, type, search });
    res.json(result);
});
exports.pokemonRouter.get("/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ error: "Invalid id" });
        return;
    }
    const pokemon = await (0, service_1.getPokemonById)(id);
    if (!pokemon) {
        res.status(404).json({ error: "Not found" });
        return;
    }
    res.json(pokemon);
});
