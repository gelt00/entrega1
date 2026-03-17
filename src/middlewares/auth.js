import jwt from "jsonwebtoken";
import "dotenv/config";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

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
        req.user = decoded;
        next();

    } catch (err) {
        return res.status(401).json({
            status: "error",
            error: "Token inválido o expirado"
        });
    }
}
