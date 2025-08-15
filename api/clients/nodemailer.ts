import nodemailer from "nodemailer";
import { config } from "dotenv";
const env = process.env.NODE_ENV || "dev";
config({ path: `.env.${env}` });

const { GMAIL_USER: email, GMAIL_PASSWORD: password } = process.env;
if (!email || !password) throw new Error("Either one of GMAIL_USER or GMAIL_PASSWORD is missing");

// Connect and authenticate with Gmail's SMTP server
const mailer = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: email,
        pass: password,
    },
    port: env === "vercel" ? 465 : undefined,
});

export default mailer;
