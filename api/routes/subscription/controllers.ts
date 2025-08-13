import { Request, Response, NextFunction } from "express";
import { db, subscriptions } from "../../clients/db";
import { eq, asc, desc, and, gt } from "drizzle-orm";
import { qstashClient, workflowClient } from "../../clients/qstash";
import { config } from "dotenv";
import dayjs from "dayjs";
config({ path: `.env.${process.env.NODE_ENV || "dev"}` });

interface QueryParams {
    orderBy?: "price" | "startDate" | "nextRenewalDate";
    sort?: "asc" | "desc";
    status?: "active" | "expired" | "cancelled";
}
const { QSTASH_WEBHOOK_SECRET } = process.env;

export const fetchUserSubscriptions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orderBy = "startDate", sort = "desc", status } = req.query as QueryParams;
        if (!status) {
            const subs = await db.query.subscriptions.findMany({
                where: eq(subscriptions.userId, req.userId),
                orderBy: [sort === "desc" ? desc(subscriptions[orderBy]) : asc(subscriptions[orderBy])],
            });
            res.status(200).json({ message: "User subscriptions fetched successfully", data: subs });
            return;
        }
        const subs = await db.query.subscriptions.findMany({
            where: and(eq(subscriptions.userId, req.userId), eq(subscriptions.status, status)),
            orderBy: [sort === "desc" ? desc(subscriptions[orderBy]) : asc(subscriptions[orderBy])],
        });
        res.status(200).json({ message: "User subscriptions fetched successfully", data: subs });
    } catch (error) {
        next(error);
    }
};

export const fetchUpcomingSubRenewals = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const subs = await db.query.subscriptions.findMany({
            where: and(
                eq(subscriptions.userId, req.userId),
                eq(subscriptions.status, "active"),
                gt(subscriptions.nextRenewalDate, dayjs().format("YYYY-MM-DD"))
            ),
            orderBy: [asc(subscriptions.nextRenewalDate)],
        });
        res.status(200).json({ message: "Upcoming renewals fetched successfully", data: subs });
    } catch (error) {
        next(error);
    }
};

export const createSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!QSTASH_WEBHOOK_SECRET) throw new Error("QSTASH_WEBHOOK_SECRET is missing from .env");

        // prettier-ignore
        const { name, price, currency, frequency, category, payment_method: paymentMethod, start_date: startDate } = req.body;
        // TODO: Wrap INSERT and UPDATE operations in a transaction block for a safe rollback
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
            .returning({ id: subscriptions.id });

        // Trigger an email reminder workflow
        const { workflowRunId } = await workflowClient.trigger({
            url: "https://" + req.headers.host + "/api/v1/webhooks/subscription/reminder",
            body: {
                secret: QSTASH_WEBHOOK_SECRET,
                subId: sub.id,
            },
            retries: 3,
        });
        // Save generated workflowRunId into DB
        const [result] = await db
            .update(subscriptions)
            .set({ workflowRunId })
            .where(eq(subscriptions.id, sub.id))
            .returning();

        res.status(201).json({ message: "Subscription created successfully", data: result });
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

export const cancelSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!QSTASH_WEBHOOK_SECRET) throw new Error("QSTASH_WEBHOOK_SECRET is missing from .env");

        const { id } = req.params;
        const sub = await db.query.subscriptions.findFirst({
            with: { user: { columns: { email: true, username: true } } },
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
        const [result] = await db
            .update(subscriptions)
            .set({ status: "cancelled" })
            .where(eq(subscriptions.id, sub.id))
            .returning();

        // Disable subscription reminder workflow for cancelled User, if it exists
        if (result.workflowRunId) await workflowClient.cancel({ ids: result.workflowRunId });

        // Schedule cancellation confirmation email
        await qstashClient.publishJSON({
            url: "https://" + req.headers.host + "/api/v1/webhooks/subscription/send-email",
            body: {
                secret: QSTASH_WEBHOOK_SECRET,
                type: "cancel-sub",
                info: { email: sub.user.email, username: sub.user.username },
            },
        });
        res.status(200).json({ message: "Subscription cancelled successfully", data: result });
    } catch (error) {
        next(error);
    }
};

export const deleteSubscription = async (req: Request, res: Response, next: NextFunction) => {
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
        // Disable subscription reminder workflow for deleted User, if it exists
        const [{ workflowRunId }] = await db
            .delete(subscriptions)
            .where(eq(subscriptions.id, sub.id))
            .returning({ workflowRunId: subscriptions.workflowRunId });
        if (workflowRunId) await workflowClient.cancel({ ids: workflowRunId });

        res.status(200).json({ message: "Subscription deleted successfully" });
    } catch (error) {
        next(error);
    }
};
