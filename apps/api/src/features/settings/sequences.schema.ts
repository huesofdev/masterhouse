import { mysqlTable, varchar, int, timestamp, primaryKey } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";
import { branchesTable } from "../branches/branches.schema";
import { relations } from "drizzle-orm";

export const documentSequencesTable = mysqlTable("document_sequences", {
  branch_id: uuidv7Type("branch_id").notNull(),
  document_type: varchar("document_type", { length: 50 }).notNull(), // 'INVOICE', 'QUOTATION', 'RECEIPT'
  prefix_format: varchar("prefix_format", { length: 100 }).notNull(), // e.g., 'INV-{YYYY}-{MM}-'
  sequence_length: int("sequence_length").default(4).notNull(), // e.g., 4 means '0001'
  current_sequence: int("current_sequence").default(0).notNull(),
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.branch_id, table.document_type] })
}));

export const documentSequencesRelations = relations(documentSequencesTable, ({ one }) => ({
  branch: one(branchesTable, { fields: [documentSequencesTable.branch_id], references: [branchesTable.id] }),
}));
