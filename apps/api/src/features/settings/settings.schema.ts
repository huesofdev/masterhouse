import { mysqlTable, varchar, text, timestamp, boolean, decimal, mysqlEnum } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";
import { usersTable } from "../user/user.schema";
import { relations } from "drizzle-orm";

export const systemSettingsTable = mysqlTable("system_settings", {
  setting_key: varchar("setting_key", { length: 100 }).primaryKey(),
  setting_value: text("setting_value"),
  updated_by: uuidv7Type("updated_by"),
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const systemSettingsRelations = relations(systemSettingsTable, ({ one }) => ({
  updatedBy: one(usersTable, { fields: [systemSettingsTable.updated_by], references: [usersTable.id] }),
}));

export const taxesTable = mysqlTable("taxes", {
  id: uuidv7Type("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  rate: decimal("rate", { precision: 5, scale: 2 }).notNull(),
  type: mysqlEnum("type", ["EXCLUSIVE", "INCLUSIVE"]).default("EXCLUSIVE").notNull(),
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
