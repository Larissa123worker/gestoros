CREATE TYPE "public"."role" AS ENUM('user', 'admin', 'company', 'employee', 'client');--> statement-breakpoint
CREATE TABLE "client_profiles" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"company_id" varchar(64),
	"name" text,
	"document" varchar(32),
	"contact" varchar(32),
	"city" varchar(120),
	"address" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_profiles" (
	"id" varchar(8) PRIMARY KEY NOT NULL,
	"user_id" varchar(64),
	"name" text,
	"document" varchar(32),
	"phone" varchar(32),
	"address" text,
	"city" varchar(120),
	"state" varchar(2),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_approvals" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"order_id" varchar(64),
	"name" text,
	"signaturePath" text,
	"acceptedAt" timestamp DEFAULT now() NOT NULL,
	"status" varchar(32) DEFAULT 'Pendente'
);
--> statement-breakpoint
CREATE TABLE "employee_profiles" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(64),
	"company_id" varchar(64),
	"role" varchar(120),
	"registration" varchar(64),
	"phone" varchar(32),
	"active" varchar(8) DEFAULT 'true',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(64),
	"order_id" varchar(64),
	"type" varchar(64),
	"payload" text,
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offline_packages" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"employee_id" varchar(64),
	"order_ids" text,
	"route_data" text,
	"checksum" varchar(128),
	"expiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_arrivals" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"order_id" varchar(64),
	"latitude" varchar(64),
	"longitude" varchar(64),
	"registeredAt" timestamp DEFAULT now() NOT NULL,
	"confirmed_by_client" varchar(64),
	"confirmedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "service_evidences" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"order_id" varchar(64),
	"uri" text NOT NULL,
	"type" varchar(32) DEFAULT 'image',
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_orders" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"company_id" varchar(64),
	"client_id" varchar(64),
	"employee_id" varchar(64),
	"status" varchar(32) DEFAULT 'Pendente' NOT NULL,
	"priority" varchar(16) DEFAULT 'Média' NOT NULL,
	"title" text,
	"description" text,
	"address" text,
	"notes" text,
	"date" varchar(64),
	"time" varchar(64),
	"value" varchar(64) DEFAULT '0',
	"latitude" varchar(64),
	"longitude" varchar(64),
	"offline_download_token" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_company_id_company_profiles_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_profiles" ADD CONSTRAINT "company_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_approvals" ADD CONSTRAINT "customer_approvals_order_id_service_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_company_id_company_profiles_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_order_id_service_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offline_packages" ADD CONSTRAINT "offline_packages_employee_id_employee_profiles_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_arrivals" ADD CONSTRAINT "service_arrivals_order_id_service_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_evidences" ADD CONSTRAINT "service_evidences_order_id_service_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_company_id_company_profiles_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_client_id_client_profiles_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_employee_id_employee_profiles_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee_profiles"("id") ON DELETE set null ON UPDATE no action;