import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { hashPassword, verifyPassword, signToken, blockToken } from "./service";
import { requireAuth, type AuthRequest } from "./middleware";

export const authRouter = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^\w+$/),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { username, email, password } = parsed.data;

  const existing = await db.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    res.status(409).json({ error: "Username or email already taken" });
    return;
  }

  const user = await db.user.create({
    data: { username, email, passwordHash: await hashPassword(password) },
  });

  const token = signToken(user.id, user.username);
  res.status(201).json({
    token,
    user: { id: user.id, username: user.username, email: user.email, wins: 0, losses: 0 },
  });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken(user.id, user.username);
  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email, wins: user.wins, losses: user.losses },
  });
});

authRouter.post("/logout", requireAuth, async (req: AuthRequest, res) => {
  if (req.user) await blockToken(req.user.jti);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const user = await db.user.findUnique({ where: { id: req.user!.id } });
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: user.id, username: user.username, email: user.email, wins: user.wins, losses: user.losses });
});
