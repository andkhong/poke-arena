"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const schema = zod_1.z.object({
    DATABASE_URL: zod_1.z.string(),
    REDIS_URL: zod_1.z.string().default("redis://localhost:6379"),
    JWT_SECRET: zod_1.z.string().min(16),
    JWT_EXPIRES_IN: zod_1.z.string().default("24h"),
    PORT: zod_1.z.coerce.number().default(3001),
    CORS_ORIGIN: zod_1.z.string().default("http://localhost:5173,http://localhost:3001"),
    MIN_ARENA_PLAYERS: zod_1.z.coerce.number().default(2),
    MAX_ARENA_PLAYERS: zod_1.z.coerce.number().default(8),
    ARENA_TIME_LIMIT_MS: zod_1.z.coerce.number().default(180000),
});
exports.config = schema.parse(process.env);
