import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { config } from "dotenv";
config({ path: `.env.${process.env.NODE_ENV || "dev"}` });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("Database URL is missing");

// Open a TCP socket to POSTGRES_HOST
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema, logger: true });

// Re-export all schema for convenience
export * from "./schema";
