import { mysqlTable, varchar, mysqlEnum, timestamp, decimal, date, datetime, int, primaryKey, text, json } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";
import { branchesTable } from "../branches/branches.schema";
import { routesTable } from "../routes/routes.schema";
import { fleetVehiclesTable } from "../vehicles/vehicles.schema";
import { usersTable } from "../user/user.schema";
import { productsTable } from "../products/products.schema";
import { serialItemsTable } from "../inventory/inventory.schema";
import { relations } from "drizzle-orm";

export const tripsTable = mysqlTable("trips", {
  id: uuidv7Type("id").primaryKey(),
  branch_id: uuidv7Type("branch_id").notNull(),
  route_id: uuidv7Type("route_id").notNull(),
  vehicle_id: uuidv7Type("vehicle_id").notNull(),
  status: mysqlEnum("status", ["PLANNED", "LOADING", "DEPARTED", "IN_PROGRESS", "RECONCILING", "CLOSED", "CLOSED_WITH_DISCREPANCIES", "CANCELLED"]).default("PLANNED").notNull(),
  type: mysqlEnum("type", ["SALE", "COLLECTION", "BOTH"]).default("BOTH").notNull(),
  planned_date: date("planned_date").notNull(),
  departed_at: datetime("departed_at"),
  closed_at: datetime("closed_at"),
  expected_cash: decimal("expected_cash", { precision: 14, scale: 2 }).default("0.00").notNull(),
  actual_cash: decimal("actual_cash", { precision: 14, scale: 2 }).default("0.00").notNull(),
  created_by: uuidv7Type("created_by").notNull(),
  incharge_id: uuidv7Type("incharge_id").notNull(),
  start_km: int("start_km"),
  end_km: int("end_km"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const tripStaffTable = mysqlTable("trip_staff", {
  trip_id: uuidv7Type("trip_id").notNull(),
  user_id: uuidv7Type("user_id").notNull(),
  duty: varchar("duty", { length: 100 }).notNull(), // e.g., 'Driver', 'Assistant'
}, (table) => ({
  pk: primaryKey({ columns: [table.trip_id, table.user_id] }),
}));

export const tripStockTable = mysqlTable("trip_stock", {
  id: uuidv7Type("id").primaryKey(),
  trip_id: uuidv7Type("trip_id").notNull(),
  product_id: uuidv7Type("product_id").notNull(),
  serial_item_id: uuidv7Type("serial_item_id"), // Nullable for bulk items
  loaded_qty: int("loaded_qty").notNull(),
  returned_qty: int("returned_qty").default(0).notNull(),
  sold_qty: int("sold_qty").default(0).notNull(),
  status: mysqlEnum("status", ["LOADED", "CONFIRMED", "RETURNED", "DISCREPANCY"]).default("LOADED").notNull(),
});

export const discrepancyLogsTable = mysqlTable("discrepancy_logs", {
  id: uuidv7Type("id").primaryKey(),
  trip_id: uuidv7Type("trip_id").notNull(),
  type: mysqlEnum("type", ["CASH_SHORTAGE", "CASH_EXCESS", "STOCK_MISSING", "STOCK_EXCESS", "OTHER"]).notNull(),
  description: text("description").notNull(),
  expected_value: varchar("expected_value", { length: 100 }),
  actual_value: varchar("actual_value", { length: 100 }),
  status: mysqlEnum("status", ["OPEN", "RESOLVED", "WAIVED", "CHARGED_TO_WALLET"]).default("OPEN").notNull(),
  snapshot_data: json("snapshot_data"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const tripsRelations = relations(tripsTable, ({ one, many }) => ({
  branch: one(branchesTable, { fields: [tripsTable.branch_id], references: [branchesTable.id] }),
  route: one(routesTable, { fields: [tripsTable.route_id], references: [routesTable.id] }),
  vehicle: one(fleetVehiclesTable, { fields: [tripsTable.vehicle_id], references: [fleetVehiclesTable.id] }),
  creator: one(usersTable, { fields: [tripsTable.created_by], references: [usersTable.id] }),
  incharge: one(usersTable, { fields: [tripsTable.incharge_id], references: [usersTable.id] }),
  staff: many(tripStaffTable),
  stock: many(tripStockTable),
  discrepancies: many(discrepancyLogsTable),
  routes: many(tripRoutesTable),
}));

export const tripStaffRelations = relations(tripStaffTable, ({ one }) => ({
  trip: one(tripsTable, { fields: [tripStaffTable.trip_id], references: [tripsTable.id] }),
  user: one(usersTable, { fields: [tripStaffTable.user_id], references: [usersTable.id] }),
}));

export const tripStockRelations = relations(tripStockTable, ({ one }) => ({
  trip: one(tripsTable, { fields: [tripStockTable.trip_id], references: [tripsTable.id] }),
  product: one(productsTable, { fields: [tripStockTable.product_id], references: [productsTable.id] }),
  serialItem: one(serialItemsTable, { fields: [tripStockTable.serial_item_id], references: [serialItemsTable.id] }),
}));

export const tripRoutesTable = mysqlTable("trip_routes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  trip_id: varchar("trip_id", { length: 36 }).notNull(),
  gps_lat: decimal("gps_lat", { precision: 10, scale: 8 }).notNull(),
  gps_lng: decimal("gps_lng", { precision: 11, scale: 8 }).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const tripRoutesRelations = relations(tripRoutesTable, ({ one }) => ({
  trip: one(tripsTable, { fields: [tripRoutesTable.trip_id], references: [tripsTable.id] }),
}));
