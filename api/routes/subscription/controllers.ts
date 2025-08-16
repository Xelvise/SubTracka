import { Request, Response, NextFunction } from "express";
import { db, reminders, subscriptions } from "../../clients/db";
import { eq, asc, desc, and, gt } from "drizzle-orm";
import { qstashClient } from "../../clients/qstash";
import { config } from "dotenv";
import dayjs from "dayjs";
config({ path: `.env.${process.env.NODE_ENV || "dev"}` });

interface QueryParams {
    orderBy?: "price" | "startDate" | "nextRenewalDate";
    sort?: "asc" | "desc";
    status?: "active" | "expired" | "cancelled";
}
const { QSTASH_WEBHOOK_SECRET: webhookSecret, QSTASH_URL, QSTASH_TOKEN } = process.env;

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
        if (!webhookSecret) throw new Error("QSTASH_WEBHOOK_SECRET is missing");
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

        // Trigger an email reminder workflow
        await qstashClient.publishJSON({
            url: "https://" + req.headers.host + "/api/v1/webhooks/subscription/reminder",
            body: { subId: sub.id },
            headers: new Headers({ Authorization: webhookSecret }),
        });
        res.status(201).json({ message: "Subscription created successfully", data: sub });
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
        if (!webhookSecret) throw new Error("QSTASH_WEBHOOK_SECRET is missing");

        const { id } = req.params;
        const sub = await db.query.subscriptions.findFirst({
            with: { user: { columns: { email: true, username: true } } },
            columns: { id: true, userId: true, status: true },
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
        // Verify that subscription hasn't be cancelled before
        if (sub.status === "cancelled") {
            res.status(200).json({ message: "Subscription has already been cancelled" });
            return;
        }

        // Cancel and delete any scheduled reminder associated with subscription, if it exists
        const scheduledReminders = await db.query.reminders.findMany({ where: eq(reminders.subId, sub.id) });
        if (scheduledReminders.length > 0) {
            if (!QSTASH_URL || !QSTASH_TOKEN) throw new Error("One or both of QSTASH credentials is missing");
            const messageIds = scheduledReminders.map(reminder => reminder.messageId);

            const response = await fetch(`${QSTASH_URL}/v2/messages`, {
                method: "DELETE",
                headers: new Headers({ Authorization: `Bearer ${QSTASH_TOKEN}`, "Content-Type": "application/json" }),
                body: JSON.stringify({ messageIds }),
            });
            if (!response.ok) {
                // prettier-ignore
                console.error(`Unable to cancel scheduled reminders using QStash API: ${response.status} - ${await response.text()}`);
                res.status(500).json({ message: "Unable to cancel scheduled reminders right now" });
                return;
            }
            // Schedule cancellation confirmation email
            await qstashClient.publishJSON({
                url: "https://" + req.headers.host + "/api/v1/webhooks/subscription/send-email",
                body: {
                    type: "cancelled-sub",
                    info: { email: sub.user.email, username: sub.user.username },
                },
                headers: new Headers({ Authorization: webhookSecret }),
            });
            // Delete all cancelled reminders, so there won't be need to re-cancel
            await db.delete(reminders).where(eq(reminders.subId, sub.id));
        }

        // Cancel User subscription
        const [result] = await db
            .update(subscriptions)
            .set({ status: "cancelled" })
            .where(eq(subscriptions.id, sub.id))
            .returning();
        res.status(200).json({ message: "Subscription cancelled successfully", data: result });
    } catch (error) {
        next(error);
    }
};

export const deleteSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
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

        // Cancel and delete any scheduled reminder associated with subscription, if it exists
        const scheduledReminders = await db.query.reminders.findMany({ where: eq(reminders.subId, sub.id) });
        if (scheduledReminders.length > 0) {
            if (!QSTASH_URL || !QSTASH_TOKEN) throw new Error("One or both of QSTASH credentials is missing");
            const messageIds = scheduledReminders.map(reminder => reminder.messageId);

            const response = await fetch(`${QSTASH_URL}/v2/messages`, {
                method: "DELETE",
                headers: new Headers({ Authorization: `Bearer ${QSTASH_TOKEN}`, "Content-Type": "application/json" }),
                body: JSON.stringify({ messageIds }),
            });
            if (!response.ok) {
                // prettier-ignore
                console.error(`Unable to cancel scheduled reminders using QStash API: ${response.status} - ${await response.text()}`);
                res.status(500).json({ message: "Unable to cancel scheduled reminders right now" });
                return;
            }
            // Schedule cancellation confirmation email
            await qstashClient.publishJSON({
                url: "https://" + req.headers.host + "/api/v1/webhooks/subscription/send-email",
                body: {
                    type: "cancelled-sub",
                    info: { email: sub.user.email, username: sub.user.username },
                },
                headers: new Headers({ Authorization: webhookSecret }),
            });
        }
        // Delete User subscription which in turn deletes associated reminders, if any
        await db.delete(subscriptions).where(eq(subscriptions.id, sub.id));
        res.status(200).json({ message: "Subscription deleted successfully" });
    } catch (error) {
        next(error);
    }
};
