import { mysqlTable, varchar, boolean, timestamp, decimal, mysqlEnum } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";
import { relations } from "drizzle-orm";
import { usersTable } from "../user/user.schema";

export const promotionsTable = mysqlTable("promotions", {
  id: uuidv7Type("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: varchar("description", { length: 255 }),
  start_date: timestamp("start_date").notNull(),
  end_date: timestamp("end_date").notNull(),
  discount_type: mysqlEnum("discount_type", ["PERCENTAGE", "FIXED"]).notNull(),
  discount_value: decimal("discount_value", { precision: 14, scale: 2 }).notNull(),
  is_active: boolean("is_active").default(true).notNull(),
  created_by: uuidv7Type("created_by").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const promotionsRelations = relations(promotionsTable, ({ one }) => ({
  creator: one(usersTable, { fields: [promotionsTable.created_by], references: [usersTable.id] }),
}));
