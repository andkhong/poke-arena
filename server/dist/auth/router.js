"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const service_1 = require("./service");
const middleware_1 = require("./middleware");
exports.authRouter = (0, express_1.Router)();
const registerSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(20).regex(/^\w+$/),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
exports.authRouter.post("/register", async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const { username, email, password } = parsed.data;
    const existing = await db_1.db.user.findFirst({
        where: { OR: [{ email }, { username }] },
    });
    if (existing) {
        res.status(409).json({ error: "Username or email already taken" });
        return;
    }
    const user = await db_1.db.user.create({
        data: { username, email, passwordHash: await (0, service_1.hashPassword)(password) },
    });
    const token = (0, service_1.signToken)(user.id, user.username);
    res.status(201).json({
        token,
        user: { id: user.id, username: user.username, email: user.email, wins: 0, losses: 0 },
    });
});
exports.authRouter.post("/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const { email, password } = parsed.data;
    const user = await db_1.db.user.findUnique({ where: { email } });
    if (!user || !(await (0, service_1.verifyPassword)(password, user.passwordHash))) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
    }
    const token = (0, service_1.signToken)(user.id, user.username);
    res.json({
        token,
        user: { id: user.id, username: user.username, email: user.email, wins: user.wins, losses: user.losses },
    });
});
exports.authRouter.post("/logout", middleware_1.requireAuth, async (req, res) => {
    if (req.user)
        await (0, service_1.blockToken)(req.user.jti);
    res.json({ ok: true });
});
exports.authRouter.get("/me", middleware_1.requireAuth, async (req, res) => {
    const user = await db_1.db.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
        res.status(404).json({ error: "Not found" });
        return;
    }
    res.json({ id: user.id, username: user.username, email: user.email, wins: user.wins, losses: user.losses });
});
