import { Router } from "express";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { Token } from "../models/Token.js";

const router = Router();

const DEMO_USER = process.env.APP_USER || "admin";
const DEMO_PASS = process.env.APP_PASS || "admin123";
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "15m";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || "1d";

function signAccessToken(payload) {
    return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

function signRefreshToken(payload) {
    return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body ?? {};

        if (!username || !password) {
            return res.status(400).json({ status: "error", error: "username y password son requeridos" });
        }

        if (username !== DEMO_USER || password !== DEMO_PASS) {
            return res.status(401).json({ status: "error", error: "Credenciales inválidas" });
        }

        const payload = { username, role: "admin" };

        const accessToken = signAccessToken(payload);
        const refreshToken = signRefreshToken(payload);

        await Token.create({ refreshToken });

        return res.json({
            status: "success",
            payload: { accessToken, refreshToken }
        });
    } catch (err) {
        return res.status(500).json({ status: "error", error: err.message });
    }
});

router.post("/refresh", async (req, res) => {
    try {
        const { refreshToken } = req.body ?? {};
        if (!refreshToken) {
            return res.status(400).json({ status: "error", error: "refreshToken es requerido" });
        }

        const savedToken = await Token.findOne({ refreshToken });

        if (!savedToken) {
            return res.status(401).json({ status: "error", error: "refreshToken inválido o revocado (puede haber expirado por TTL)" });
        }

        const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
        const payload = { username: decoded.username, role: decoded.role };

        const newAccessToken = signAccessToken(payload);
        const newRefreshToken = signRefreshToken(payload);

        await Token.deleteOne({ refreshToken: savedToken.refreshToken });
        await Token.create({ refreshToken: newRefreshToken });

        return res.json({
            status: "success",
            payload: { accessToken: newAccessToken, refreshToken: newRefreshToken }
        });
    } catch (err) {
        return res.status(401).json({ status: "error", error: "refreshToken expirado o inválido" });
    }
});

export default router;
