import { mysqlTable, varchar, mysqlEnum, timestamp, decimal, date, int, boolean } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";
import { customersTable, guarantorsTable } from "../customers/customers.schema";
import { salesTable } from "../sale/sales.schema";
import { tripsTable } from "../operations/operations.schema";
import { usersTable } from "../user/user.schema";
import { branchesTable } from "../branches/branches.schema";
import { relations } from "drizzle-orm";

export const installmentSchemesTable = mysqlTable("installment_schemes", {
  id: uuidv7Type("id").primaryKey(),
  branch_id: uuidv7Type("branch_id"), // Nullable for global schemes
  name: varchar("name", { length: 255 }).notNull(),
  terms: int("terms").notNull(),
  frequency: mysqlEnum("frequency", ["DAILY", "WEEKLY", "MONTHLY"]).notNull(),
  interest_rate: decimal("interest_rate", { precision: 5, scale: 2 }).notNull(),
  min_downpayment_percent: decimal("min_downpayment_percent", { precision: 5, scale: 2 }).notNull(),
  late_fee_percentage: decimal("late_fee_percentage", { precision: 5, scale: 2 }).notNull(),
  grace_period_days: int("grace_period_days").notNull().default(5),
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const installmentContractsTable = mysqlTable("installment_contracts", {
  id: uuidv7Type("id").primaryKey(),
  sale_id: uuidv7Type("sale_id").notNull(),
  customer_id: uuidv7Type("customer_id").notNull(),
  scheme_id: uuidv7Type("scheme_id").notNull(),
  guarantor_id: uuidv7Type("guarantor_id").notNull(),
  principal: decimal("principal", { precision: 14, scale: 2 }).notNull(),
  interest_rate: decimal("interest_rate", { precision: 5, scale: 2 }).notNull(),
  interest_amount: decimal("interest_amount", { precision: 14, scale: 2 }).notNull(),
  total_payable: decimal("total_payable", { precision: 14, scale: 2 }).notNull(),
  downpayment: decimal("downpayment", { precision: 14, scale: 2 }).notNull(),
  balance: decimal("balance", { precision: 14, scale: 2 }).notNull(),
  schedule_frequency: mysqlEnum("schedule_frequency", ["WEEKLY", "MONTHLY"]).notNull(),
  status: mysqlEnum("status", ["ACTIVE", "PAID_OFF", "DEFAULTED", "CANCELLED", "SUSPENDED"]).default("ACTIVE").notNull(),
  signature_image_url: varchar("signature_image_url", { length: 500 }),
  guarantor_signature_image_url: varchar("guarantor_signature_image_url", { length: 500 }),
  suspended_at: timestamp("suspended_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const installmentSchedulesTable = mysqlTable("installment_schedules", {
  id: uuidv7Type("id").primaryKey(),
  contract_id: uuidv7Type("contract_id").notNull(),
  installment_number: int("installment_number").notNull(),
  due_date: date("due_date").notNull(),
  amount_due: decimal("amount_due", { precision: 12, scale: 2 }).notNull(),
  amount_paid: decimal("amount_paid", { precision: 12, scale: 2 }).default("0.00").notNull(),
  late_fee: decimal("late_fee", { precision: 12, scale: 2 }).default("0.00").notNull(),
  status: mysqlEnum("status", ["PENDING", "PARTIALLY_PAID", "PAID", "OVERDUE", "WAIVED"]).default("PENDING").notNull(),
});

export const collectionReceiptsTable = mysqlTable("collection_receipts", {
  id: uuidv7Type("id").primaryKey(),
  receipt_no: varchar("receipt_no", { length: 100 }).notNull().unique(),
  offline_receipt_number: varchar("offline_receipt_number", { length: 50 }),
  contract_id: uuidv7Type("contract_id").notNull(),
  customer_id: uuidv7Type("customer_id").notNull(),
  trip_id: uuidv7Type("trip_id"),
  collected_by: uuidv7Type("collected_by").notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  balance_after_receipt: decimal("balance_after_receipt", { precision: 14, scale: 2 }),
  payment_mode: mysqlEnum("payment_mode", ["CASH", "CARD", "TRANSFER"]).default("CASH").notNull(),
  sms_status: mysqlEnum("sms_status", ["PENDING", "SENT", "FAILED", "SKIPPED"]).default("PENDING").notNull(),
  idempotency_key: varchar("idempotency_key", { length: 255 }).unique(),
  gps_lat: decimal("gps_lat", { precision: 10, scale: 7 }),
  gps_lng: decimal("gps_lng", { precision: 10, scale: 7 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const collectionAttemptsTable = mysqlTable("collection_attempts", {
  id: uuidv7Type("id").primaryKey(),
  trip_id: uuidv7Type("trip_id").notNull(),
  contract_id: uuidv7Type("contract_id").notNull(),
  customer_id: uuidv7Type("customer_id").notNull(),
  status: mysqlEnum("status", ["COLLECTED", "MISSED", "CUSTOMER_UNAVAILABLE", "PROMISE_TO_PAY"]).notNull(),
  remarks: varchar("remarks", { length: 255 }),
  gps_lat: decimal("gps_lat", { precision: 10, scale: 7 }),
  gps_lng: decimal("gps_lng", { precision: 10, scale: 7 }),
  attempted_by: uuidv7Type("attempted_by").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const contractAdjustmentsTable = mysqlTable("contract_adjustments", {
  id: uuidv7Type("id").primaryKey(),
  contract_id: uuidv7Type("contract_id").notNull(),
  type: mysqlEnum("type", ["DISCOUNT", "WRITE_OFF", "PENALTY", "REBATE"]).notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  created_by: uuidv7Type("created_by").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const refundsTable = mysqlTable("refunds", {
  id: uuidv7Type("id").primaryKey(),
  contract_id: uuidv7Type("contract_id").notNull(),
  customer_id: uuidv7Type("customer_id").notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  approved_by: uuidv7Type("approved_by").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const installmentSchemesRelations = relations(installmentSchemesTable, ({ one, many }) => ({
  branch: one(branchesTable, { fields: [installmentSchemesTable.branch_id], references: [branchesTable.id] }),
  contracts: many(installmentContractsTable),
}));

export const installmentContractsRelations = relations(installmentContractsTable, ({ one, many }) => ({
  scheme: one(installmentSchemesTable, { fields: [installmentContractsTable.scheme_id], references: [installmentSchemesTable.id] }),
  sale: one(salesTable, { fields: [installmentContractsTable.sale_id], references: [salesTable.id] }),
  customer: one(customersTable, { fields: [installmentContractsTable.customer_id], references: [customersTable.id] }),
  guarantor: one(guarantorsTable, { fields: [installmentContractsTable.guarantor_id], references: [guarantorsTable.id] }),
  schedules: many(installmentSchedulesTable),
  receipts: many(collectionReceiptsTable),
  attempts: many(collectionAttemptsTable),
}));

export const installmentSchedulesRelations = relations(installmentSchedulesTable, ({ one }) => ({
  contract: one(installmentContractsTable, { fields: [installmentSchedulesTable.contract_id], references: [installmentContractsTable.id] }),
}));

export const collectionReceiptsRelations = relations(collectionReceiptsTable, ({ one }) => ({
  contract: one(installmentContractsTable, { fields: [collectionReceiptsTable.contract_id], references: [installmentContractsTable.id] }),
  customer: one(customersTable, { fields: [collectionReceiptsTable.customer_id], references: [customersTable.id] }),
  trip: one(tripsTable, { fields: [collectionReceiptsTable.trip_id], references: [tripsTable.id] }),
  collector: one(usersTable, { fields: [collectionReceiptsTable.collected_by], references: [usersTable.id] }),
}));
export const collectionAttemptsRelations = relations(collectionAttemptsTable, ({ one }) => ({
  contract: one(installmentContractsTable, { fields: [collectionAttemptsTable.contract_id], references: [installmentContractsTable.id] }),
  customer: one(customersTable, { fields: [collectionAttemptsTable.customer_id], references: [customersTable.id] }),
  trip: one(tripsTable, { fields: [collectionAttemptsTable.trip_id], references: [tripsTable.id] }),
  attempter: one(usersTable, { fields: [collectionAttemptsTable.attempted_by], references: [usersTable.id] }),
}));
