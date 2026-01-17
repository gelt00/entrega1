import jwt from "jsonwebtoken";
import "dotenv/config";
import { promises as fs } from "fs";
import path from "path";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const TOKENS_PATH = path.resolve("src/data/auth_tokens.json");

async function readTokensState() {
    try {
        const raw = await fs.readFile(TOKENS_PATH, "utf-8");
        const data = JSON.parse(raw);
        return data?.accessToken ?? null;
    } catch {
        return null;
    }
}

export async function authRequired(req, res, next) {
    try {
        const authHeader = req.headers.authorization || "";
        const [type, token] = authHeader.split(" ");

        if (type !== "Bearer" || !token) {
            return res.status(401).json({
                status: "error",
                error: "Authorization Bearer token requerido"
            });
        }

        const decoded = jwt.verify(token, ACCESS_SECRET);

        const activeToken = await readTokensState();

        if (!activeToken || activeToken !== token) {
            return res.status(401).json({
                status: "error",
                error: "Token revocado o reemplazado"
            });
        }

        req.user = decoded;
        next();

    } catch (err) {
        return res.status(401).json({
            status: "error",
            error: "Token inválido o expirado"
        });
    }
}
