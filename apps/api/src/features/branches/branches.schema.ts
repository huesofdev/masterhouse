import { mysqlTable, varchar, boolean, uniqueIndex } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";
import { relations } from "drizzle-orm";

export const branchesTable = mysqlTable("branches", {
  id: uuidv7Type("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
});

export const branchPhonesTable = mysqlTable("branch_phones", {
  id: uuidv7Type("id").primaryKey(),
  branch_id: uuidv7Type("branch_id").notNull(),
  phone_number: varchar("phone_number", { length: 15 }).notNull(),
}, (table) => ({
  unique_branch_phone: uniqueIndex("unique_branch_phone").on(table.branch_id, table.phone_number),
}));

export const branchesRelations = relations(branchesTable, ({ many }) => ({
  phones: many(branchPhonesTable),
}));

export const branchPhonesRelations = relations(branchPhonesTable, ({ one }) => ({
  branch: one(branchesTable, {
    fields: [branchPhonesTable.branch_id],
    references: [branchesTable.id],
  }),
}));
