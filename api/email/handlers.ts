import mailer from "../clients/nodemailer";
import dayjs from "dayjs";
import { subscriptions } from "../../db/schema";
import { users } from "../../db/schema";
import { CustomError } from "../routes/error";
// prettier-ignore
import { EmailData, generateSubCancellationEmailBody, generateSubCreationEmailBody, generatePasswordResetEmailBody, generateReminderEmail, generateWelcomeEmailBody } from "./generators";
import { dayIntervals } from "./constants";

interface DefaultEmailConfig {
    username: string;
    recipientEmail: string;
}
export const sendWelcomeEmail = ({ username, recipientEmail }: DefaultEmailConfig) => {
    const mail = generateWelcomeEmailBody(username);
    mailer.sendMail(
        {
            from: process.env.GMAIL_USER,
            to: recipientEmail,
            subject: "Welcome to SubTracker 😃",
            html: mail,
        },
        (error, info) => {
            if (error) throw new CustomError(500, error.message);
            console.log("Email sent: " + info.response);
        }
    );
};

interface PasswordResetEmail {
    recipientEmail: string;
    resetURL: string;
    expiry: string;
}
export const sendPasswordResetEmail = ({ recipientEmail, resetURL, expiry }: PasswordResetEmail) => {
    const mail = generatePasswordResetEmailBody({ resetURL, expiry });
    mailer.sendMail(
        {
            from: process.env.GMAIL_USER,
            to: recipientEmail,
            subject: "Reset password to your SubTracker account",
            html: mail,
        },
        (error, info) => {
            if (error) throw new CustomError(500, error.message);
            console.log("Email sent: " + info.response);
        }
    );
};

interface ReminderEmail {
    recipientEmail: string;
    tag: string;
    subscription: typeof subscriptions.$inferSelect & {
        user: Pick<typeof users.$inferSelect, "username" | "email">;
    };
}
export const sendReminderEmail = ({ recipientEmail, tag, subscription }: ReminderEmail) => {
    // prettier-ignore
    const emailTemplates = dayIntervals.map(day => ({
        tag: "day " + day,
        generateSubject: (subName: string) => `${day === 1 ? "⚡ Final" : "📅"} Reminder: Your ${subName} Subscription Renews ${day === 1 ? "Tomorrow" : `in ${day} Days!`}`,
        generateBody: (data: EmailData) => generateReminderEmail({ ...data, daysLeft: day }),
    }));

    const template = emailTemplates.find(t => t.tag === tag);
    if (!template) throw new Error("Invalid email tag");

    const subject = template.generateSubject(subscription.name);

    const { user, name, nextRenewalDate, currency, price, frequency, paymentMethod } = subscription;
    const mail = template.generateBody({
        username: user.username,
        subName: name,
        renewalDate: dayjs(nextRenewalDate).format("MMM D, YYYY"),
        planName: name,
        price: `${currency} ${price} (${frequency})`,
        paymentMethod,
    });

    mailer.sendMail(
        {
            from: process.env.GMAIL_USER,
            to: recipientEmail,
            subject: subject,
            html: mail,
        },
        (error, info) => {
            if (error) throw new CustomError(500, error.message);
            console.log("Email reminder sent: " + info.response);
        }
    );
};

export const sendCreationConfirmationEmail = ({ username, recipientEmail }: DefaultEmailConfig) => {
    const mail = generateSubCreationEmailBody(username);
    mailer.sendMail(
        {
            from: process.env.GMAIL_USER,
            to: recipientEmail,
            subject: "Subscription created",
            html: mail,
        },
        (error, info) => {
            if (error) throw new CustomError(500, error.message);
            console.log("Email sent: " + info.response);
        }
    );
};

export const sendCancellationConfirmationEmail = ({ username, recipientEmail }: DefaultEmailConfig) => {
    const mail = generateSubCancellationEmailBody(username);
    mailer.sendMail(
        {
            from: process.env.GMAIL_USER,
            to: recipientEmail,
            subject: "We hate to see you go 😞",
            html: mail,
        },
        (error, info) => {
            if (error) throw new CustomError(500, error.message);
            console.log("Email sent: " + info.response);
        }
    );
};
