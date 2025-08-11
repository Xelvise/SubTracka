CREATE TYPE "public"."payment_method" AS ENUM('credit card', 'paypal', 'bitcoin');--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "currency" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "payment_method" SET DEFAULT 'credit card'::"public"."payment_method";--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "payment_method" SET DATA TYPE "public"."payment_method" USING "payment_method"::"public"."payment_method";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_token_expiry" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "jwt_refresh_token" text;