import { mysqlTable, varchar, mysqlEnum, timestamp, decimal, datetime, int } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";
import { branchesTable } from "../branches/branches.schema";
import { warehousesTable } from "../warehouses/warehouses.schema";
import { usersTable } from "../user/user.schema";
import { productsTable } from "../products/products.schema";
import { suppliersTable } from "../suppliers/suppliers.schema";
import { serialItemsTable } from "./inventory.schema";
import { relations } from "drizzle-orm";

export const intakeOrdersTable = mysqlTable("intake_orders", {
  id: uuidv7Type("id").primaryKey(),
  branch_id: uuidv7Type("branch_id").notNull(),
  warehouse_id: uuidv7Type("warehouse_id").notNull(),
  supplier_id: uuidv7Type("supplier_id"),              // optional FK to suppliers
  supplier_name: varchar("supplier_name", { length: 255 }).notNull(),  // cached for display
  invoice_number: varchar("invoice_number", { length: 100 }),
  status: mysqlEnum("status", ["RECEIVED", "VOID"]).default("RECEIVED").notNull(),
  received_at: datetime("received_at").notNull(),
  created_by: uuidv7Type("created_by").notNull(),
  total_cost: decimal("total_cost", { precision: 14, scale: 2 }).default("0.00").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const intakeItemsTable = mysqlTable("intake_items", {
  id: uuidv7Type("id").primaryKey(),
  intake_order_id: uuidv7Type("intake_order_id").notNull(),
  warehouse_id: uuidv7Type("warehouse_id").notNull(),
  product_id: uuidv7Type("product_id").notNull(),
  quantity: int("quantity").notNull(),
  unit_cost: decimal("unit_cost", { precision: 12, scale: 2 }).notNull(),
  total_cost: decimal("total_cost", { precision: 14, scale: 2 }).notNull(),
});

export const intakeOrdersRelations = relations(intakeOrdersTable, ({ one, many }) => ({
  branch: one(branchesTable, { fields: [intakeOrdersTable.branch_id], references: [branchesTable.id] }),
  warehouse: one(warehousesTable, { fields: [intakeOrdersTable.warehouse_id], references: [warehousesTable.id] }),
  creator: one(usersTable, { fields: [intakeOrdersTable.created_by], references: [usersTable.id] }),
  supplier: one(suppliersTable, { fields: [intakeOrdersTable.supplier_id], references: [suppliersTable.id] }),
  items: many(intakeItemsTable),
}));

export const intakeItemsRelations = relations(intakeItemsTable, ({ one, many }) => ({
  order: one(intakeOrdersTable, { fields: [intakeItemsTable.intake_order_id], references: [intakeOrdersTable.id] }),
  warehouse: one(warehousesTable, { fields: [intakeItemsTable.warehouse_id], references: [warehousesTable.id] }),
  product: one(productsTable, { fields: [intakeItemsTable.product_id], references: [productsTable.id] }),
  serials: many(serialItemsTable),
}));
