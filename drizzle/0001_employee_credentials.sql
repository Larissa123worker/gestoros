ALTER TABLE "employee_profiles" ADD COLUMN IF NOT EXISTS "name" text;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD COLUMN IF NOT EXISTS "email" varchar(320);--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD COLUMN IF NOT EXISTS "password_hash" text;
