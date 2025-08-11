import { relations, sql } from "drizzle-orm";
import { uuid, text, timestamp, decimal, pgEnum, date, check, pgTable } from "drizzle-orm/pg-core";

export const currency = pgEnum("currency", ["USD", "EUR", "GBP"]);
export const frequency = pgEnum("frequency", ["daily", "weekly", "monthly", "yearly"]);
export const category = pgEnum("category", [
    "sports",
    "news",
    "entertainment",
    "lifestyle",
    "technology",
    "finance",
    "politics",
    "other",
]);
export const paymentMethod = pgEnum("payment_method", ["credit card", "paypal", "bitcoin"]);
export const status = pgEnum("status", ["active", "cancelled", "expired"]);

// prettier-ignore
export const users = pgTable("users", {
    id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
    username: text("username").notNull().unique("users_username_key"),
    email: text("email").notNull().unique("users_email_key"),
    password: text("password").notNull(),
    passwordResetToken: text("password_reset_token"),
    passwordResetTokenExpiry: timestamp("password_reset_token_expiry", { withTimezone: true, mode: "string" }),
    jwtRefreshToken: text("jwt_refresh_token"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().$onUpdateFn(() => sql`NOW()`),
})

// prettier-ignore
export const subscriptions = pgTable(
    "subscriptions",
    {
        id: uuid().primaryKey().notNull().default(sql`gen_random_uuid()`),
        userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        price: decimal("price").notNull(),
        currency: currency("currency").notNull().default("USD"),
        frequency: frequency("frequency").notNull(),
        category: category("category").notNull(),
        paymentMethod: paymentMethod("payment_method").notNull().default("credit card"),
        status: status("status").notNull().default("active"),
        startDate: date("start_date").notNull().$defaultFn(() => sql`CURRENT_DATE`),
        nextRenewalDate: date("renewal_date"),
        createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().$onUpdateFn(() => sql`NOW()`),
        workflowRunId: text("worflow_run_id")
    },
    () => [check("start_date_validity_check", sql`start_date >= CURRENT_DATE`)]
);

export const userRelations = relations(users, ({ many }) => ({
    subs: many(subscriptions),
}));

export const subRelations = relations(subscriptions, ({ one }) => ({
    user: one(users, {
        fields: [subscriptions.userId],
        references: [users.id],
    }),
}));
