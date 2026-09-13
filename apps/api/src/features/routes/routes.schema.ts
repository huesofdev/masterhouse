import { mysqlTable, varchar, boolean, timestamp } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";
import { branchesTable } from "../branches/branches.schema";
import { relations } from "drizzle-orm";

export const routesTable = mysqlTable("routes", {
  id: uuidv7Type("id").primaryKey(),
  branch_id: uuidv7Type("branch_id").notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: varchar("description", { length: 255 }),
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const routeAreasTable = mysqlTable("route_areas", {
  id: uuidv7Type("id").primaryKey(),
  route_id: uuidv7Type("route_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const routesRelations = relations(routesTable, ({ one, many }) => ({
  branch: one(branchesTable, {
    fields: [routesTable.branch_id],
    references: [branchesTable.id],
  }),
  areas: many(routeAreasTable),
}));

export const routeAreasRelations = relations(routeAreasTable, ({ one }) => ({
  route: one(routesTable, {
    fields: [routeAreasTable.route_id],
    references: [routesTable.id],
  }),
}));
