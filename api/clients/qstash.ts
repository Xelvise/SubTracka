import { Client as WorkflowClient } from "@upstash/workflow";
import { Client as QstashClient } from "@upstash/qstash";
import { config } from "dotenv";
config({ path: `.env.${process.env.NODE_ENV || "dev"}` });

const { QSTASH_URL, QSTASH_TOKEN } = process.env;
if (!QSTASH_TOKEN) throw new Error("QStash token is missing");
if (!QSTASH_URL) throw new Error("QStash URL is missing");

export const workflowClient = new WorkflowClient({
    baseUrl: QSTASH_URL,
    token: QSTASH_TOKEN,
    headers: { "Content-Type": "application/json" },
});

export const qstashClient = new QstashClient({
    baseUrl: QSTASH_URL,
    token: QSTASH_TOKEN,
});
