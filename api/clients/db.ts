import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../db/schema";
import { config } from "dotenv";
config({ path: `.env.${process.env.NODE_ENV || "dev"}` });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("Database URL is missing");

// Open a TCP socket to POSTGRES_HOST
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });

// Re-export all schema for convenience
export * from "../../db/schema";
