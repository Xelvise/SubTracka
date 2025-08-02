import { Client } from "@upstash/workflow";
import { Receiver } from "@upstash/qstash";
import { config } from "dotenv";
config({ path: `.env.${process.env.NODE_ENV || "dev"}` });

const { QSTASH_URL, QSTASH_TOKEN, QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY } = process.env;
if (!QSTASH_TOKEN) throw new Error("QStash token is missing");
if (!QSTASH_URL) throw new Error("QStash URL is missing");
if (!QSTASH_CURRENT_SIGNING_KEY) throw new Error("QStash current signing key is missing");
if (!QSTASH_NEXT_SIGNING_KEY) throw new Error("QStash next signing key is missing");

export const workflowClient = new Client({
    baseUrl: QSTASH_URL,
    token: QSTASH_TOKEN,
    // headers: { authorization: "Bearer " + QSTASH_TOKEN },
});

export const qstashReceiver = new Receiver({
    currentSigningKey: QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: QSTASH_NEXT_SIGNING_KEY,
});
