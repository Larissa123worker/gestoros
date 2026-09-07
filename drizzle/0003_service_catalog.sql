CREATE TABLE IF NOT EXISTS "service_catalog" (
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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'service_catalog_company_id_company_profiles_id_fk'
  ) THEN
    ALTER TABLE "service_catalog"
      ADD CONSTRAINT "service_catalog_company_id_company_profiles_id_fk"
      FOREIGN KEY ("company_id") REFERENCES "public"."company_profiles"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "started_at" timestamp;
ALTER TABLE "service_orders" ADD COLUMN IF NOT EXISTS "completed_at" timestamp;