import { mysqlTable, varchar, mysqlEnum, timestamp, json, text } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";
import { branchesTable } from "../branches/branches.schema";
import { usersTable } from "../user/user.schema";
import { relations } from "drizzle-orm";

export const syncConflictsTable = mysqlTable("sync_conflicts", {
  id: uuidv7Type("id").primaryKey(),
  branch_id: uuidv7Type("branch_id").notNull(),
  user_id: uuidv7Type("user_id").notNull(),
  error_type: mysqlEnum("error_type", ["DOUBLE_SALE", "PHANTOM_STOCK", "OVER_COLLECTION", "OTHER"]).notNull(),
  error_message: text("error_message").notNull(),
  raw_payload: json("raw_payload").notNull(),
  status: mysqlEnum("status", ["PENDING", "RESOLVED", "DISCARDED"]).default("PENDING").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  resolved_at: timestamp("resolved_at"),
});

export const syncConflictsRelations = relations(syncConflictsTable, ({ one }) => ({
  branch: one(branchesTable, { fields: [syncConflictsTable.branch_id], references: [branchesTable.id] }),
  user: one(usersTable, { fields: [syncConflictsTable.user_id], references: [usersTable.id] }),
}));
