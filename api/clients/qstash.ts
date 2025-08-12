import { Client as WorkflowClient } from "@upstash/workflow";
import { Client as QstashClient } from "@upstash/qstash";
import { Receiver } from "@upstash/qstash";
import { config } from "dotenv";
const env = process.env.NODE_ENV || "dev";
config({ path: `.env.${env}` });

const { QSTASH_URL, QSTASH_TOKEN, QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY } = process.env;
if (!QSTASH_TOKEN) throw new Error("QStash token is missing");
if (!QSTASH_URL) throw new Error("QStash URL is missing");
if (env !== "dev" && !QSTASH_CURRENT_SIGNING_KEY) throw new Error("QStash current signing key is missing");
if (env !== "dev" && !QSTASH_NEXT_SIGNING_KEY) throw new Error("QStash next signing key is missing");

export const workflowClient = new WorkflowClient({
    baseUrl: QSTASH_URL,
    token: QSTASH_TOKEN,
    headers: { "Content-Type": "application/json" },
});

export const qstashClient = new QstashClient({
    baseUrl: QSTASH_URL,
    token: QSTASH_TOKEN,
});

export const qstashReceiver = new Receiver({
    currentSigningKey: QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: QSTASH_NEXT_SIGNING_KEY!,
});
