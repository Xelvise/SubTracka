import { Request, Response, NextFunction } from "express";
import { db, subscriptions } from "../../clients/db";
import { eq, asc, desc } from "drizzle-orm";
import { workflowClient } from "../../clients/qstash";
import { config } from "dotenv";
config({ path: `.env.${process.env.NODE_ENV || "dev"}` });

interface QueryParams {
    orderBy?: "price" | "startDate" | "nextRenewalDate";
    sort?: "asc" | "desc";
}

export const fetchUserSubscriptions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orderBy, sort } = req.query as QueryParams;
        const sub = await db.query.subscriptions.findMany({
            where: eq(subscriptions.userId, req.userId),
            orderBy: [
                orderBy
                    ? sort === "desc"
                        ? desc(subscriptions[orderBy])
                        : asc(subscriptions[orderBy])
                    : asc(subscriptions.nextRenewalDate),
            ],
        });
        res.status(200).json({ message: "User subscriptions fetched successfully", data: sub });
    } catch (error) {
        next(error);
    }
};

export const createSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // prettier-ignore
        const { name, price, currency, frequency, category, payment_method: paymentMethod, start_date: startDate } = req.body;
        const [sub] = await db
            .insert(subscriptions)
            .values({
                userId: req.userId,
                name,
                price,
                currency,
                frequency,
                category,
                paymentMethod,
                startDate,
            })
            .returning();
        // Publish a message to QStash
        const { workflowRunId } = await workflowClient.trigger({
            url: req.protocol + "://" + req.headers.host + "/api/v1/workflows/subscription/reminder",
            body: { subId: sub.id },
            retries: 1,
        });
        res.status(201).json({ message: "Subscription created successfully", data: { sub, workflowRunId } });
    } catch (error) {
        next(error);
    }
};

export const fetchSingleSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const sub = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.id, id),
        });
        // Verify that fetched resource exists
        if (!sub) {
            res.status(404).json({ message: "Subscription not found" });
            return;
        }
        // Verify that User is not only authenticated, but also authorized
        if (sub.userId !== req.userId) {
            res.status(403).json({ message: "Unauthorized access" });
            return;
        }
        res.status(200).json({ message: "Subscription fetched successfully", data: sub });
    } catch (error) {
        next(error);
    }
};

export const updateSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const sub = await db.query.subscriptions.findFirst({
            columns: { id: true, userId: true },
            where: eq(subscriptions.id, id),
        });
        // Verify that fetched resource exists
        if (!sub) {
            res.status(404).json({ message: "Subscription not found" });
            return;
        }
        // Verify that User is not only authenticated, but also authorized
        if (sub.userId !== req.userId) {
            res.status(403).json({ message: "Unauthorized access" });
            return;
        }
        const { name, price, currency, category, payment_method: paymentMethod } = req.body;
        const [newSub] = await db
            .update(subscriptions)
            .set({ name, price, currency, category, paymentMethod })
            .where(eq(subscriptions.id, sub.id))
            .returning();
        res.status(200).json({ message: "User subscriptions updated successfully", data: newSub });
    } catch (error) {
        next(error);
    }
};
