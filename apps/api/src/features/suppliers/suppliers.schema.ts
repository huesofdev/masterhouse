import { mysqlTable, varchar, boolean, timestamp, text } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";
import { relations } from "drizzle-orm";
import { intakeOrdersTable } from "../inventory/intake.schema";

export const suppliersTable = mysqlTable("suppliers", {
  id: uuidv7Type("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  contact_person: varchar("contact_person", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  notes: text("notes"),
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const suppliersRelations = relations(suppliersTable, ({ many }) => ({
  intakeOrders: many(intakeOrdersTable),
}));
