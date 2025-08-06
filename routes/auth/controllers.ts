import { Request, Response, NextFunction } from "express";
import { db, users } from "../../db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { and, eq, or } from "drizzle-orm";
import crypto from "crypto";
import type { StringValue } from "ms";
import { config } from "dotenv";
import { qstashClient } from "../../clients/qstash";
config({ path: `.env.${process.env.NODE_ENV || "dev"}` });

if (!process.env.JWT_SECRET) throw new Error("JWT secret is missing");
if (!process.env.JWT_REFRESH_SECRET) throw new Error("JWT refresh secret is missing");
export const jwtSecret = process.env.JWT_SECRET;
const jwtExpiry = (process.env.JWT_EXPIRY || "10m") as StringValue;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

export const initiateSignup = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { username, email, password } = req.body;
        const existingUser = await db.query.users.findFirst({
            columns: { username: true, email: true },
            where: or(eq(users.username, username), eq(users.email, email)),
        });
        if (existingUser && existingUser.username === username) {
            res.status(400).json({ message: "Username already exists" });
            return;
        }
        if (existingUser && existingUser.email === email) {
            res.status(400).json({ message: "Email already exists" });
            return;
        }
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(password, salt);
        const [user] = await db.insert(users).values({ username, email, password: hashedPassword }).returning({
            id: users.id,
            username: users.username,
            email: users.email,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
        });
        res.status(201).json({ message: "User created successfully", data: user });
    } catch (error) {
        next(error);
    }
};

export const initiateLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await db.query.users.findFirst({
            columns: { id: true, username: true, email: true, password: true, createdAt: true, updatedAt: true },
            where: eq(users.email, req.body.email),
        });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const doesPasswordMatch = await bcrypt.compare(req.body.password, user.password);
        if (!doesPasswordMatch) {
            res.status(401).json({ message: "Wrong password" });
            return;
        }
        const jwtToken = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: jwtExpiry });
        const refreshToken = jwt.sign({ userId: user.id }, jwtRefreshSecret, { expiresIn: "1d" });

        // Persist refresh token in database
        await db.update(users).set({ jwtRefreshToken: refreshToken }).where(eq(users.id, user.id));

        // Store refresh token as an http-only cookie which isn't accessible to client-side JS
        res.cookie("refreshToken", refreshToken, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
        res.status(200).json({
            message: "Login successful",
            data: { user: { ...user, password: undefined }, jwt: jwtToken },
        });
    } catch (error) {
        next(error);
    }
};

export const refreshJWT = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cookies = req.cookies;
        if (!cookies?.refreshToken) {
            res.status(401).json({ message: "You are signed out" });
            return;
        }
        const refreshToken = cookies.refreshToken as string;

        // Find a user with identical JWT refresh token. Otherwise, it's invalid
        const foundUser = await db.query.users.findFirst({
            columns: { id: true },
            where: eq(users.jwtRefreshToken, refreshToken),
        });
        if (!foundUser) {
            res.clearCookie("refreshToken", { httpOnly: true, sameSite: "none", secure: true });
            res.status(403).json({ message: "Invalid refresh token" });
            return;
        }
        // Decode refreshToken to extract payload containing "userId"
        jwt.verify(refreshToken, jwtRefreshSecret, (err, payload) => {
            // Check that "userId" matches that of the found user
            // prettier-ignore
            if (err || !payload || typeof payload !== "object" || !("userId" in payload) || payload.userId !== foundUser.id) {
                res.status(403).json({ message: "Access to this resource is forbidden" });
                return;
            }
            const jwtToken = jwt.sign({ userId: foundUser.id }, jwtSecret, { expiresIn: jwtExpiry });
            res.status(200).json({ message: "JWT refreshed successfully", data: { jwt: jwtToken } });
        });
    } catch (error) {
        next(error);
    }
};

export const initiateSignout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cookies = req.cookies;
        if (!cookies?.refreshToken) {
            res.status(403).json({ message: "No refresh token found" });
            return;
        }
        const refreshToken = cookies.refreshToken;

        // Invalidate or nullify JWT refresh token, if present in DB
        const user = await db.query.users.findFirst({
            columns: { id: true },
            where: and(eq(users.id, req.userId), eq(users.jwtRefreshToken, refreshToken)),
        });
        if (!user) {
            res.clearCookie("refreshToken", { httpOnly: true, sameSite: "none", secure: true });
            res.status(403).json({ message: "Invalid refresh token" });
            return;
        }
        await db.update(users).set({ jwtRefreshToken: null }).where(eq(users.id, user.id));
        res.clearCookie("refreshToken", { httpOnly: true, sameSite: "none", secure: true });
        res.status(200).json({ message: "Sign-out successful" });
    } catch (error) {
        next(error);
    }
};

export const initiatePasswordReset = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await db.query.users.findFirst({
            columns: { id: true, email: true },
            where: eq(users.email, req.body.email),
        });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const resetToken = crypto.randomBytes(16).toString("hex");
        await db
            .update(users)
            .set({
                passwordResetToken: resetToken,
                passwordResetTokenExpiry: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            })
            .where(eq(users.id, user.id));

        // Schedule password reset email
        await qstashClient.publishJSON({
            url: req.protocol + "://" + req.headers.host + "/api/v1/webhooks/subscription/send-email",
            body: {
                type: "password-reset",
                info: { email: user.email, token: resetToken, userId: user.id, expiry: "30m" },
            },
        });
        res.status(200).json({ message: "A password reset link has been sent to your email address" });
    } catch (error) {
        next(error);
    }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id, resetToken } = req.params;
        const user = await db.query.users.findFirst({
            columns: { id: true, passwordResetToken: true, passwordResetTokenExpiry: true },
            where: eq(users.id, id),
        });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        // prettier-ignore
        if (user.passwordResetToken !== resetToken || (user.passwordResetTokenExpiry && user.passwordResetTokenExpiry < new Date().toISOString())) {
            res.status(403).json({ message: "Invalid or expired reset token" });
            return;
        }
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(req.body.new_password, salt);
        await db.update(users).set({ password: hashedPassword }).where(eq(users.id, user.id));
        res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
        next(error);
    }
};
