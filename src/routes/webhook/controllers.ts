import { Request, Response, NextFunction } from "express";
import { serve } from "@upstash/workflow/express";
import { db, subscriptions } from "../../db";
import { eq } from "drizzle-orm";
import dayjs from "dayjs";
import { dayIntervals } from "../../email/constants";
import { sendReminderEmail, sendPasswordResetEmail, sendWelcomeEmail } from "../../email/handlers";

interface Payload {
    [key: string]: any;
    subId: string;
}

export const reminderScheduler = serve<Payload>(async context => {
    const { subId } = context.requestPayload;
    console.log("Workflow has started");

    // Retrieve subscription info along with its creator
    const subscription = await context.run("Step 1: get subscription", () => {
        return db.query.subscriptions.findFirst({
            with: { user: { columns: { username: true, email: true } } },
            where: eq(subscriptions.id, subId),
        });
    });

    // Continue execution only if subscription exists
    if (!subscription) return;
    const renewalDate = dayjs(subscription.nextRenewalDate);

    // TODO: Send an email acknowledging subscription has been created

    dayIntervals.forEach(async daysBefore => {
        const reminderDate = renewalDate.subtract(daysBefore, "day");

        // If reminder date has past, skip to next interval
        if (reminderDate.isBefore(dayjs(), "day")) return;

        // If reminder date is ahead of current date, postpone reminder till its true date
        if (reminderDate.isAfter(dayjs(), "day")) {
            const remainingDays = reminderDate.diff(dayjs(), "day");
            console.log(`${remainingDays} days until trigger of reminder`);
            await context.sleepUntil(`Reminder in ${remainingDays} days from now`, reminderDate.toDate());
            return;
        }
        // Trigger reminder, if reminder date is same as current date
        if (reminderDate.isSame(dayjs(), "day")) {
            await context.run("Step 2: send reminder", () => {
                sendReminderEmail({
                    recipientEmail: subscription.user.email,
                    tag: "day " + daysBefore,
                    subscription,
                });
            });
            console.log("Email reminder sent");
            return;
        }
    });
});

export const sendEmail = (req: Request, res: Response, next: NextFunction) => {
    try {
        const { type, info } = req.body as { type: string; info: { [key: string]: string } };

        if (type === "password-reset") {
            const { email: recipientEmail, resetURL, expiry = "30m" } = info;
            if (!recipientEmail || !resetURL) {
                res.status(400).json({ message: "Invalid info" });
                return;
            }
            sendPasswordResetEmail({ recipientEmail, resetURL, expiry });
        }
        if (type === "welcome") {
            const { email: recipientEmail, username } = info;
            if (!recipientEmail || !username) {
                res.status(400).json({ message: "Invalid info" });
                return;
            }
            sendWelcomeEmail({ recipientEmail, username });
        }
        res.status(200).json({ message: "Email sent successfully" });
    } catch (error) {
        next(error);
    }
};
