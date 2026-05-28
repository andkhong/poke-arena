"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.signToken = signToken;
exports.verifyToken = verifyToken;
exports.blockToken = blockToken;
exports.isTokenBlocked = isTokenBlocked;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = require("crypto");
const config_1 = require("../config");
const redis_1 = require("../redis");
async function hashPassword(password) {
    return bcryptjs_1.default.hash(password, 12);
}
async function verifyPassword(password, hash) {
    return bcryptjs_1.default.compare(password, hash);
}
function signToken(userId, username) {
    const jti = (0, crypto_1.randomUUID)();
    return jsonwebtoken_1.default.sign({ sub: userId, username, jti }, config_1.config.JWT_SECRET, {
        expiresIn: config_1.config.JWT_EXPIRES_IN,
    });
}
function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, config_1.config.JWT_SECRET);
}
async function blockToken(jti) {
    await redis_1.redis.set(`pa:session:${jti}`, "1", "EX", 86400);
}
async function isTokenBlocked(jti) {
    const val = await redis_1.redis.get(`pa:session:${jti}`);
    return val !== null;
}
