import type { Request, Response, NextFunction } from "express";
import { verifyToken, isTokenBlocked } from "./service";

export interface AuthRequest extends Request {
  user?: { id: string; username: string; jti: string };
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing token" });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = verifyToken(token);
    if (await isTokenBlocked(payload.jti)) {
      res.status(401).json({ error: "Token revoked" });
      return;
    }
    req.user = { id: payload.sub, username: payload.username, jti: payload.jti };
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
