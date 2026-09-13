import { mysqlTable, mysqlEnum, timestamp, decimal, int, varchar, text } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";
import { branchesTable } from "../branches/branches.schema";
import { customersTable } from "../customers/customers.schema";
import { tripsTable } from "../operations/operations.schema";
import { usersTable } from "../user/user.schema";
import { productsTable } from "../products/products.schema";
import { serialItemsTable } from "../inventory/inventory.schema";
import { promotionsTable } from "../promotions/promotions.schema";
import { relations } from "drizzle-orm";

export const salesTable = mysqlTable("sales", {
  id: uuidv7Type("id").primaryKey(),
  reference_number: varchar("reference_number", { length: 50 }).unique(),
  offline_receipt_number: varchar("offline_receipt_number", { length: 50 }),
  branch_id: uuidv7Type("branch_id").notNull(),
  customer_id: uuidv7Type("customer_id"), // Nullable for direct POS walk-ins
  trip_id: uuidv7Type("trip_id"),
  pre_order_id: uuidv7Type("pre_order_id"), // Link to pre-order if fulfilled
  created_by: uuidv7Type("created_by").notNull(),
  sale_type: mysqlEnum("sale_type", ["DIRECT", "INSTALLMENT"]).notNull(),
  payment_mode: mysqlEnum("payment_mode", ["CASH", "CARD", "TRANSFER"]).default("CASH").notNull(),
  subtotal: decimal("subtotal", { precision: 14, scale: 2 }).notNull(),
  promotion_id: uuidv7Type("promotion_id"),
  promotion_discount: decimal("promotion_discount", { precision: 14, scale: 2 }).default("0.00").notNull(),
  manual_discount: decimal("manual_discount", { precision: 14, scale: 2 }).default("0.00").notNull(),
  downpayment: decimal("downpayment", { precision: 14, scale: 2 }).default("0.00").notNull(),
  tax_amount: decimal("tax_amount", { precision: 14, scale: 2 }).default("0.00").notNull(),
  tax_details: text("tax_details"), // JSON array of taxes applied
  total: decimal("total", { precision: 14, scale: 2 }).notNull(),
  gps_lat: decimal("gps_lat", { precision: 10, scale: 8 }),
  gps_lng: decimal("gps_lng", { precision: 11, scale: 8 }),
  status: mysqlEnum("status", ["PENDING", "COMPLETED", "CANCELLED", "RETURNED"]).default("COMPLETED").notNull(),
  idempotency_key: varchar("idempotency_key", { length: 255 }).unique(),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const saleItemsTable = mysqlTable("sale_items", {
  id: uuidv7Type("id").primaryKey(),
  sale_id: uuidv7Type("sale_id").notNull(),
  product_id: uuidv7Type("product_id").notNull(),
  serial_item_id: uuidv7Type("serial_item_id"),
  quantity: int("quantity").notNull(),
  unit_cost: decimal("unit_cost", { precision: 12, scale: 2 }).default("0.00").notNull(),
  unit_price: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  discount_amount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  discount_type: varchar("discount_type", { length: 20, enum: ['PERCENTAGE', 'FLAT_LINE', 'FLAT_UNIT'] }),
  line_total: decimal("line_total", { precision: 14, scale: 2 }).notNull(),
});

export const salesRelations = relations(salesTable, ({ one, many }) => ({
  branch: one(branchesTable, { fields: [salesTable.branch_id], references: [branchesTable.id] }),
  customer: one(customersTable, { fields: [salesTable.customer_id], references: [customersTable.id] }),
  trip: one(tripsTable, { fields: [salesTable.trip_id], references: [tripsTable.id] }),
  creator: one(usersTable, { fields: [salesTable.created_by], references: [usersTable.id] }),
  promotion: one(promotionsTable, { fields: [salesTable.promotion_id], references: [promotionsTable.id] }),
  items: many(saleItemsTable),
}));

export const saleItemsRelations = relations(saleItemsTable, ({ one }) => ({
  sale: one(salesTable, { fields: [saleItemsTable.sale_id], references: [salesTable.id] }),
  product: one(productsTable, { fields: [saleItemsTable.product_id], references: [productsTable.id] }),
  serialItem: one(serialItemsTable, { fields: [saleItemsTable.serial_item_id], references: [serialItemsTable.id] }),
}));
