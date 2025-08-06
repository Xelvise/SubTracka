import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { db, users } from "../../db";
import { eq } from "drizzle-orm";

export const fetchAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const allUsers = await db.query.users.findMany({
            columns: { id: true, username: true, email: true, createdAt: true, updatedAt: true },
        });
        res.status(200).json({ message: "Users fetched successfully", data: allUsers });
    } catch (error) {
        next(error);
    }
};

export const fetchUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const user = await db.query.users.findFirst({
            columns: { id: true, username: true, email: true, createdAt: true, updatedAt: true },
            where: eq(users.id, id),
        });
        // Verify that fetched resource exists
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        // Verify that User is not only authenticated, but also authorized
        if (user.id !== req.userId) {
            res.status(403).json({ message: "Unauthorized access" });
            return;
        }
        res.status(200).json({ message: "User fetched successfully", data: user });
    } catch (error) {
        next(error);
    }
};

export const updateUsername = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const foundUser = await db.query.users.findFirst({
            columns: { id: true },
            where: eq(users.id, id),
        });
        // Verify that fetched resource exists
        if (!foundUser) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        // Verify that User is not only authenticated, but also authorized
        if (foundUser.id !== req.userId) {
            res.status(403).json({ message: "Unauthorized operation" });
            return;
        }
        const [user] = await db
            .update(users)
            .set({ username: req.body.username })
            .where(eq(users.id, foundUser.id))
            .returning({
                id: users.id,
                username: users.username,
                email: users.email,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
            });
        res.status(200).json({ message: "Username updated successfully", data: user });
    } catch (error) {
        next(error);
    }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const foundUser = await db.query.users.findFirst({
            columns: { id: true, password: true },
            where: eq(users.id, id),
        });
        // Verify that fetched resource exists
        if (!foundUser) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        // Verify that User is not only authenticated, but also authorized
        if (foundUser.id !== req.userId) {
            res.status(403).json({ message: "Unauthorized operation" });
            return;
        }
        // Verify that old_password is valid
        const { old_password, new_password } = req.body;
        const doesPasswordMatch = await bcrypt.compare(old_password, foundUser.password);
        if (!doesPasswordMatch) {
            res.status(403).json({ message: "Incorrect old password" });
            return;
        }
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(new_password, salt);
        const [user] = await db
            .update(users)
            .set({ password: hashedPassword })
            .where(eq(users.id, foundUser.id))
            .returning({
                id: users.id,
                username: users.username,
                email: users.email,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
            });
        res.status(200).json({ message: "Password updated successfully", data: user });
    } catch (error) {
        next(error);
    }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const foundUser = await db.query.users.findFirst({
            columns: { id: true },
            where: eq(users.id, id),
        });
        // Verify that fetched resource exists
        if (!foundUser) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        // Verify that User is not only authenticated, but also authorized
        if (foundUser.id !== req.userId) {
            res.status(403).json({ message: "Unauthorized operation" });
            return;
        }
        await db.delete(users).where(eq(users.id, foundUser.id));
        res.clearCookie("refreshToken", { httpOnly: true, sameSite: "none", secure: true });
        res.status(200).json({ message: "User account deleted successfully" });
    } catch (error) {
        next(error);
    }
};
