import { mysqlTable, decimal, timestamp, text, mysqlEnum } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";
import { relations } from "drizzle-orm";
import { suppliersTable } from "./suppliers.schema";
import { branchesTable } from "../branches/branches.schema";
import { usersTable } from "../user/user.schema";

export const supplierBranchBalancesTable = mysqlTable("supplier_branch_balances", {
  id: uuidv7Type("id").primaryKey(),
  supplier_id: uuidv7Type("supplier_id").notNull(),
  branch_id: uuidv7Type("branch_id").notNull(),
  opening_balance: decimal("opening_balance", { precision: 14, scale: 2 }).default("0.00").notNull(),
  balance_due: decimal("balance_due", { precision: 14, scale: 2 }).default("0.00").notNull(),
  total_paid: decimal("total_paid", { precision: 14, scale: 2 }).default("0.00").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const supplierLedgerTable = mysqlTable("supplier_ledger", {
  id: uuidv7Type("id").primaryKey(),
  supplier_id: uuidv7Type("supplier_id").notNull(),
  branch_id: uuidv7Type("branch_id").notNull(),
  transaction_type: mysqlEnum("transaction_type", ["OPENING_BALANCE", "INTAKE_BILL", "PAYMENT", "ADJUSTMENT"]).notNull(),
  reference_id: uuidv7Type("reference_id"), // Could be intake order ID or payment receipt ID
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(), // positive = bill/debt, negative = payment
  balance_after: decimal("balance_after", { precision: 14, scale: 2 }).notNull(),
  notes: text("notes"),
  created_by: uuidv7Type("created_by").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const supplierBranchBalancesRelations = relations(supplierBranchBalancesTable, ({ one }) => ({
  supplier: one(suppliersTable, { fields: [supplierBranchBalancesTable.supplier_id], references: [suppliersTable.id] }),
  branch: one(branchesTable, { fields: [supplierBranchBalancesTable.branch_id], references: [branchesTable.id] }),
}));

export const supplierLedgerRelations = relations(supplierLedgerTable, ({ one }) => ({
  supplier: one(suppliersTable, { fields: [supplierLedgerTable.supplier_id], references: [suppliersTable.id] }),
  branch: one(branchesTable, { fields: [supplierLedgerTable.branch_id], references: [branchesTable.id] }),
  creator: one(usersTable, { fields: [supplierLedgerTable.created_by], references: [usersTable.id] }),
}));
