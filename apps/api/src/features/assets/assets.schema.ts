import { mysqlTable, varchar, decimal, timestamp, text, boolean, mysqlEnum, date } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";
import { branchesTable } from "../branches/branches.schema";
import { usersTable } from "../user/user.schema";
import { warehousesTable } from "../warehouses/warehouses.schema";
import { relations } from "drizzle-orm";

export const fixedAssetCategoriesTable = mysqlTable("fixed_asset_categories", {
  id: uuidv7Type("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const fixedAssetsTable = mysqlTable("fixed_assets", {
  id: uuidv7Type("id").primaryKey(),
  asset_code: varchar("asset_code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  category_id: uuidv7Type("category_id").notNull().references(() => fixedAssetCategoriesTable.id),
  
  // Location / Assignment
  branch_id: uuidv7Type("branch_id").notNull().references(() => branchesTable.id),
  warehouse_id: uuidv7Type("warehouse_id").references(() => warehousesTable.id),
  assigned_to: uuidv7Type("assigned_to").references(() => usersTable.id), // Custodian
  
  // Status
  status: mysqlEnum("status", ["ACTIVE", "IN_REPAIR", "DISPOSED", "LOST"]).default("ACTIVE").notNull(),
  
  // Financial & Tracking
  purchase_date: date("purchase_date"),
  purchase_price: decimal("purchase_price", { precision: 14, scale: 2 }),
  supplier: varchar("supplier", { length: 255 }),
  warranty_expiry: date("warranty_expiry"),
  notes: text("notes"),
  
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const fixedAssetCategoriesRelations = relations(fixedAssetCategoriesTable, ({ many }) => ({
  assets: many(fixedAssetsTable),
}));

export const fixedAssetsRelations = relations(fixedAssetsTable, ({ one }) => ({
  category: one(fixedAssetCategoriesTable, { fields: [fixedAssetsTable.category_id], references: [fixedAssetCategoriesTable.id] }),
  branch: one(branchesTable, { fields: [fixedAssetsTable.branch_id], references: [branchesTable.id] }),
  warehouse: one(warehousesTable, { fields: [fixedAssetsTable.warehouse_id], references: [warehousesTable.id] }),
  custodian: one(usersTable, { fields: [fixedAssetsTable.assigned_to], references: [usersTable.id] }),
}));
