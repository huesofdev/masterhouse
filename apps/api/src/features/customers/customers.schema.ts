import { mysqlTable, varchar, boolean, timestamp, decimal } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";
import { branchesTable } from "../branches/branches.schema";
import { routesTable, routeAreasTable } from "../routes/routes.schema";
import { relations } from "drizzle-orm";

export const customersTable = mysqlTable("customers", {
  id: uuidv7Type("id").primaryKey(),
  branch_id: uuidv7Type("branch_id").notNull(),
  route_id: uuidv7Type("route_id"),
  area_id: uuidv7Type("area_id"),
  full_name: varchar("full_name", { length: 255 }).notNull(),
  nic: varchar("nic", { length: 50 }),
  mobile: varchar("mobile", { length: 50 }).notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  gps_lat: decimal("gps_lat", { precision: 10, scale: 7 }),
  gps_lng: decimal("gps_lng", { precision: 10, scale: 7 }),
  nic_front_url: varchar("nic_front_url", { length: 500 }),
  nic_back_url: varchar("nic_back_url", { length: 500 }),
  is_walk_in: boolean("is_walk_in").default(false).notNull(),
  wallet_balance: decimal("wallet_balance", { precision: 12, scale: 2 }).default("0.00").notNull(),
  rating: decimal("rating", { precision: 2, scale: 1 }),
  rating_calculated_at: timestamp("rating_calculated_at"),
  rating_override: boolean("rating_override").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const guarantorsTable = mysqlTable("guarantors", {
  id: uuidv7Type("id").primaryKey(),
  full_name: varchar("full_name", { length: 255 }).notNull(),
  nic: varchar("nic", { length: 50 }).notNull(),
  mobile: varchar("mobile", { length: 50 }).notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  nic_front_url: varchar("nic_front_url", { length: 500 }),
  nic_back_url: varchar("nic_back_url", { length: 500 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const customersRelations = relations(customersTable, ({ one }) => ({
  branch: one(branchesTable, { fields: [customersTable.branch_id], references: [branchesTable.id] }),
  route: one(routesTable, { fields: [customersTable.route_id], references: [routesTable.id] }),
  area: one(routeAreasTable, { fields: [customersTable.area_id], references: [routeAreasTable.id] }),
}));

export const guarantorsRelations = relations(guarantorsTable, () => ({}));

