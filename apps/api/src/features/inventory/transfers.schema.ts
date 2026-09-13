import { mysqlTable, varchar, timestamp, int, text } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";
import { relations } from "drizzle-orm";
import { warehousesTable } from "../warehouses/warehouses.schema";
import { usersTable } from "../user/user.schema";
import { productsTable } from "../products/products.schema";
import { serialItemsTable } from "./inventory.schema";

export const stockTransfersTable = mysqlTable("stock_transfers", {
  id: uuidv7Type("id").primaryKey(),
  reference_number: varchar("reference_number", { length: 50 }).notNull().unique(),
  source_warehouse_id: uuidv7Type("source_warehouse_id").notNull(),
  destination_warehouse_id: uuidv7Type("destination_warehouse_id").notNull(),
  transferred_at: timestamp("transferred_at").defaultNow().notNull(),
  transferred_by: uuidv7Type("transferred_by").notNull(),
  notes: text("notes"),
});

export const stockTransferItemsTable = mysqlTable("stock_transfer_items", {
  id: uuidv7Type("id").primaryKey(),
  transfer_id: uuidv7Type("transfer_id").notNull(),
  product_id: uuidv7Type("product_id").notNull(),
  quantity: int("quantity").notNull(),
});

export const stockTransferSerialsTable = mysqlTable("stock_transfer_serials", {
  id: uuidv7Type("id").primaryKey(),
  transfer_item_id: uuidv7Type("transfer_item_id").notNull(),
  serial_id: uuidv7Type("serial_id").notNull(),
});

export const stockTransfersRelations = relations(stockTransfersTable, ({ one, many }) => ({
  sourceWarehouse: one(warehousesTable, {
    fields: [stockTransfersTable.source_warehouse_id],
    references: [warehousesTable.id],
    relationName: "sourceWarehouseTransfers"
  }),
  destinationWarehouse: one(warehousesTable, {
    fields: [stockTransfersTable.destination_warehouse_id],
    references: [warehousesTable.id],
    relationName: "destinationWarehouseTransfers"
  }),
  transferredBy: one(usersTable, {
    fields: [stockTransfersTable.transferred_by],
    references: [usersTable.id],
    relationName: "transferredByTransfer"
  }),
  items: many(stockTransferItemsTable),
}));

export const stockTransferItemsRelations = relations(stockTransferItemsTable, ({ one, many }) => ({
  transfer: one(stockTransfersTable, {
    fields: [stockTransferItemsTable.transfer_id],
    references: [stockTransfersTable.id],
  }),
  product: one(productsTable, {
    fields: [stockTransferItemsTable.product_id],
    references: [productsTable.id],
  }),
  serials: many(stockTransferSerialsTable),
}));

export const stockTransferSerialsRelations = relations(stockTransferSerialsTable, ({ one }) => ({
  transferItem: one(stockTransferItemsTable, {
    fields: [stockTransferSerialsTable.transfer_item_id],
    references: [stockTransferItemsTable.id],
  }),
  serial: one(serialItemsTable, {
    fields: [stockTransferSerialsTable.serial_id],
    references: [serialItemsTable.id],
  }),
}));
