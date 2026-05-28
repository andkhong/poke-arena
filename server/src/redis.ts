import Redis from "ioredis";
import { config } from "./config";

export const redis = new Redis(config.REDIS_URL);

redis.on("error", (err) => {
  console.error("[Redis] connection error:", err.message);
});
