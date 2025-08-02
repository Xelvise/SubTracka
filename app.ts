import express from "express";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import subRoutes from "./routes/subscription";
import workflowRoutes from "./routes/workflows";
import errorMiddlewares from "./routes/error";
import { config } from "dotenv";
import rateLimiter from "./utils/ratelimiter";
const env = process.env.NODE_ENV || "dev";
config({ path: `.env.${env}` });

const app = express();
app.use(express.json()); // parse JSON payloads
app.use(express.urlencoded({ extended: false })); // parse HTML form url-encoded data
app.use(cookieParser());

app.disable("x-powered-by");
app.use((_, res, next) => {
    res.set({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": true,
    });
    next();
});

app.get("/hello", (_, res) => {
    res.status(200).json({ message: "Welcome to Elvis' Subscription tracker API. I hope you have fun using it" });
});

app.use(rateLimiter);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/subscriptions", subRoutes);
app.use("/api/v1/workflows", workflowRoutes);
app.use(errorMiddlewares);

const port = Number(process.env.SERVER_PORT) || 3000;
app.listen(port, "0.0.0.0", () => console.log(`${env} server is running on port ${port}`));
