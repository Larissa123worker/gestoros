import { numeric, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["user", "admin", "company", "employee", "client"]);

export const users = pgTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const companyProfiles = pgTable("company_profiles", {
  id: varchar("id", { length: 8 }).primaryKey(),
  userId: varchar("user_id", { length: 64 }).references(() => users.id, { onDelete: "cascade" }),
  name: text("name"),
  document: varchar("document", { length: 32 }),
  phone: varchar("phone", { length: 32 }),
  postalCode: varchar("postal_code", { length: 8 }),
  address: text("address"),
  addressNumber: varchar("address_number", { length: 16 }),
  addressComplement: varchar("address_complement", { length: 120 }),
  city: varchar("city", { length: 120 }),
  state: varchar("state", { length: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const companySubscriptions = pgTable("company_subscriptions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  companyId: varchar("company_id", { length: 64 }).references(() => companyProfiles.id, { onDelete: "cascade" }).notNull(),
  planId: varchar("plan_id", { length: 64 }).references(() => billingPlans.id),
  asaasCustomerId: varchar("asaas_customer_id", { length: 64 }),
  asaasSubscriptionId: varchar("asaas_subscription_id", { length: 64 }),
  billingType: varchar("billing_type", { length: 32 }),
  cycle: varchar("cycle", { length: 32 }),
  plan: varchar("plan", { length: 64 }).default("Profissional").notNull(),
  status: varchar("status", { length: 32 }).default("trialing").notNull(),
  trialStartedAt: timestamp("trial_started_at"),
  trialEndsAt: timestamp("trial_ends_at"),
  nextBillingAt: timestamp("next_billing_at"),
  amount: numeric("amount", { precision: 12, scale: 2 }).default("179"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const billingPlans = pgTable("billing_plans", {
  id: varchar("id", { length: 64 }).primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  monthlyAmount: numeric("monthly_amount", { precision: 12, scale: 2 }).notNull(),
  annualAmount: numeric("annual_amount", { precision: 12, scale: 2 }).notNull(),
  maxEmployees: varchar("max_employees", { length: 32 }),
  active: varchar("active", { length: 8 }).default("true").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const subscriptionPayments = pgTable("subscription_payments", {
  id: varchar("id", { length: 64 }).primaryKey(),
  subscriptionId: varchar("subscription_id", { length: 64 }).references(() => companySubscriptions.id, { onDelete: "cascade" }).notNull(),
  asaasPaymentId: varchar("asaas_payment_id", { length: 64 }).unique(),
  billingType: varchar("billing_type", { length: 32 }),
  description: text("description"),
  amount: varchar("amount", { length: 32 }).notNull(),
  status: varchar("status", { length: 32 }).default("pending").notNull(),
  dueAt: timestamp("due_at"),
  paidAt: timestamp("paid_at"),
  externalId: varchar("external_id", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const asaasWebhookEvents = pgTable("asaas_webhook_events", {
  id: varchar("id", { length: 160 }).primaryKey(),
  event: varchar("event", { length: 100 }).notNull(),
  payload: text("payload").notNull(),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const employeeProfiles = pgTable("employee_profiles", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 64 }).references(() => users.id, { onDelete: "set null" }),
  companyId: varchar("company_id", { length: 64 }).references(() => companyProfiles.id, { onDelete: "cascade" }),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: text("password_hash"),
  role: varchar("role", { length: 120 }),
  registration: varchar("registration", { length: 64 }),
  phone: varchar("phone", { length: 32 }),
  active: varchar("active", { length: 8 }).default("true"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const clientProfiles = pgTable("client_profiles", {
  id: varchar("id", { length: 64 }).primaryKey(),
  companyId: varchar("company_id", { length: 64 }).references(() => companyProfiles.id, { onDelete: "cascade" }),
  name: text("name"),
  document: varchar("document", { length: 32 }),
  contact: varchar("contact", { length: 32 }),
  city: varchar("city", { length: 120 }),
  street: text("street"),
  number: varchar("number", { length: 32 }),
  neighborhood: text("neighborhood"),
  state: varchar("state", { length: 120 }),
  address: text("address"),
  observation: text("observation"),
  referencePoint: text("reference_point"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const serviceOrders = pgTable("service_orders", {
  id: varchar("id", { length: 64 }).primaryKey(),
  companyId: varchar("company_id", { length: 64 }).references(() => companyProfiles.id, { onDelete: "cascade" }),
  clientId: varchar("client_id", { length: 64 }).references(() => clientProfiles.id, { onDelete: "set null" }),
  employeeId: varchar("employee_id", { length: 64 }).references(() => employeeProfiles.id, { onDelete: "set null" }),
  status: varchar("status", { length: 32 }).default("Pendente").notNull(),
  priority: varchar("priority", { length: 16 }).default("Média").notNull(),
  title: text("title"),
  description: text("description"),
  address: text("address"),
  notes: text("notes"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  date: varchar("date", { length: 64 }),
  time: varchar("time", { length: 64 }),
  value: varchar("value", { length: 64 }).default("0"),
  latitude: varchar("latitude", { length: 64 }),
  longitude: varchar("longitude", { length: 64 }),
  offlineDownloadToken: varchar("offline_download_token", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const serviceEvidences = pgTable("service_evidences", {
  id: varchar("id", { length: 64 }).primaryKey(),
  orderId: varchar("order_id", { length: 64 }).references(() => serviceOrders.id, { onDelete: "cascade" }),
  uri: text("uri").notNull(),
  type: varchar("type", { length: 32 }).default("image"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const serviceArrivals = pgTable("service_arrivals", {
  id: varchar("id", { length: 64 }).primaryKey(),
  orderId: varchar("order_id", { length: 64 }).references(() => serviceOrders.id, { onDelete: "cascade" }),
  latitude: varchar("latitude", { length: 64 }),
  longitude: varchar("longitude", { length: 64 }),
  registeredAt: timestamp("registeredAt").defaultNow().notNull(),
  confirmedByClient: varchar("confirmed_by_client", { length: 64 }),
  confirmedAt: timestamp("confirmedAt"),
});

export const customerApprovals = pgTable("customer_approvals", {
  id: varchar("id", { length: 64 }).primaryKey(),
  orderId: varchar("order_id", { length: 64 }).references(() => serviceOrders.id, { onDelete: "cascade" }),
  name: text("name"),
  signaturePath: text("signaturePath"),
  acceptedAt: timestamp("acceptedAt").defaultNow().notNull(),
  status: varchar("status", { length: 32 }).default("Pendente"),
});

export const offlinePackages = pgTable("offline_packages", {
  id: varchar("id", { length: 64 }).primaryKey(),
  employeeId: varchar("employee_id", { length: 64 }).references(() => employeeProfiles.id, { onDelete: "cascade" }),
  orderIds: text("order_ids"),
  routeData: text("route_data"),
  checksum: varchar("checksum", { length: 128 }),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 64 }).references(() => users.id, { onDelete: "cascade" }),
  orderId: varchar("order_id", { length: 64 }).references(() => serviceOrders.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 64 }),
  payload: text("payload"),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const serviceCatalog = pgTable("service_catalog", {
  id: varchar("id", { length: 64 }).primaryKey(),
  companyId: varchar("company_id", { length: 64 }).references(() => companyProfiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  suggestedValue: varchar("suggested_value", { length: 64 }).default("0"),
  estimatedDuration: varchar("estimated_duration", { length: 64 }),
  active: varchar("active", { length: 8 }).default("true").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one }) => ({
  company: one(companyProfiles, { fields: [users.id], references: [companyProfiles.userId] }),
  employee: one(employeeProfiles, { fields: [users.id], references: [employeeProfiles.userId] }),
}));

export const companyProfilesRelations = relations(companyProfiles, ({ many }) => ({
  employees: many(employeeProfiles),
  clients: many(clientProfiles),
  orders: many(serviceOrders),
  subscriptions: many(companySubscriptions),
}));

export const billingPlansRelations = relations(billingPlans, ({ many }) => ({
  subscriptions: many(companySubscriptions),
}));

export const companySubscriptionsRelations = relations(companySubscriptions, ({ one, many }) => ({
  company: one(companyProfiles, { fields: [companySubscriptions.companyId], references: [companyProfiles.id] }),
  plan: one(billingPlans, { fields: [companySubscriptions.planId], references: [billingPlans.id] }),
  payments: many(subscriptionPayments),
}));

export const subscriptionPaymentsRelations = relations(subscriptionPayments, ({ one }) => ({
  subscription: one(companySubscriptions, { fields: [subscriptionPayments.subscriptionId], references: [companySubscriptions.id] }),
}));

export const employeeProfilesRelations = relations(employeeProfiles, ({ one, many }) => ({
  company: one(companyProfiles, { fields: [employeeProfiles.companyId], references: [companyProfiles.id] }),
  user: one(users, { fields: [employeeProfiles.userId], references: [users.id] }),
  orders: many(serviceOrders),
}));

export const clientProfilesRelations = relations(clientProfiles, ({ one, many }) => ({
  company: one(companyProfiles, { fields: [clientProfiles.companyId], references: [companyProfiles.id] }),
  orders: many(serviceOrders),
}));

export const serviceOrdersRelations = relations(serviceOrders, ({ one, many }) => ({
  company: one(companyProfiles, { fields: [serviceOrders.companyId], references: [companyProfiles.id] }),
  client: one(clientProfiles, { fields: [serviceOrders.clientId], references: [clientProfiles.id] }),
  employee: one(employeeProfiles, { fields: [serviceOrders.employeeId], references: [employeeProfiles.id] }),
  evidences: many(serviceEvidences),
  arrivals: many(serviceArrivals),
  approvals: many(customerApprovals),
}));

export const serviceEvidencesRelations = relations(serviceEvidences, ({ one }) => ({
  order: one(serviceOrders, { fields: [serviceEvidences.orderId], references: [serviceOrders.id] }),
}));

export const serviceArrivalsRelations = relations(serviceArrivals, ({ one }) => ({
  order: one(serviceOrders, { fields: [serviceArrivals.orderId], references: [serviceOrders.id] }),
}));

export const customerApprovalsRelations = relations(customerApprovals, ({ one }) => ({
  order: one(serviceOrders, { fields: [customerApprovals.orderId], references: [serviceOrders.id] }),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type CompanyProfile = typeof companyProfiles.$inferSelect;
export type InsertCompanyProfile = typeof companyProfiles.$inferInsert;
export type CompanySubscription = typeof companySubscriptions.$inferSelect;
export type InsertCompanySubscription = typeof companySubscriptions.$inferInsert;
export type BillingPlan = typeof billingPlans.$inferSelect;
export type InsertBillingPlan = typeof billingPlans.$inferInsert;
export type SubscriptionPayment = typeof subscriptionPayments.$inferSelect;
export type InsertSubscriptionPayment = typeof subscriptionPayments.$inferInsert;
export type AsaasWebhookEvent = typeof asaasWebhookEvents.$inferSelect;
export type InsertAsaasWebhookEvent = typeof asaasWebhookEvents.$inferInsert;
export type EmployeeProfile = typeof employeeProfiles.$inferSelect;
export type InsertEmployeeProfile = typeof employeeProfiles.$inferInsert;
export type ClientProfile = typeof clientProfiles.$inferSelect;
export type InsertClientProfile = typeof clientProfiles.$inferInsert;
export type ServiceOrder = typeof serviceOrders.$inferSelect;
export type InsertServiceOrder = typeof serviceOrders.$inferInsert;
export type ServiceEvidence = typeof serviceEvidences.$inferSelect;
export type InsertServiceEvidence = typeof serviceEvidences.$inferInsert;
export type ServiceArrival = typeof serviceArrivals.$inferSelect;
export type InsertServiceArrival = typeof serviceArrivals.$inferInsert;
export type CustomerApproval = typeof customerApprovals.$inferSelect;
export type InsertCustomerApproval = typeof customerApprovals.$inferInsert;
export type OfflinePackage = typeof offlinePackages.$inferSelect;
export type InsertOfflinePackage = typeof offlinePackages.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type ServiceCatalogItem = typeof serviceCatalog.$inferSelect;
export type InsertServiceCatalogItem = typeof serviceCatalog.$inferInsert;
