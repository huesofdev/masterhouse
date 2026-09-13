import { mysqlTable, varchar, boolean, timestamp, text, mysqlEnum, decimal } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";
import { relations } from "drizzle-orm";

import { int } from "drizzle-orm/mysql-core";

export const categoriesTable = mysqlTable("categories", {
  id: uuidv7Type("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const brandsTable = mysqlTable("brands", {
  id: uuidv7Type("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});
