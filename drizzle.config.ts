import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
config({ path: `.env.${process.env.NODE_ENV || "dev"}` });

if (!process.env.PG_URL) {
    throw new Error("DATABASE URL is missing");
}

export default defineConfig({
    schema: "./migrations/schema.ts",
    schemaFilter: ["public"],
    out: "./migrations",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.PG_URL,
    },
});
