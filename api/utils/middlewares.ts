import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import { jwtSecret } from "../routes/auth/controllers";
import { qstashReceiver } from "../clients/qstash";

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

export const verifyJWT = async (req: Request, res: Response, next: NextFunction) => {
    try {
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
    } catch (error) {
        next(error);
    }
};

export const verifyWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const env = process.env.NODE_ENV || "dev";
        if (env === "dev") {
            next();
            return;
        }
        const status = await qstashReceiver.verify({
            signature: req.headers["upstash-signature"] as string,
            body: req.body,
        });
        if (!status) {
            console.log("Unauthorized Webhook request");
            res.status(401).json({ message: "Unauthorized Webhook request" });
            return;
        }
        next();
    } catch (error) {
        next(error);
    }
};
