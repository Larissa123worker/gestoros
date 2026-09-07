CREATE TABLE IF NOT EXISTS "company_subscriptions" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "company_id" varchar(64) NOT NULL REFERENCES "company_profiles"("id") ON DELETE CASCADE,
  "plan_id" varchar(64),
  "asaas_customer_id" varchar(64),
  "asaas_subscription_id" varchar(64),
  "billing_type" varchar(32),
  "cycle" varchar(32),
  "plan" varchar(64) NOT NULL DEFAULT 'Profissional',
  "status" varchar(32) NOT NULL DEFAULT 'trialing',
  "trial_started_at" timestamptz,
  "trial_ends_at" timestamptz,
  "next_billing_at" timestamptz,
  "amount" numeric(12,2) DEFAULT 179,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "subscription_payments" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "subscription_id" varchar(64) NOT NULL REFERENCES "company_subscriptions"("id") ON DELETE CASCADE,
  "asaas_payment_id" varchar(64) UNIQUE,
  "billing_type" varchar(32),
  "description" text,
  "amount" varchar(32) NOT NULL,
  "status" varchar(32) NOT NULL DEFAULT 'pending',
  "due_at" timestamptz,
  "paid_at" timestamptz,
  "external_id" varchar(128),
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS company_subscriptions_company_id_idx ON "company_subscriptions" ("company_id");

ALTER TABLE "company_subscriptions" ADD COLUMN IF NOT EXISTS "plan_id" varchar(64);
ALTER TABLE "company_subscriptions" ADD COLUMN IF NOT EXISTS "asaas_customer_id" varchar(64);
ALTER TABLE "company_subscriptions" ADD COLUMN IF NOT EXISTS "asaas_subscription_id" varchar(64);
ALTER TABLE "company_subscriptions" ADD COLUMN IF NOT EXISTS "billing_type" varchar(32);
ALTER TABLE "company_subscriptions" ADD COLUMN IF NOT EXISTS "cycle" varchar(32);
ALTER TABLE "company_subscriptions" ADD COLUMN IF NOT EXISTS "amount" numeric(12,2) DEFAULT 179;
ALTER TABLE "subscription_payments" ADD COLUMN IF NOT EXISTS "asaas_payment_id" varchar(64);
ALTER TABLE "subscription_payments" ADD COLUMN IF NOT EXISTS "billing_type" varchar(32);

CREATE TABLE IF NOT EXISTS "billing_plans" (
  "id" varchar(64) PRIMARY KEY NOT NULL,
  "slug" varchar(64) NOT NULL UNIQUE,
  "name" varchar(120) NOT NULL,
  "description" text,
  "monthly_amount" numeric(12,2) NOT NULL,
  "annual_amount" numeric(12,2) NOT NULL,
  "max_employees" varchar(32),
  "active" varchar(8) NOT NULL DEFAULT 'true',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "asaas_webhook_events" (
  "id" varchar(160) PRIMARY KEY NOT NULL,
  "event" varchar(100) NOT NULL,
  "payload" text NOT NULL,
  "processed_at" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);