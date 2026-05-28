import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const schema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("24h"),
  PORT: z.coerce.number().default(3001),
  CORS_ORIGIN: z.string().default("http://localhost:5173,http://localhost:3001"),
  MIN_ARENA_PLAYERS: z.coerce.number().default(2),
  MAX_ARENA_PLAYERS: z.coerce.number().default(8),
  ARENA_TIME_LIMIT_MS: z.coerce.number().default(180000),
});

export const config = schema.parse(process.env);
