import { Duration, Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { config } from "dotenv";
import { RequestHandler } from "express";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
const env = process.env.NODE_ENV || "dev";
config({ path: `.env.${env}` });

let rateLimitMiddleware: RequestHandler;

if (env === "prod") {
    if (!process.env.UPSTASH_REDIS_URL) throw new Error("Upstash Redis URL is required");
    if (!process.env.UPSTASH_REDIS_TOKEN) throw new Error("Upstash Redis Token is required");

    // Initialize Upstash Redis client
    const client = new Redis({
        url: process.env.UPSTASH_REDIS_URL,
        token: process.env.UPSTASH_REDIS_TOKEN,
    });

    // Enforce delay up to (60/5 = 10)sec per concurrent request, unless defined otherwise
    const limit = Number(process.env.LIMIT) || 5;
    const window = (process.env.WINDOW || "60s") as Duration;
    const ratelimit = new Ratelimit({
        redis: client,
        limiter: Ratelimit.slidingWindow(limit, window),
        analytics: true,
    });

    // Create a rate limiting middleware
    rateLimitMiddleware = async (req, res, next) => {
        const ip = req.ip || "127.0.0.1"; // Get the client's IP address
        const { success } = await ratelimit.limit(ip);
        if (!success) {
            res.status(429).send("Too many requests, please try again later.");
            return;
        }
        next();
    };
} else {
    rateLimitMiddleware = rateLimit({
        windowMs: 60 * 1000, // 60 seconds
        limit: 10, // Enforces delay up to (60/10 = 6)sec per concurrent request
        message: "Too many requests, please try again later.",
        standardHeaders: true,
        legacyHeaders: false,
        skipFailedRequests: false, // Don't skip failed requests
        // Use IP address for rate limiting
        keyGenerator: req => ipKeyGenerator(req.ip || "127.0.0.1", false),
    });
}

export default rateLimitMiddleware;
