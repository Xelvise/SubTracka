import nodemailer from "nodemailer";
import { config } from "dotenv";
config({ path: `.env.${process.env.NODE_ENV || "dev"}` });

const { GMAIL_USER: email, GMAIL_PASSWORD: password } = process.env;
if (!email || !password) throw new Error("Nodemailer Gmail credentials are missing");

const mailer = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: email,
        pass: password,
    },
});

export default mailer;
