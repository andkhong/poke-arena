"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const service_1 = require("./service");
async function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing token" });
        return;
    }
    const token = header.slice(7);
    try {
        const payload = (0, service_1.verifyToken)(token);
        if (await (0, service_1.isTokenBlocked)(payload.jti)) {
            res.status(401).json({ error: "Token revoked" });
            return;
        }
        req.user = { id: payload.sub, username: payload.username, jti: payload.jti };
        next();
    }
    catch {
        res.status(401).json({ error: "Invalid token" });
    }
}
