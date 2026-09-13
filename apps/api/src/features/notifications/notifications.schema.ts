import { mysqlTable, varchar, mysqlEnum, timestamp, text, boolean } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";

export const smsTemplatesTable = mysqlTable("sms_templates", {
  id: uuidv7Type("id").primaryKey(),
  trigger_event: mysqlEnum("trigger_event", ["SALE_CREATED", "COLLECTION_RECEIPT", "PAYMENT_OVERDUE", "DIRECT_SALE_CREATED", "PAYMENT_REMINDER"]).unique().notNull(),
  body_template: text("body_template").notNull(), // e.g., "Hi {{name}}, received {{amount}}. Balance: {{balance}}"
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const smsLogsTable = mysqlTable("sms_logs", {
  id: uuidv7Type("id").primaryKey(),
  customer_id: uuidv7Type("customer_id").notNull(),
  trigger_event: mysqlEnum("trigger_event", ["SALE_CREATED", "COLLECTION_RECEIPT", "PAYMENT_OVERDUE", "CUSTOM", "DIRECT_SALE_CREATED", "PAYMENT_REMINDER"]).notNull(),
  reference_id: uuidv7Type("reference_id"), // Can be sale_id or receipt_id
  phone_number: varchar("phone_number", { length: 50 }).notNull(),
  message_body: text("message_body").notNull(),
  status: mysqlEnum("status", ["PENDING", "SENT", "FAILED"]).default("PENDING").notNull(),
  provider_response: text("provider_response"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  sent_at: timestamp("sent_at"),
});
