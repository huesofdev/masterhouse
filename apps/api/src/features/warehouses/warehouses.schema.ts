import { mysqlTable, varchar, boolean, timestamp } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";
import { branchesTable } from "../branches/branches.schema";
import { relations } from "drizzle-orm";

export const warehousesTable = mysqlTable("warehouses", {
  id: uuidv7Type("id").primaryKey(),
  branch_id: uuidv7Type("branch_id").notNull(), // Cannot easily reference directly if relations are complex, but keeping it simple
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  is_default: boolean("is_default").default(false).notNull(),
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const warehousesRelations = relations(warehousesTable, ({ one }) => ({
  branch: one(branchesTable, {
    fields: [warehousesTable.branch_id],
    references: [branchesTable.id],
  }),
}));
