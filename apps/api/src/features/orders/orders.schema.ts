import { mysqlTable, varchar, mysqlEnum, timestamp, int } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";
import { branchesTable } from "../branches/branches.schema";
import { routesTable } from "../routes/routes.schema";
import { customersTable } from "../customers/customers.schema";
import { productsTable } from "../products/products.schema";
import { usersTable } from "../user/user.schema";
import { tripsTable } from "../operations/operations.schema";
import { relations } from "drizzle-orm";

export const preOrdersTable = mysqlTable("pre_orders", {
  id: uuidv7Type("id").primaryKey(),
  reference_number: varchar("reference_number", { length: 50 }).unique(),
  offline_receipt_number: varchar("offline_receipt_number", { length: 50 }),
  branch_id: uuidv7Type("branch_id").notNull(),
  route_id: uuidv7Type("route_id").notNull(),
  trip_id: uuidv7Type("trip_id"),
  customer_id: uuidv7Type("customer_id").notNull(),
  status: mysqlEnum("status", ["PENDING", "FULFILLED", "CANCELLED"]).default("PENDING").notNull(),
  advance_payment: varchar("advance_payment", { length: 20 }).default("0.00").notNull(),
  payment_method: mysqlEnum("payment_method", ["CASH", "CARD", "BANK_TRANSFER"]),
  sale_type_preference: mysqlEnum("sale_type_preference", ["DIRECT", "INSTALLMENT"]),
  receipt_number: varchar("receipt_number", { length: 255 }),
  fulfilled_sale_id: uuidv7Type("fulfilled_sale_id"),
  remarks: varchar("remarks", { length: 500 }),
  created_by: uuidv7Type("created_by").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const preOrderItemsTable = mysqlTable("pre_order_items", {
  id: uuidv7Type("id").primaryKey(),
  pre_order_id: uuidv7Type("pre_order_id").notNull(),
  product_id: uuidv7Type("product_id").notNull(),
  quantity: int("quantity").notNull().default(1),
  discount_input: varchar("discount_input", { length: 50 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const preOrdersRelations = relations(preOrdersTable, ({ one, many }) => ({
  branch: one(branchesTable, { fields: [preOrdersTable.branch_id], references: [branchesTable.id] }),
  route: one(routesTable, { fields: [preOrdersTable.route_id], references: [routesTable.id] }),
  trip: one(tripsTable, { fields: [preOrdersTable.trip_id], references: [tripsTable.id] }),
  customer: one(customersTable, { fields: [preOrdersTable.customer_id], references: [customersTable.id] }),
  creator: one(usersTable, { fields: [preOrdersTable.created_by], references: [usersTable.id] }),
  items: many(preOrderItemsTable),
}));

export const preOrderItemsRelations = relations(preOrderItemsTable, ({ one }) => ({
  preOrder: one(preOrdersTable, { fields: [preOrderItemsTable.pre_order_id], references: [preOrdersTable.id] }),
  product: one(productsTable, { fields: [preOrderItemsTable.product_id], references: [productsTable.id] }),
}));
