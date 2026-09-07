ALTER TABLE "employee_profiles" DROP CONSTRAINT "employee_profiles_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN "street" text;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN "number" varchar(32);--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN "neighborhood" text;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN "state" varchar(120);--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN "observation" text;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN "reference_point" text;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD COLUMN "email" varchar(320);--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;