import { mysqlTable, varchar, decimal, timestamp, text, boolean } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";
import { branchesTable } from "../branches/branches.schema";
import { usersTable } from "../user/user.schema";

export const expenseCategoriesTable = mysqlTable("expense_categories", {
  id: uuidv7Type("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }).notNull().default("OPERATIONAL"),
  is_active: boolean("is_active").default(true).notNull(),
});

export const expensesTable = mysqlTable("expenses", {
  id: uuidv7Type("id").primaryKey(),
  branch_id: uuidv7Type("branch_id").notNull().references(() => branchesTable.id),
  category_id: uuidv7Type("category_id").notNull().references(() => expenseCategoriesTable.id),
  user_id: uuidv7Type("user_id").notNull().references(() => usersTable.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  expense_date: timestamp("expense_date").notNull(),
  description: text("description"),
  receipt_url: text("receipt_url"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
