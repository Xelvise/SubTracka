import { Request, Response, NextFunction } from "express";
import { db, reminders, subscriptions } from "../../clients/db";
import { eq } from "drizzle-orm";
import dayjs from "dayjs";
import { dayIntervals } from "../../email/constants";
// prettier-ignore
import { sendReminderEmail, sendPasswordResetEmail, sendWelcomeEmail, sendCancellationConfirmationEmail, sendCreationConfirmationEmail } from "../../email/handlers";
import https from "https";
import { Redis } from "@upstash/redis";
import { CustomError } from "../error";
import { qstashClient } from "../../clients/qstash";

export const reminderScheduler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { QSTASH_WEBHOOK_SECRET: webhookSecret } = process.env;
        if (!webhookSecret) throw new Error("QSTASH_WEBHOOK_SECRET is missing from .env");

        // Retrieve subscription info along with its creator
        const sub = await db.query.subscriptions.findFirst({
            with: { user: { columns: { username: true, email: true } } },
            where: eq(subscriptions.id, req.body.subId),
        });
        console.log({ sub });

        // Continue execution only if subscription exists
        if (!sub) throw new CustomError(404, "Subscription does not exist");
        const renewalDate = dayjs(sub.nextRenewalDate);

        // Send an email acknowledging subscription has been created
        await qstashClient.publishJSON({
            url: "https://" + req.headers.host + "/api/v1/webhooks/subscription/send-email",
            body: {
                type: "created-sub",
                info: { email: sub.user.email, username: sub.user.username, subName: sub.name },
            },
            headers: new Headers({ Authorization: webhookSecret }),
        });

        // Schedule forthcoming reminders
        for (const daysBefore of dayIntervals) {
            const reminderDate = renewalDate.subtract(daysBefore, "day");

            // If reminder date has past, skip to next interval
            if (reminderDate.isBefore(dayjs(), "day")) {
                console.log(`Day ${daysBefore} reminder has past... skipping to the next`);
            }

            // If reminder date is ahead of current date, enqueue reminder to be triggered at the exact date
            if (reminderDate.isAfter(dayjs(), "day")) {
                const { scheduleId } = await qstashClient.schedules.create({
                    cron: reminderDate.format("m H D M d"),
                    destination: "https://" + req.headers.host + "/api/v1/webhooks/subscription/reminder",
                    body: JSON.stringify({ subId: sub.id }),
                    headers: new Headers({ Authorization: webhookSecret, "Content-Type": "application/json" }),
                });
                console.log(`Next Reminder for ${scheduleId} is scheduled to fire on ${reminderDate}`);

                // Save messageId of scheduled reminder into DB for future cancellation, if needed
                await db.insert(reminders).values({ subId: sub.id, messageId: scheduleId });
            }

            // Trigger reminder, if reminder date is same as current date
            if (reminderDate.isSame(dayjs(), "day")) {
                sendReminderEmail({
                    recipientEmail: sub.user.email,
                    tag: "day " + daysBefore,
                    subscription: sub,
                });
            }
        }
        res.status(200).json({ message: "Email sent & reminders scheduled successfully" });
    } catch (err) {
        next(err);
    }
};

export const sendEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { type, info } = req.body as { type: string; info: { [key: string]: string } };

        if (type === "password-reset") {
            const { email: recipientEmail, resetURL, expiry = "30m" } = info;
            if (!recipientEmail || !resetURL) throw new CustomError(400, "Info is missing required contents");
            await sendPasswordResetEmail({ recipientEmail, resetURL, expiry });
            res.status(200).json({ message: "Email sent successfully" });
        }
        if (type === "welcome") {
            const { email: recipientEmail, username } = info;
            if (!recipientEmail || !username) throw new CustomError(400, "Info is missing required contents");
            await sendWelcomeEmail({ recipientEmail, username });
            res.status(200).json({ message: "Email sent successfully" });
        }
        if (type === "created-sub") {
            const { email: recipientEmail, username, subName } = info;
            if (!recipientEmail || !username) throw new CustomError(400, "Info is missing required contents");
            await sendCreationConfirmationEmail({ recipientEmail, username, subName });
            res.status(200).json({ message: "Email sent successfully" });
        }
        if (type === "cancelled-sub") {
            const { email: recipientEmail, username } = info;
            if (!recipientEmail || !username) throw new CustomError(400, "Info is missing required contents");
            await sendCancellationConfirmationEmail({ recipientEmail, username });
            res.status(200).json({ message: "Email sent successfully" });
        }
        // Otherwise, express-validator middleware throws a 400 Bad request response
    } catch (err) {
        next(err);
    }
};

// -------------------------------------------------------------------------------------------------------------
// Define HTTP Webhooks to be triggered by Vercel cron jobs
// -------------------------------------------------------------------------------------------------------------

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
