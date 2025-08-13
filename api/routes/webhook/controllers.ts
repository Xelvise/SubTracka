import { Request, Response, NextFunction } from "express";
import { serve } from "@upstash/workflow/express";
import { db, subscriptions } from "../../clients/db";
import { eq } from "drizzle-orm";
import dayjs from "dayjs";
import { dayIntervals } from "../../email/constants";
// prettier-ignore
import { sendReminderEmail, sendPasswordResetEmail, sendWelcomeEmail, sendCancelConfirmationEmail } from "../../email/handlers";
import https from "https";
import { Redis } from "@upstash/redis";
import { CustomError } from "../error";

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
    if (!subscription) return console.error("Subscription does not exist");
    const renewalDate = dayjs(subscription.nextRenewalDate);

    // TODO: Send an email acknowledging subscription has been created

    dayIntervals.forEach(async daysBefore => {
        const reminderDate = renewalDate.subtract(daysBefore, "day");

        // If reminder date has past, skip to next interval
        if (reminderDate.isBefore(dayjs(), "day")) return console.log("Reminder has past... skipping to next interval");

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
        }
    });
});

export const sendEmail = (req: Request, res: Response, next: NextFunction) => {
    try {
        const { type, info } = req.body as { type: string; info: { [key: string]: string } };

        if (type === "password-reset") {
            const { email: recipientEmail, resetURL, expiry = "30m" } = info;
            if (!recipientEmail || !resetURL) throw new CustomError(400, "Info is missing required contents");
            sendPasswordResetEmail({ recipientEmail, resetURL, expiry });
            res.status(200).json({ message: "Email sent successfully" });
        }
        if (type === "welcome") {
            const { email: recipientEmail, username } = info;
            if (!recipientEmail || !username) throw new CustomError(400, "Info is missing required contents");
            sendWelcomeEmail({ recipientEmail, username });
            res.status(200).json({ message: "Email sent successfully" });
        }
        if (type === "cancel-sub") {
            const { email: recipientEmail, username } = info;
            if (!recipientEmail || !username) throw new CustomError(400, "Info is missing required contents");
            sendCancelConfirmationEmail({ recipientEmail, username });
            res.status(200).json({ message: "Email sent successfully" });
        }
    } catch (err) {
        next(err);
    }
};

// Define HTTP Webhooks to be triggered by Vercel cron jobs

export const pingSupabase = (req: Request, res: Response, next: NextFunction) => {
    try {
        const { CRON_SECRET: cronSecret, SUPABASE_SERVICE_ROLE_KEY } = process.env;
        if (!cronSecret) throw new Error("CRON_SECRET could not be found");
        if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY could not be found");

        const { authorization } = req.headers;
        if (!authorization || authorization !== `Bearer ${cronSecret}`) {
            throw new CustomError(401, "Authorization failed");
        }
        const request = https.request(
            {
                hostname: "tjvjqelyhjayoefsnfqp.supabase.co",
                path: "/rest/v1/users",
                method: "GET",
                headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
            },
            ({ statusCode }) => {
                if (!statusCode || ![200, 404].includes(statusCode)) return console.error("❌ Database ping failed");
                console.log(`✅ Database ping successful (HTTP ${statusCode})`);
            }
        );
        request.on("error", err => console.error(err.message));
        request.end();
    } catch (err) {
        next(err);
    }
};

export const pingUpstashRedis = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { CRON_SECRET: cronSecret, UPSTASH_REDIS_TOKEN: redisToken } = process.env;
        if (!cronSecret) throw new Error("CRON_SECRET could not be found");
        if (!redisToken) throw new Error("UPSTASH_REDIS_TOKEN could not be found");

        const { authorization } = req.headers;
        if (!authorization || authorization !== `Bearer ${cronSecret}`) {
            console.error("Authorization failed");
            return;
        }
        const redis = new Redis({
            url: "https://lenient-worm-24059.upstash.io",
            token: redisToken,
        });
        // Simple ping test
        redis
            .ping()
            .then(value => console.log("✅ Redis connection successful: ", value))
            .catch(err => console.error("❌ Redis connection failed:", err));
    } catch (err) {
        next(err);
    }
};
