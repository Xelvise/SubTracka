import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
config({ path: `.env.${process.env.NODE_ENV || "dev"}` });

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE URL is missing");
}

export default defineConfig({
    schema: "./db/schema.ts",
    schemaFilter: ["public"],
    out: "./db/migrations",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL,
    },
});
