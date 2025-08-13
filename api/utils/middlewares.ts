import { config } from "dotenv";
import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import jwt from "jsonwebtoken";
config({ path: `.env.${process.env.NODE_ENV || "dev"}` });

declare global {
    namespace Express {
        interface Request {
            userId: string;
        }
    }
}

export const requiredBodyValidator = (req: Request, res: Response, next: NextFunction) => {
    if (!req.body || Object.keys(req.body).length === 0) {
        res.status(400).json({ message: "A payload is required for this request" });
        return;
    }
    next();
};

export const validationResultHandler = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ message: errors.array()[0].msg });
        return;
    }
    next();
};

export const verifyJWT = (req: Request, res: Response, next: NextFunction) => {
    try {
        const { JWT_SECRET: jwtSecret } = process.env;
        if (!jwtSecret) throw new Error("JWT_SECRET is missing");

        let token = req.headers.authorization;
        if (!token || !token.startsWith("Bearer ") || token.split(" ").length !== 2) {
            res.status(401).json({ message: "No or invalid JWT provided" });
            return;
        }
        token = token.split(" ")[1];
        jwt.verify(token, jwtSecret, (err, payload) => {
            if (err || !payload || typeof payload !== "object" || !("userId" in payload)) {
                res.status(403).json({ message: "Unauthorized access" });
                return;
            }
            req.userId = payload.userId;
            next();
        });
    } catch (err) {
        next(err);
    }
};

export const verifyWebhook = (req: Request, res: Response, next: NextFunction) => {
    try {
        const env = process.env.NODE_ENV || "dev";
        if (env === "dev") {
            next();
            return;
        }
        const { QSTASH_WEBHOOK_SECRET } = process.env;
        if (!QSTASH_WEBHOOK_SECRET) throw new Error("Qstash Webhook secret is missing");

        if (!req.body.secret || req.body.secret !== QSTASH_WEBHOOK_SECRET) {
            console.error("Unauthorized Webhook request");
            res.status(401).json({ message: "Unauthorized Webhook request" });
            return;
        }
        next();
    } catch (err) {
        next(err);
    }
};
