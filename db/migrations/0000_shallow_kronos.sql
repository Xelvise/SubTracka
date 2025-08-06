CREATE TYPE "public"."category" AS ENUM('sports', 'news', 'entertainment', 'lifestyle', 'technology', 'finance', 'politics', 'other');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('USD', 'EUR', 'GBP');--> statement-breakpoint
CREATE TYPE "public"."frequency" AS ENUM('daily', 'weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('active', 'cancelled', 'expired');--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"price" numeric NOT NULL,
	"currency" "currency" DEFAULT 'USD',
	"frequency" "frequency" NOT NULL,
	"category" "category" NOT NULL,
	"payment_method" text NOT NULL,
	"status" "status" DEFAULT 'active' NOT NULL,
	"start_date" date NOT NULL,
	"renewal_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "start_date_validity_check" CHECK (start_date <= CURRENT_DATE),
	CONSTRAINT "renewal_date_validity_check" CHECK (renewal_date > start_date)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "users_email_key" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;