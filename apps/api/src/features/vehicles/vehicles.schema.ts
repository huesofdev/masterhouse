import { mysqlTable, varchar, mysqlEnum, timestamp } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";
import { branchesTable } from "../branches/branches.schema";
import { relations } from "drizzle-orm";

export const fleetVehiclesTable = mysqlTable("fleet_vehicles", {
  id: uuidv7Type("id").primaryKey(),
  branch_id: uuidv7Type("branch_id").notNull(),
  type: mysqlEnum("type", ["LORRY", "VAN", "CAR", "TUK_TUK", "BIKE", "OTHER"]).default("LORRY").notNull(),
  license_plate: varchar("license_plate", { length: 50 }).notNull().unique(),
  model: varchar("model", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["ACTIVE", "IN_SERVICE", "RETIRED"]).default("ACTIVE").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const fleetVehiclesRelations = relations(fleetVehiclesTable, ({ one }) => ({
  branch: one(branchesTable, {
    fields: [fleetVehiclesTable.branch_id],
    references: [branchesTable.id],
  }),
}));
