import { Router } from "express";
import { getLeaderboard } from "./service";

export const leaderboardRouter = Router();

leaderboardRouter.get("/", async (_req, res) => {
  const entries = await getLeaderboard(50);
  res.json(entries);
});
