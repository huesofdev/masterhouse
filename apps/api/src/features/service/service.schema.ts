import { mysqlTable, mysqlEnum, timestamp, text, datetime, varchar } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";
import { salesTable, saleItemsTable } from "../sale/sales.schema";
import { serialItemsTable } from "../inventory/inventory.schema";
import { customersTable } from "../customers/customers.schema";
import { usersTable } from "../user/user.schema";
import { relations } from "drizzle-orm";

export const returnsTable = mysqlTable("returns", {
  id: uuidv7Type("id").primaryKey(),
  sale_id: uuidv7Type("sale_id").notNull(),
  sale_item_id: uuidv7Type("sale_item_id").notNull(),
  serial_item_id: uuidv7Type("serial_item_id"),
  type: mysqlEnum("type", ["CUSTOMER_RETURN", "DEFECTIVE", "WARRANTY"]).notNull(),
  // Where does the returned item physically go?
  disposition: mysqlEnum("disposition", ["RESTOCKED", "DEFECTIVE_DEPOT", "SUPPLIER_RETURNED", "WRITTEN_OFF"]).notNull(),
  reason: text("reason").notNull(),
  refund_amount: varchar("refund_amount", { length: 20 }).default("0.00").notNull(),
  refund_mode: mysqlEnum("refund_mode", ["CASH", "STORE_CREDIT", "NONE"]).default("NONE").notNull(),
  processed_by: uuidv7Type("processed_by").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const warrantyClaimsTable = mysqlTable("warranty_claims", {
  id: uuidv7Type("id").primaryKey(),
  sale_item_id: uuidv7Type("sale_item_id").notNull(),
  customer_id: uuidv7Type("customer_id").notNull(),
  serial_item_id: uuidv7Type("serial_item_id"),
  issue_description: text("issue_description").notNull(),
  // Lifecycle
  status: mysqlEnum("status", ["OPEN", "ITEM_COLLECTED", "SENT_TO_SUPPLIER", "IN_REPAIR", "REPAIRED", "REPLACED", "REJECTED", "CLOSED"]).default("OPEN").notNull(),
  // Resolution
  resolution: mysqlEnum("resolution", ["REPAIRED", "REPLACED", "REJECTED"]),
  replacement_serial_id: uuidv7Type("replacement_serial_id"),  // If replaced with a new unit
  // Staff tracking
  processed_by: uuidv7Type("processed_by").notNull(),
  // Timestamps for timeline
  collected_at: datetime("collected_at"),       // When item was taken from customer
  sent_to_supplier_at: datetime("sent_to_supplier_at"),
  received_from_supplier_at: datetime("received_from_supplier_at"),
  resolved_at: datetime("resolved_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const returnsRelations = relations(returnsTable, ({ one }) => ({
  sale: one(salesTable, { fields: [returnsTable.sale_id], references: [salesTable.id] }),
  saleItem: one(saleItemsTable, { fields: [returnsTable.sale_item_id], references: [saleItemsTable.id] }),
  serialItem: one(serialItemsTable, { fields: [returnsTable.serial_item_id], references: [serialItemsTable.id] }),
  processedBy: one(usersTable, { fields: [returnsTable.processed_by], references: [usersTable.id] }),
}));

export const warrantyClaimsRelations = relations(warrantyClaimsTable, ({ one }) => ({
  saleItem: one(saleItemsTable, { fields: [warrantyClaimsTable.sale_item_id], references: [saleItemsTable.id] }),
  customer: one(customersTable, { fields: [warrantyClaimsTable.customer_id], references: [customersTable.id] }),
  serialItem: one(serialItemsTable, { fields: [warrantyClaimsTable.serial_item_id], references: [serialItemsTable.id] }),
  processedBy: one(usersTable, { fields: [warrantyClaimsTable.processed_by], references: [usersTable.id] }),
  replacementSerial: one(serialItemsTable, { fields: [warrantyClaimsTable.replacement_serial_id], references: [serialItemsTable.id] }),
}));
