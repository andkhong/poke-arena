"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaderboardRouter = void 0;
const express_1 = require("express");
const service_1 = require("./service");
exports.leaderboardRouter = (0, express_1.Router)();
exports.leaderboardRouter.get("/", async (_req, res) => {
    const entries = await (0, service_1.getLeaderboard)(50);
    res.json(entries);
});
