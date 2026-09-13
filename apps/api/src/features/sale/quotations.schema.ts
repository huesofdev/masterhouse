import { mysqlTable, mysqlEnum, timestamp, decimal, int, varchar, text } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";
import { branchesTable } from "../branches/branches.schema";
import { customersTable } from "../customers/customers.schema";
import { usersTable } from "../user/user.schema";
import { productsTable } from "../products/products.schema";
import { relations } from "drizzle-orm";

export const quotationsTable = mysqlTable("quotations", {
  id: uuidv7Type("id").primaryKey(),
  reference_number: varchar("reference_number", { length: 50 }).unique(),
  branch_id: uuidv7Type("branch_id").notNull(),
  customer_id: uuidv7Type("customer_id"), // Nullable for walk-ins
  created_by: uuidv7Type("created_by").notNull(),
  subtotal: decimal("subtotal", { precision: 14, scale: 2 }).notNull(),
  manual_discount: decimal("manual_discount", { precision: 14, scale: 2 }).default("0.00").notNull(),
  tax_amount: decimal("tax_amount", { precision: 14, scale: 2 }).default("0.00").notNull(),
  tax_details: text("tax_details"), // JSON array of taxes applied
  total: decimal("total", { precision: 14, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["DRAFT", "ACCEPTED", "EXPIRED", "CONVERTED"]).default("DRAFT").notNull(),
  valid_until: timestamp("valid_until"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const quotationItemsTable = mysqlTable("quotation_items", {
  id: uuidv7Type("id").primaryKey(),
  quotation_id: uuidv7Type("quotation_id").notNull(),
  product_id: uuidv7Type("product_id").notNull(),
  quantity: int("quantity").notNull(),
  unit_price: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  discount_amount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  discount_type: varchar("discount_type", { length: 20, enum: ['PERCENTAGE', 'FLAT_LINE', 'FLAT_UNIT'] }),
  line_total: decimal("line_total", { precision: 14, scale: 2 }).notNull(),
});

export const quotationsRelations = relations(quotationsTable, ({ one, many }) => ({
  branch: one(branchesTable, { fields: [quotationsTable.branch_id], references: [branchesTable.id] }),
  customer: one(customersTable, { fields: [quotationsTable.customer_id], references: [customersTable.id] }),
  creator: one(usersTable, { fields: [quotationsTable.created_by], references: [usersTable.id] }),
  items: many(quotationItemsTable),
}));

export const quotationItemsRelations = relations(quotationItemsTable, ({ one }) => ({
  quotation: one(quotationsTable, { fields: [quotationItemsTable.quotation_id], references: [quotationsTable.id] }),
  product: one(productsTable, { fields: [quotationItemsTable.product_id], references: [productsTable.id] }),
}));
