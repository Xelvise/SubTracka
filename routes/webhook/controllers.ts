import { Request, Response, NextFunction } from "express";
import { serve } from "@upstash/workflow/express";
import { db, subscriptions } from "../../db";
import { eq } from "drizzle-orm";
import dayjs from "dayjs";
import { dayIntervals } from "../../utils/constants";
import { sendReminderEmail } from "../../utils/email-generators";

interface Payload {
    [key: string]: any;
    subId: string;
}

export const reminderScheduler = serve<Payload>(async workflow => {
    const { subId } = workflow.requestPayload;
    console.log("Workflow has started");

    // Retrieve subscription info
    const subscription = await workflow.run("Step 1: get subscription", () => {
        return db.query.subscriptions.findFirst({
            with: { user: { columns: { username: true, email: true } } },
            where: eq(subscriptions.id, subId),
        });
    });

    // Verify that subscription exists
    if (!subscription) return;
    const renewalDate = dayjs(subscription.nextRenewalDate);

    dayIntervals.forEach(async daysBefore => {
        const reminderDate = renewalDate.subtract(daysBefore, "day");

        // If reminder date has past, skip to next interval
        if (reminderDate.isBefore(dayjs(), "day")) return;

        // If reminder date is ahead of current date, postpone reminder till its true date
        if (reminderDate.isAfter(dayjs(), "day")) {
            const remainingDays = reminderDate.diff(dayjs(), "day");
            console.log(`${remainingDays} days until trigger of reminder`);
            await workflow.sleepUntil(`Reminder in ${remainingDays} days from now`, reminderDate.toDate());
            return;
        }
        // Trigger reminder, if reminder date is same as current date
        if (reminderDate.isSame(dayjs(), "day")) {
            await workflow.run("Step 2: send reminder", () => {
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

export const sendEmail = async (req: Request, res: Response, next: NextFunction) => {
    const { type, info } = req.body;
    // TODO...
};
