ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT "start_date_validity_check";--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "worflow_run_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "start_date_validity_check" CHECK (start_date >= CURRENT_DATE);