import express from "express";
import cors from "cors";
import { createServer } from "http";
import path from "path";
import { config } from "./config";
import { attachSocketServer } from "./socket";
import { maybeRunSeeder } from "./seed/seeder";
import { authRouter } from "./auth/router";
import { pokemonRouter } from "./pokemon/router";
import { leaderboardRouter } from "./leaderboard/router";

const corsOrigins = config.CORS_ORIGIN.split(",").map((s) => s.trim());

const app = express();
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/pokemon", pokemonRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Serve the built client in production
const clientDist = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

const httpServer = createServer(app);
attachSocketServer(httpServer);

httpServer.listen(config.PORT, () => {
  console.log(`[Server] Listening on port ${config.PORT}`);
  maybeRunSeeder().catch(console.error);
});
