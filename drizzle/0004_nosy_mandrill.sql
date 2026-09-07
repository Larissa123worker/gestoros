CREATE TABLE "asaas_webhook_events" (
	"id" varchar(160) PRIMARY KEY NOT NULL,
	"event" varchar(100) NOT NULL,
	"payload" text NOT NULL,
	"processed_at" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_plans" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"monthly_amount" numeric(12, 2) NOT NULL,
	"annual_amount" numeric(12, 2) NOT NULL,
	"max_employees" varchar(32),
	"active" varchar(8) DEFAULT 'true' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "billing_plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "company_subscriptions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"company_id" varchar(64) NOT NULL,
	"plan_id" varchar(64),
	"asaas_customer_id" varchar(64),
	"asaas_subscription_id" varchar(64),
	"billing_type" varchar(32),
	"cycle" varchar(32),
	"plan" varchar(64) DEFAULT 'Profissional' NOT NULL,
	"status" varchar(32) DEFAULT 'trialing' NOT NULL,
	"trial_started_at" timestamp,
	"trial_ends_at" timestamp,
	"next_billing_at" timestamp,
	"amount" numeric(12, 2) DEFAULT '179',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_verifications" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"email" varchar(320) NOT NULL,
	"code" varchar(10) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified_at" timestamp,
	"attempts" numeric(2, 0) DEFAULT '0' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_catalog" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"company_id" varchar(64),
	"name" text NOT NULL,
	"description" text,
	"suggested_value" varchar(64) DEFAULT '0',
	"estimated_duration" varchar(64),
	"active" varchar(8) DEFAULT 'true' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_payments" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"subscription_id" varchar(64) NOT NULL,
	"asaas_payment_id" varchar(64),
	"billing_type" varchar(32),
	"description" text,
	"amount" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"due_at" timestamp,
	"paid_at" timestamp,
	"external_id" varchar(128),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_payments_asaas_payment_id_unique" UNIQUE("asaas_payment_id")
);
--> statement-breakpoint
ALTER TABLE "company_profiles" ADD COLUMN "postal_code" varchar(8);--> statement-breakpoint
ALTER TABLE "company_profiles" ADD COLUMN "address_number" varchar(16);--> statement-breakpoint
ALTER TABLE "company_profiles" ADD COLUMN "address_complement" varchar(120);--> statement-breakpoint
ALTER TABLE "service_orders" ADD COLUMN "started_at" timestamp;--> statement-breakpoint
ALTER TABLE "service_orders" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "company_subscriptions" ADD CONSTRAINT "company_subscriptions_company_id_company_profiles_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_subscriptions" ADD CONSTRAINT "company_subscriptions_plan_id_billing_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."billing_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_catalog" ADD CONSTRAINT "service_catalog_company_id_company_profiles_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscription_id_company_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."company_subscriptions"("id") ON DELETE cascade ON UPDATE no action;