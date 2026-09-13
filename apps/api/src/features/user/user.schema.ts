import { mysqlTable, varchar, boolean, primaryKey, timestamp, decimal, mysqlEnum, json, text } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";
import { relations } from "drizzle-orm";
import { rolesTable } from "../rbac/rbac.schema";
import { branchesTable } from "../branches/branches.schema";

export const usersTable = mysqlTable("users", {
  id: uuidv7Type("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  password_hash: varchar("password_hash", { length: 255 }).notNull(),
  role_id: uuidv7Type("role_id"),
  is_active: boolean("is_active").default(true).notNull(),
  max_discount_percentage: decimal("max_discount_percentage", { precision: 5, scale: 2 }).default("0.00").notNull(),
  phone_number: varchar("phone_number", { length: 50 }),
  profile_picture_url: varchar("profile_picture_url", { length: 500 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const userBranchesTable = mysqlTable("user_branches", {
  user_id: uuidv7Type("user_id").notNull(),
  branch_id: uuidv7Type("branch_id").notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.user_id, table.branch_id] }),
}));

export const staffWalletsTable = mysqlTable("staff_wallets", {
  id: uuidv7Type("id").primaryKey(),
  user_id: uuidv7Type("user_id").notNull(),
  branch_id: uuidv7Type("branch_id").notNull(),
  balance: decimal("balance", { precision: 12, scale: 2 }).default("0.00").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const staffWalletTransactionsTable = mysqlTable("staff_wallet_transactions", {
  id: uuidv7Type("id").primaryKey(),
  wallet_id: uuidv7Type("wallet_id").notNull(),
  trip_id: uuidv7Type("trip_id"), // nullable
  discrepancy_id: uuidv7Type("discrepancy_id"), // nullable
  type: mysqlEnum("type", ["CASH_SHORTAGE", "STOCK_SHORTAGE", "REPAYMENT", "SALARY_DEDUCTION", "OTHER"]).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  snapshot_data: json("snapshot_data"), // stores product ID, Name, expected vs actual
  created_at: timestamp("created_at").defaultNow().notNull(),
});

import { stockTransfersTable } from "../inventory/transfers.schema";

export const usersRelations = relations(usersTable, ({ one, many }) => ({
  role: one(rolesTable, {
    fields: [usersTable.role_id],
    references: [rolesTable.id],
  }),
  userBranches: many(userBranchesTable),
  stockTransfers: many(stockTransfersTable, { relationName: "transferredByTransfer" }),
  wallets: many(staffWalletsTable),
}));

export const staffWalletsRelations = relations(staffWalletsTable, ({ one, many }) => ({
  user: one(usersTable, { fields: [staffWalletsTable.user_id], references: [usersTable.id] }),
  branch: one(branchesTable, { fields: [staffWalletsTable.branch_id], references: [branchesTable.id] }),
  transactions: many(staffWalletTransactionsTable),
}));

export const staffWalletTransactionsRelations = relations(staffWalletTransactionsTable, ({ one }) => ({
  wallet: one(staffWalletsTable, { fields: [staffWalletTransactionsTable.wallet_id], references: [staffWalletsTable.id] }),
}));

export const userBranchesRelations = relations(userBranchesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [userBranchesTable.user_id],
    references: [usersTable.id],
  }),
  branch: one(branchesTable, {
    fields: [userBranchesTable.branch_id],
    references: [branchesTable.id],
  }),
}));
