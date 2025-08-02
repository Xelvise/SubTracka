import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../migrations/schema";
import { config } from "dotenv";
config({ path: `.env.${process.env.NODE_ENV || "dev"}` });

if (!process.env.PG_URL) throw new Error("Database URL is missing");

// Open a TCP socket to POSTGRES_HOST
export const db = drizzle(process.env.PG_URL, { schema });

// Re-export all schema for convenience
export * from "../migrations/schema";
