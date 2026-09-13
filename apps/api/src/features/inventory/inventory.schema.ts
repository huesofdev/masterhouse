import { mysqlTable, varchar, mysqlEnum, timestamp, decimal, int, primaryKey } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";
import { productsTable } from "../products/products.schema";
import { warehousesTable } from "../warehouses/warehouses.schema";
import { intakeItemsTable } from "./intake.schema";
import { relations } from "drizzle-orm";

export const serialItemsTable = mysqlTable("serial_items", {
  id: uuidv7Type("id").primaryKey(),
  product_id: uuidv7Type("product_id").notNull(),
  intake_item_id: uuidv7Type("intake_item_id"),
  warehouse_id: uuidv7Type("warehouse_id"),
  serial_number: varchar("serial_number", { length: 150 }).notNull().unique(),
  status: mysqlEnum("status", ["IN_STOCK", "ON_TRIP", "SOLD", "RETURNED", "LOST", "DEFECTIVE", "UNDER_WARRANTY"]).default("IN_STOCK").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const inventoryBalancesTable = mysqlTable("inventory_balances", {
  warehouse_id: uuidv7Type("warehouse_id").notNull(),
  product_id: uuidv7Type("product_id").notNull(),
  quantity: int("quantity").default(0).notNull(),
  avg_cost: decimal("avg_cost", { precision: 12, scale: 2 }).default("0.00").notNull(),
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.warehouse_id, table.product_id] }),
}));

export const serialItemsRelations = relations(serialItemsTable, ({ one }) => ({
  product: one(productsTable, { fields: [serialItemsTable.product_id], references: [productsTable.id] }),
  intakeItem: one(intakeItemsTable, { fields: [serialItemsTable.intake_item_id], references: [intakeItemsTable.id] }),
  warehouse: one(warehousesTable, { fields: [serialItemsTable.warehouse_id], references: [warehousesTable.id] }),
}));

export const inventoryBalancesRelations = relations(inventoryBalancesTable, ({ one }) => ({
  warehouse: one(warehousesTable, { fields: [inventoryBalancesTable.warehouse_id], references: [warehousesTable.id] }),
  product: one(productsTable, { fields: [inventoryBalancesTable.product_id], references: [productsTable.id] }),
}));
