import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { config } from "../config";
import { redis } from "../redis";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface JwtPayload {
  sub: string;
  username: string;
  jti: string;
}

export function signToken(userId: string, username: string): string {
  const jti = randomUUID();
  return jwt.sign({ sub: userId, username, jti }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.JWT_SECRET) as JwtPayload;
}

export async function blockToken(jti: string): Promise<void> {
  await redis.set(`pa:session:${jti}`, "1", "EX", 86400);
}

export async function isTokenBlocked(jti: string): Promise<boolean> {
  const val = await redis.get(`pa:session:${jti}`);
  return val !== null;
}
