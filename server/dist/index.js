"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
const socket_1 = require("./socket");
const seeder_1 = require("./seed/seeder");
const router_1 = require("./auth/router");
const router_2 = require("./pokemon/router");
const router_3 = require("./leaderboard/router");
const pokemonCache_1 = require("./cache/pokemonCache");
const corsOrigins = config_1.config.CORS_ORIGIN.split(",").map((s) => s.trim());
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: corsOrigins, credentials: true }));
app.use(express_1.default.json());
app.use("/api/auth", router_1.authRouter);
app.use("/api/pokemon", router_2.pokemonRouter);
app.use("/api/leaderboard", router_3.leaderboardRouter);
app.get("/api/health", (_req, res) => res.json({ ok: true }));
// Serve the built client in production
const clientDist = path_1.default.join(__dirname, "../../client/dist");
app.use(express_1.default.static(clientDist));
app.get("*", (_req, res) => {
    res.sendFile(path_1.default.join(clientDist, "index.html"));
});
const httpServer = (0, http_1.createServer)(app);
(0, socket_1.attachSocketServer)(httpServer);
httpServer.listen(config_1.config.PORT, () => {
    console.log(`[Server] Listening on port ${config_1.config.PORT}`);
    (0, seeder_1.maybeRunSeeder)()
        .then(() => (0, pokemonCache_1.warmPokemonCache)())
        .catch(console.error);
});
