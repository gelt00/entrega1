import { Router } from "express";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { promises as fs } from "fs";
import path from "path";

const router = Router();

const DEMO_USER = process.env.APP_USER || "admin";
const DEMO_PASS = process.env.APP_PASS || "admin123";
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "15m";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || "1d";

const TOKENS_PATH = path.resolve("src/data/auth_tokens.json");

async function ensureTokensFile() {
    try {
        await fs.access(TOKENS_PATH);
    } catch {
        await fs.mkdir(path.dirname(TOKENS_PATH), { recursive: true });
        await fs.writeFile(
            TOKENS_PATH,
            JSON.stringify({ accessToken: null, refreshToken: null, issuedAt: null }, null, 2),
            "utf-8"
        );
    }
}

async function readTokensState() {
    await ensureTokensFile();
    const raw = await fs.readFile(TOKENS_PATH, "utf-8");
    try {
        const data = JSON.parse(raw);
        return {
            accessToken: data?.accessToken ?? null,
            refreshToken: data?.refreshToken ?? null,
            issuedAt: data?.issuedAt ?? null
        };
    } catch {
        return { accessToken: null, refreshToken: null, issuedAt: null };
    }
}

async function writeTokensState({ accessToken, refreshToken }) {
    await ensureTokensFile();
    const state = {
        accessToken,
        refreshToken,
        issuedAt: new Date().toISOString()
    };
    await fs.writeFile(TOKENS_PATH, JSON.stringify(state, null, 2), "utf-8");
    return state;
}

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

        await writeTokensState({ accessToken, refreshToken });

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

        const saved = await readTokensState();

        if (!saved.refreshToken || saved.refreshToken !== refreshToken) {
            return res.status(401).json({ status: "error", error: "refreshToken inválido o revocado" });
        }

        const decoded = jwt.verify(refreshToken, REFRESH_SECRET);

        const payload = { username: decoded.username, role: decoded.role };

        const newAccessToken = signAccessToken(payload);
        const newRefreshToken = signRefreshToken(payload);

        await writeTokensState({ accessToken: newAccessToken, refreshToken: newRefreshToken });

        return res.json({
            status: "success",
            payload: { accessToken: newAccessToken, refreshToken: newRefreshToken }
        });
    } catch (err) {
        return res.status(401).json({ status: "error", error: "refreshToken expirado o inválido" });
    }
});

export default router;
