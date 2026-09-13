import { mysqlTable, varchar, primaryKey, int } from "drizzle-orm/mysql-core";
import { uuidv7Type } from "../../db/custom-types";
import { relations } from "drizzle-orm";

export const rolesTable = mysqlTable("roles", {
  id: uuidv7Type("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: varchar("description", { length: 255 }),
  level: int("level").notNull().default(10),
});

export const permissionsTable = mysqlTable("permissions", {
  id: uuidv7Type("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: varchar("description", { length: 255 }),
});

export const rolePermissionsTable = mysqlTable("role_permissions", {
  role_id: uuidv7Type("role_id").notNull(),
  permission_id: uuidv7Type("permission_id").notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.role_id, t.permission_id] }),
}));

export const rolesRelations = relations(rolesTable, ({ many }) => ({
  permissions: many(rolePermissionsTable),
}));

export const permissionsRelations = relations(permissionsTable, ({ many }) => ({
  roles: many(rolePermissionsTable),
}));

export const rolePermissionsRelations = relations(rolePermissionsTable, ({ one }) => ({
  role: one(rolesTable, {
    fields: [rolePermissionsTable.role_id],
    references: [rolesTable.id],
  }),
  permission: one(permissionsTable, {
    fields: [rolePermissionsTable.permission_id],
    references: [permissionsTable.id],
  }),
}));
