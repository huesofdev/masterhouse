import { mysqlTable, varchar, boolean, timestamp, decimal, int, text, mysqlEnum } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";
import { relations } from "drizzle-orm";
import { categoriesTable, brandsTable } from "../catalog/catalog.schema";

export const productsTable = mysqlTable("products", {
  id: uuidv7Type("id").primaryKey(),
  category_id: uuidv7Type("category_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 100 }).notNull().unique(),
  description: text("description"),
  image_url: varchar("image_url", { length: 1000 }),
  base_price: decimal("base_price", { precision: 12, scale: 2 }).default("0.00").notNull(),
  uom: mysqlEnum("uom", ["pieces", "kg", "g", "l", "ml", "box", "pack"]).default("pieces").notNull(),
  is_serialized: boolean("is_serialized").default(false).notNull(),
  min_downpayment_amount: decimal("min_downpayment_amount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  brand_id: uuidv7Type("brand_id"),
  warranty_type: mysqlEnum("warranty_type", ["WARRANTY", "GUARANTEE", "NONE"]).default("NONE").notNull(),
  warranty_period_years: int("warranty_period_years").default(0).notNull(),
  warranty_period_months: int("warranty_period_months").default(0).notNull(),
  avg_cost: decimal("avg_cost", { precision: 12, scale: 2 }).default("0.00").notNull(),
  last_purchase_price: decimal("last_purchase_price", { precision: 12, scale: 2 }).default("0.00").notNull(),
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const productsRelations = relations(productsTable, ({ one }) => ({
  category: one(categoriesTable, {
    fields: [productsTable.category_id],
    references: [categoriesTable.id],
  }),
  brand: one(brandsTable, {
    fields: [productsTable.brand_id],
    references: [brandsTable.id],
  }),
}));
