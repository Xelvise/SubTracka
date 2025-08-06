import transporter from "../clients/nodemailer";
import { emailTemplates } from "./constants.js";
import dayjs from "dayjs";
import { Duration } from "@upstash/workflow";
import { subscriptions } from "../db/schema";
import { users } from "../db/schema";
import { CustomError } from "../routes/error";

interface PasswordResetEmail {
    email: string;
    token: string;
    userId: string;
    expiry: Duration;
}

export const sendPasswordResetEmail = ({ email, token, userId, expiry }: PasswordResetEmail) => {};

interface ReminderEmail {
    recipientEmail: string;
    tag: string;
    subscription: typeof subscriptions.$inferSelect & {
        user: Pick<typeof users.$inferSelect, "username" | "email">;
    };
}

export const sendReminderEmail = async ({ recipientEmail, tag, subscription }: ReminderEmail) => {
    const template = emailTemplates.find(t => t.tag === tag);
    if (!template) throw new Error("Invalid email tag");

    const subject = template.generateSubject(subscription.name);

    const { user, name, nextRenewalDate, currency, price, frequency, paymentMethod } = subscription;
    const message = template.generateBody({
        username: user.username,
        subName: name,
        renewalDate: dayjs(nextRenewalDate).format("MMM D, YYYY"),
        planName: name,
        price: `${currency} ${price} (${frequency})`,
        paymentMethod,
    });

    transporter.sendMail(
        {
            from: process.env.GMAIL_USER,
            to: recipientEmail,
            subject: subject,
            html: message,
        },
        (error, info) => {
            if (error) return console.log(error, "Error sending email");
            console.log("Email sent: " + info.response);
        }
    );
};
