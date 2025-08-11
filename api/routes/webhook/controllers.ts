import { Request, Response, NextFunction } from "express";
import { serve } from "@upstash/workflow/express";
import { db, subscriptions } from "../../db";
import { eq } from "drizzle-orm";
import dayjs from "dayjs";
import { dayIntervals } from "../../email/constants";
import { sendReminderEmail, sendPasswordResetEmail, sendWelcomeEmail } from "../../email/handlers";
import https from "https";
import { Redis } from "@upstash/redis";

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

export const pingSupabase = (req: Request) => {
    const { CRON_SECRET: secret, SUPABASE_ANON_KEY, SUPABASE_URL } = process.env;
    if (!secret) throw new Error("CRON_SECRET cannot be found");
    if (!SUPABASE_ANON_KEY || !SUPABASE_URL) throw new Error("Either Supabase Anon Key or Supabase URL was not found");

    const { authorization } = req.headers;
    if (!authorization || authorization !== `Bearer ${secret}`) {
        console.error("Authorization failed");
        return;
    }
    const request = https.request(
        {
            hostname: SUPABASE_URL,
            path: "/rest/v1/users",
            method: "GET",
            headers: { apikey: SUPABASE_ANON_KEY, authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        },
        ({ statusCode }) => {
            if (!statusCode || ![200, 404].includes(statusCode)) return console.error("❌ Database ping failed");
            console.log(`✅ Database ping successful (HTTP ${statusCode})`);
        }
    );
    request.on("error", err => console.error(err.message));
    request.end();
};

export const pingUpstashRedis = (req: Request) => {
    const { CRON_SECRET: secret, UPSTASH_REDIS_TOKEN: upstashToken } = process.env;
    if (!secret) throw new Error("CRON_SECRET cannot be found");
    if (!upstashToken) throw new Error("UPSTASH_REDIS_TOKEN cannot be found");

    const { authorization } = req.headers;
    if (!authorization || authorization !== `Bearer ${secret}`) {
        console.error("Authorization failed");
        return;
    }
    const redis = new Redis({
        url: "https://lenient-worm-24059.upstash.io",
        token: upstashToken,
    });
    redis
        .set("ip", req.ip)
        .then(() => console.log("✅ Redis ping successful"))
        .catch(err => console.error("❌ Redis ping failed: ", err));
};
