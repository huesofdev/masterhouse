"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/db/index.ts
var import_mysql2 = require("drizzle-orm/mysql2");
var import_promise = __toESM(require("mysql2/promise"));

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  branchPhonesRelations: () => branchPhonesRelations,
  branchPhonesTable: () => branchPhonesTable,
  branchesRelations: () => branchesRelations,
  branchesTable: () => branchesTable,
  categoriesTable: () => categoriesTable,
  collectionReceiptsRelations: () => collectionReceiptsRelations,
  collectionReceiptsTable: () => collectionReceiptsTable,
  contractAdjustmentsTable: () => contractAdjustmentsTable,
  customersRelations: () => customersRelations,
  customersTable: () => customersTable,
  discrepancyLogsTable: () => discrepancyLogsTable,
  fleetVehiclesRelations: () => fleetVehiclesRelations,
  fleetVehiclesTable: () => fleetVehiclesTable,
  guarantorsRelations: () => guarantorsRelations,
  guarantorsTable: () => guarantorsTable,
  installmentContractsRelations: () => installmentContractsRelations,
  installmentContractsTable: () => installmentContractsTable,
  installmentSchedulesRelations: () => installmentSchedulesRelations,
  installmentSchedulesTable: () => installmentSchedulesTable,
  installmentSchemesRelations: () => installmentSchemesRelations,
  installmentSchemesTable: () => installmentSchemesTable,
  intakeItemsRelations: () => intakeItemsRelations,
  intakeItemsTable: () => intakeItemsTable,
  intakeOrdersRelations: () => intakeOrdersRelations,
  intakeOrdersTable: () => intakeOrdersTable,
  inventoryBalancesRelations: () => inventoryBalancesRelations,
  inventoryBalancesTable: () => inventoryBalancesTable,
  permissionsRelations: () => permissionsRelations,
  permissionsTable: () => permissionsTable,
  productsRelations: () => productsRelations,
  productsTable: () => productsTable,
  promotionsRelations: () => promotionsRelations,
  promotionsTable: () => promotionsTable,
  refundsTable: () => refundsTable,
  returnsRelations: () => returnsRelations,
  returnsTable: () => returnsTable,
  rolePermissionsRelations: () => rolePermissionsRelations,
  rolePermissionsTable: () => rolePermissionsTable,
  rolesRelations: () => rolesRelations,
  rolesTable: () => rolesTable,
  routesRelations: () => routesRelations,
  routesTable: () => routesTable,
  saleItemsRelations: () => saleItemsRelations,
  saleItemsTable: () => saleItemsTable,
  salesRelations: () => salesRelations,
  salesTable: () => salesTable,
  serialItemsRelations: () => serialItemsRelations,
  serialItemsTable: () => serialItemsTable,
  smsLogsTable: () => smsLogsTable,
  smsTemplatesTable: () => smsTemplatesTable,
  suppliersRelations: () => suppliersRelations,
  suppliersTable: () => suppliersTable,
  syncConflictsRelations: () => syncConflictsRelations,
  syncConflictsTable: () => syncConflictsTable,
  systemSettingsRelations: () => systemSettingsRelations,
  systemSettingsTable: () => systemSettingsTable,
  tripStaffRelations: () => tripStaffRelations,
  tripStaffTable: () => tripStaffTable,
  tripStockRelations: () => tripStockRelations,
  tripStockTable: () => tripStockTable,
  tripsRelations: () => tripsRelations,
  tripsTable: () => tripsTable,
  userBranchesRelations: () => userBranchesRelations,
  userBranchesTable: () => userBranchesTable,
  usersRelations: () => usersRelations,
  usersTable: () => usersTable,
  warehousesRelations: () => warehousesRelations,
  warehousesTable: () => warehousesTable,
  warrantyClaimsRelations: () => warrantyClaimsRelations,
  warrantyClaimsTable: () => warrantyClaimsTable
});

// src/features/user/user.schema.ts
var import_mysql_core4 = require("drizzle-orm/mysql-core");

// src/db/custom-types.ts
var import_mysql_core = require("drizzle-orm/mysql-core");
var import_uuid = require("uuid");
var uuidv7Type = (0, import_mysql_core.customType)({
  dataType() {
    return "binary(16)";
  },
  fromDriver(value) {
    if (Buffer.isBuffer(value)) {
      return (0, import_uuid.stringify)(value);
    }
    if (typeof value === "string" && value.startsWith("base64:type254:")) {
      const b64 = value.replace("base64:type254:", "");
      return (0, import_uuid.stringify)(Buffer.from(b64, "base64"));
    }
    return value;
  },
  toDriver(value) {
    try {
      return Buffer.from((0, import_uuid.parse)(value));
    } catch (err) {
      console.error("Invalid UUID passed to toDriver:", value);
      throw err;
    }
  }
});

// src/features/user/user.schema.ts
var import_drizzle_orm3 = require("drizzle-orm");

// src/features/rbac/rbac.schema.ts
var import_mysql_core2 = require("drizzle-orm/mysql-core");
var import_drizzle_orm = require("drizzle-orm");
var rolesTable = (0, import_mysql_core2.mysqlTable)("roles", {
  id: uuidv7Type("id").primaryKey(),
  name: (0, import_mysql_core2.varchar)("name", { length: 255 }).notNull().unique(),
  description: (0, import_mysql_core2.varchar)("description", { length: 255 }),
  level: (0, import_mysql_core2.int)("level").notNull().default(10)
});
var permissionsTable = (0, import_mysql_core2.mysqlTable)("permissions", {
  id: uuidv7Type("id").primaryKey(),
  name: (0, import_mysql_core2.varchar)("name", { length: 255 }).notNull().unique(),
  description: (0, import_mysql_core2.varchar)("description", { length: 255 })
});
var rolePermissionsTable = (0, import_mysql_core2.mysqlTable)("role_permissions", {
  role_id: uuidv7Type("role_id").notNull(),
  permission_id: uuidv7Type("permission_id").notNull()
}, (t) => ({
  pk: (0, import_mysql_core2.primaryKey)({ columns: [t.role_id, t.permission_id] })
}));
var rolesRelations = (0, import_drizzle_orm.relations)(rolesTable, ({ many }) => ({
  permissions: many(rolePermissionsTable)
}));
var permissionsRelations = (0, import_drizzle_orm.relations)(permissionsTable, ({ many }) => ({
  roles: many(rolePermissionsTable)
}));
var rolePermissionsRelations = (0, import_drizzle_orm.relations)(rolePermissionsTable, ({ one }) => ({
  role: one(rolesTable, {
    fields: [rolePermissionsTable.role_id],
    references: [rolesTable.id]
  }),
  permission: one(permissionsTable, {
    fields: [rolePermissionsTable.permission_id],
    references: [permissionsTable.id]
  })
}));

// src/features/branches/branches.schema.ts
var import_mysql_core3 = require("drizzle-orm/mysql-core");
var import_drizzle_orm2 = require("drizzle-orm");
var branchesTable = (0, import_mysql_core3.mysqlTable)("branches", {
  id: uuidv7Type("id").primaryKey(),
  name: (0, import_mysql_core3.varchar)("name", { length: 255 }).notNull(),
  address: (0, import_mysql_core3.varchar)("address", { length: 255 }),
  isActive: (0, import_mysql_core3.boolean)("is_active").default(true).notNull()
});
var branchPhonesTable = (0, import_mysql_core3.mysqlTable)("branch_phones", {
  id: uuidv7Type("id").primaryKey(),
  branch_id: uuidv7Type("branch_id").notNull(),
  phone_number: (0, import_mysql_core3.varchar)("phone_number", { length: 15 }).notNull()
}, (table) => ({
  unique_branch_phone: (0, import_mysql_core3.uniqueIndex)("unique_branch_phone").on(table.branch_id, table.phone_number)
}));
var branchesRelations = (0, import_drizzle_orm2.relations)(branchesTable, ({ many }) => ({
  phones: many(branchPhonesTable)
}));
var branchPhonesRelations = (0, import_drizzle_orm2.relations)(branchPhonesTable, ({ one }) => ({
  branch: one(branchesTable, {
    fields: [branchPhonesTable.branch_id],
    references: [branchesTable.id]
  })
}));

// src/features/user/user.schema.ts
var usersTable = (0, import_mysql_core4.mysqlTable)("users", {
  id: uuidv7Type("id").primaryKey(),
  email: (0, import_mysql_core4.varchar)("email", { length: 255 }).notNull().unique(),
  name: (0, import_mysql_core4.varchar)("name", { length: 255 }),
  password_hash: (0, import_mysql_core4.varchar)("password_hash", { length: 255 }).notNull(),
  role_id: uuidv7Type("role_id"),
  is_active: (0, import_mysql_core4.boolean)("is_active").default(true).notNull(),
  max_discount_percentage: (0, import_mysql_core4.decimal)("max_discount_percentage", { precision: 5, scale: 2 }).default("0.00").notNull(),
  created_at: (0, import_mysql_core4.timestamp)("created_at").defaultNow().notNull()
});
var userBranchesTable = (0, import_mysql_core4.mysqlTable)("user_branches", {
  user_id: uuidv7Type("user_id").notNull(),
  branch_id: uuidv7Type("branch_id").notNull()
}, (table) => ({
  pk: (0, import_mysql_core4.primaryKey)({ columns: [table.user_id, table.branch_id] })
}));
var usersRelations = (0, import_drizzle_orm3.relations)(usersTable, ({ one, many }) => ({
  role: one(rolesTable, {
    fields: [usersTable.role_id],
    references: [rolesTable.id]
  }),
  userBranches: many(userBranchesTable)
}));
var userBranchesRelations = (0, import_drizzle_orm3.relations)(userBranchesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [userBranchesTable.user_id],
    references: [usersTable.id]
  }),
  branch: one(branchesTable, {
    fields: [userBranchesTable.branch_id],
    references: [branchesTable.id]
  })
}));

// src/features/warehouses/warehouses.schema.ts
var import_mysql_core5 = require("drizzle-orm/mysql-core");
var import_drizzle_orm4 = require("drizzle-orm");
var warehousesTable = (0, import_mysql_core5.mysqlTable)("warehouses", {
  id: uuidv7Type("id").primaryKey(),
  branch_id: uuidv7Type("branch_id").notNull(),
  // Cannot easily reference directly if relations are complex, but keeping it simple
  name: (0, import_mysql_core5.varchar)("name", { length: 255 }).notNull(),
  address: (0, import_mysql_core5.varchar)("address", { length: 255 }).notNull(),
  is_default: (0, import_mysql_core5.boolean)("is_default").default(false).notNull(),
  is_active: (0, import_mysql_core5.boolean)("is_active").default(true).notNull(),
  created_at: (0, import_mysql_core5.timestamp)("created_at").defaultNow().notNull()
});
var warehousesRelations = (0, import_drizzle_orm4.relations)(warehousesTable, ({ one }) => ({
  branch: one(branchesTable, {
    fields: [warehousesTable.branch_id],
    references: [branchesTable.id]
  })
}));

// src/features/catalog/catalog.schema.ts
var import_mysql_core6 = require("drizzle-orm/mysql-core");
var categoriesTable = (0, import_mysql_core6.mysqlTable)("categories", {
  id: uuidv7Type("id").primaryKey(),
  name: (0, import_mysql_core6.varchar)("name", { length: 255 }).notNull(),
  description: (0, import_mysql_core6.text)("description"),
  is_active: (0, import_mysql_core6.boolean)("is_active").default(true).notNull(),
  created_at: (0, import_mysql_core6.timestamp)("created_at").defaultNow().notNull()
});

// src/features/vehicles/vehicles.schema.ts
var import_mysql_core7 = require("drizzle-orm/mysql-core");
var import_drizzle_orm5 = require("drizzle-orm");
var fleetVehiclesTable = (0, import_mysql_core7.mysqlTable)("fleet_vehicles", {
  id: uuidv7Type("id").primaryKey(),
  branch_id: uuidv7Type("branch_id").notNull(),
  type: (0, import_mysql_core7.mysqlEnum)("type", ["LORRY", "VAN", "CAR", "TUK_TUK", "BIKE", "OTHER"]).default("LORRY").notNull(),
  license_plate: (0, import_mysql_core7.varchar)("license_plate", { length: 50 }).notNull().unique(),
  model: (0, import_mysql_core7.varchar)("model", { length: 100 }).notNull(),
  status: (0, import_mysql_core7.mysqlEnum)("status", ["ACTIVE", "IN_SERVICE", "RETIRED"]).default("ACTIVE").notNull(),
  created_at: (0, import_mysql_core7.timestamp)("created_at").defaultNow().notNull()
});
var fleetVehiclesRelations = (0, import_drizzle_orm5.relations)(fleetVehiclesTable, ({ one }) => ({
  branch: one(branchesTable, {
    fields: [fleetVehiclesTable.branch_id],
    references: [branchesTable.id]
  })
}));

// src/features/routes/routes.schema.ts
var import_mysql_core8 = require("drizzle-orm/mysql-core");
var import_drizzle_orm6 = require("drizzle-orm");
var routesTable = (0, import_mysql_core8.mysqlTable)("routes", {
  id: uuidv7Type("id").primaryKey(),
  branch_id: uuidv7Type("branch_id").notNull(),
  code: (0, import_mysql_core8.varchar)("code", { length: 50 }).notNull(),
  name: (0, import_mysql_core8.varchar)("name", { length: 255 }).notNull(),
  description: (0, import_mysql_core8.varchar)("description", { length: 255 }),
  is_active: (0, import_mysql_core8.boolean)("is_active").default(true).notNull(),
  created_at: (0, import_mysql_core8.timestamp)("created_at").defaultNow().notNull()
});
var routesRelations = (0, import_drizzle_orm6.relations)(routesTable, ({ one }) => ({
  branch: one(branchesTable, {
    fields: [routesTable.branch_id],
    references: [branchesTable.id]
  })
}));

// src/features/products/products.schema.ts
var import_mysql_core9 = require("drizzle-orm/mysql-core");
var import_drizzle_orm7 = require("drizzle-orm");
var productsTable = (0, import_mysql_core9.mysqlTable)("products", {
  id: uuidv7Type("id").primaryKey(),
  category_id: uuidv7Type("category_id").notNull(),
  name: (0, import_mysql_core9.varchar)("name", { length: 255 }).notNull(),
  sku: (0, import_mysql_core9.varchar)("sku", { length: 100 }).notNull().unique(),
  description: (0, import_mysql_core9.text)("description"),
  image_url: (0, import_mysql_core9.varchar)("image_url", { length: 1e3 }),
  base_price: (0, import_mysql_core9.decimal)("base_price", { precision: 12, scale: 2 }).default("0.00").notNull(),
  uom: (0, import_mysql_core9.mysqlEnum)("uom", ["pieces", "kg", "g", "l", "ml", "box", "pack"]).default("pieces").notNull(),
  is_serialized: (0, import_mysql_core9.boolean)("is_serialized").default(false).notNull(),
  min_downpayment_rate: (0, import_mysql_core9.decimal)("min_downpayment_rate", { precision: 5, scale: 2 }).default("0.00").notNull(),
  warranty_months: (0, import_mysql_core9.int)("warranty_months").default(12).notNull(),
  avg_cost: (0, import_mysql_core9.decimal)("avg_cost", { precision: 12, scale: 2 }).default("0.00").notNull(),
  is_active: (0, import_mysql_core9.boolean)("is_active").default(true).notNull(),
  created_at: (0, import_mysql_core9.timestamp)("created_at").defaultNow().notNull(),
  updated_at: (0, import_mysql_core9.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
});
var productsRelations = (0, import_drizzle_orm7.relations)(productsTable, ({ one }) => ({
  category: one(categoriesTable, {
    fields: [productsTable.category_id],
    references: [categoriesTable.id]
  })
}));

// src/features/suppliers/suppliers.schema.ts
var import_mysql_core12 = require("drizzle-orm/mysql-core");
var import_drizzle_orm10 = require("drizzle-orm");

// src/features/inventory/intake.schema.ts
var import_mysql_core11 = require("drizzle-orm/mysql-core");

// src/features/inventory/inventory.schema.ts
var import_mysql_core10 = require("drizzle-orm/mysql-core");
var import_drizzle_orm8 = require("drizzle-orm");
var serialItemsTable = (0, import_mysql_core10.mysqlTable)("serial_items", {
  id: uuidv7Type("id").primaryKey(),
  product_id: uuidv7Type("product_id").notNull(),
  intake_item_id: uuidv7Type("intake_item_id"),
  warehouse_id: uuidv7Type("warehouse_id"),
  serial_number: (0, import_mysql_core10.varchar)("serial_number", { length: 150 }).notNull(),
  status: (0, import_mysql_core10.mysqlEnum)("status", ["IN_STOCK", "ON_TRIP", "SOLD", "RETURNED", "LOST", "DEFECTIVE", "UNDER_WARRANTY"]).default("IN_STOCK").notNull(),
  created_at: (0, import_mysql_core10.timestamp)("created_at").defaultNow().notNull()
});
var inventoryBalancesTable = (0, import_mysql_core10.mysqlTable)("inventory_balances", {
  warehouse_id: uuidv7Type("warehouse_id").notNull(),
  product_id: uuidv7Type("product_id").notNull(),
  quantity: (0, import_mysql_core10.int)("quantity").default(0).notNull(),
  avg_cost: (0, import_mysql_core10.decimal)("avg_cost", { precision: 12, scale: 2 }).default("0.00").notNull(),
  updated_at: (0, import_mysql_core10.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
}, (table) => ({
  pk: (0, import_mysql_core10.primaryKey)({ columns: [table.warehouse_id, table.product_id] })
}));
var serialItemsRelations = (0, import_drizzle_orm8.relations)(serialItemsTable, ({ one }) => ({
  product: one(productsTable, { fields: [serialItemsTable.product_id], references: [productsTable.id] }),
  intakeItem: one(intakeItemsTable, { fields: [serialItemsTable.intake_item_id], references: [intakeItemsTable.id] }),
  warehouse: one(warehousesTable, { fields: [serialItemsTable.warehouse_id], references: [warehousesTable.id] })
}));
var inventoryBalancesRelations = (0, import_drizzle_orm8.relations)(inventoryBalancesTable, ({ one }) => ({
  warehouse: one(warehousesTable, { fields: [inventoryBalancesTable.warehouse_id], references: [warehousesTable.id] }),
  product: one(productsTable, { fields: [inventoryBalancesTable.product_id], references: [productsTable.id] })
}));

// src/features/inventory/intake.schema.ts
var import_drizzle_orm9 = require("drizzle-orm");
var intakeOrdersTable = (0, import_mysql_core11.mysqlTable)("intake_orders", {
  id: uuidv7Type("id").primaryKey(),
  branch_id: uuidv7Type("branch_id").notNull(),
  warehouse_id: uuidv7Type("warehouse_id").notNull(),
  supplier_id: uuidv7Type("supplier_id"),
  // optional FK to suppliers
  supplier_name: (0, import_mysql_core11.varchar)("supplier_name", { length: 255 }).notNull(),
  // cached for display
  invoice_number: (0, import_mysql_core11.varchar)("invoice_number", { length: 100 }),
  status: (0, import_mysql_core11.mysqlEnum)("status", ["RECEIVED", "VOID"]).default("RECEIVED").notNull(),
  received_at: (0, import_mysql_core11.datetime)("received_at").notNull(),
  created_by: uuidv7Type("created_by").notNull(),
  total_cost: (0, import_mysql_core11.decimal)("total_cost", { precision: 14, scale: 2 }).default("0.00").notNull(),
  created_at: (0, import_mysql_core11.timestamp)("created_at").defaultNow().notNull()
});
var intakeItemsTable = (0, import_mysql_core11.mysqlTable)("intake_items", {
  id: uuidv7Type("id").primaryKey(),
  intake_order_id: uuidv7Type("intake_order_id").notNull(),
  warehouse_id: uuidv7Type("warehouse_id").notNull(),
  product_id: uuidv7Type("product_id").notNull(),
  quantity: (0, import_mysql_core11.int)("quantity").notNull(),
  unit_cost: (0, import_mysql_core11.decimal)("unit_cost", { precision: 12, scale: 2 }).notNull(),
  total_cost: (0, import_mysql_core11.decimal)("total_cost", { precision: 14, scale: 2 }).notNull()
});
var intakeOrdersRelations = (0, import_drizzle_orm9.relations)(intakeOrdersTable, ({ one, many }) => ({
  branch: one(branchesTable, { fields: [intakeOrdersTable.branch_id], references: [branchesTable.id] }),
  warehouse: one(warehousesTable, { fields: [intakeOrdersTable.warehouse_id], references: [warehousesTable.id] }),
  creator: one(usersTable, { fields: [intakeOrdersTable.created_by], references: [usersTable.id] }),
  supplier: one(suppliersTable, { fields: [intakeOrdersTable.supplier_id], references: [suppliersTable.id] }),
  items: many(intakeItemsTable)
}));
var intakeItemsRelations = (0, import_drizzle_orm9.relations)(intakeItemsTable, ({ one, many }) => ({
  order: one(intakeOrdersTable, { fields: [intakeItemsTable.intake_order_id], references: [intakeOrdersTable.id] }),
  warehouse: one(warehousesTable, { fields: [intakeItemsTable.warehouse_id], references: [warehousesTable.id] }),
  product: one(productsTable, { fields: [intakeItemsTable.product_id], references: [productsTable.id] }),
  serials: many(serialItemsTable)
}));

// src/features/suppliers/suppliers.schema.ts
var suppliersTable = (0, import_mysql_core12.mysqlTable)("suppliers", {
  id: uuidv7Type("id").primaryKey(),
  name: (0, import_mysql_core12.varchar)("name", { length: 255 }).notNull(),
  contact_person: (0, import_mysql_core12.varchar)("contact_person", { length: 255 }),
  phone: (0, import_mysql_core12.varchar)("phone", { length: 20 }),
  email: (0, import_mysql_core12.varchar)("email", { length: 255 }),
  address: (0, import_mysql_core12.text)("address"),
  notes: (0, import_mysql_core12.text)("notes"),
  is_active: (0, import_mysql_core12.boolean)("is_active").default(true).notNull(),
  created_at: (0, import_mysql_core12.timestamp)("created_at").defaultNow().notNull(),
  updated_at: (0, import_mysql_core12.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
});
var suppliersRelations = (0, import_drizzle_orm10.relations)(suppliersTable, ({ many }) => ({
  intakeOrders: many(intakeOrdersTable)
}));

// src/features/operations/operations.schema.ts
var import_mysql_core13 = require("drizzle-orm/mysql-core");
var import_drizzle_orm11 = require("drizzle-orm");
var tripsTable = (0, import_mysql_core13.mysqlTable)("trips", {
  id: uuidv7Type("id").primaryKey(),
  branch_id: uuidv7Type("branch_id").notNull(),
  route_id: uuidv7Type("route_id").notNull(),
  vehicle_id: uuidv7Type("vehicle_id").notNull(),
  status: (0, import_mysql_core13.mysqlEnum)("status", ["PLANNED", "LOADING", "DEPARTED", "IN_PROGRESS", "RECONCILING", "CLOSED", "CLOSED_WITH_DISCREPANCIES", "CANCELLED"]).default("PLANNED").notNull(),
  type: (0, import_mysql_core13.mysqlEnum)("type", ["SALE", "COLLECTION", "BOTH"]).default("BOTH").notNull(),
  planned_date: (0, import_mysql_core13.date)("planned_date").notNull(),
  departed_at: (0, import_mysql_core13.datetime)("departed_at"),
  closed_at: (0, import_mysql_core13.datetime)("closed_at"),
  expected_cash: (0, import_mysql_core13.decimal)("expected_cash", { precision: 14, scale: 2 }).default("0.00").notNull(),
  actual_cash: (0, import_mysql_core13.decimal)("actual_cash", { precision: 14, scale: 2 }).default("0.00").notNull(),
  created_by: uuidv7Type("created_by").notNull(),
  incharge_id: uuidv7Type("incharge_id").notNull(),
  created_at: (0, import_mysql_core13.timestamp)("created_at").defaultNow().notNull()
});
var tripStaffTable = (0, import_mysql_core13.mysqlTable)("trip_staff", {
  trip_id: uuidv7Type("trip_id").notNull(),
  user_id: uuidv7Type("user_id").notNull(),
  duty: (0, import_mysql_core13.varchar)("duty", { length: 100 }).notNull()
  // e.g., 'Driver', 'Assistant'
}, (table) => ({
  pk: (0, import_mysql_core13.primaryKey)({ columns: [table.trip_id, table.user_id] })
}));
var tripStockTable = (0, import_mysql_core13.mysqlTable)("trip_stock", {
  id: uuidv7Type("id").primaryKey(),
  trip_id: uuidv7Type("trip_id").notNull(),
  product_id: uuidv7Type("product_id").notNull(),
  serial_item_id: uuidv7Type("serial_item_id"),
  // Nullable for bulk items
  loaded_qty: (0, import_mysql_core13.int)("loaded_qty").notNull(),
  returned_qty: (0, import_mysql_core13.int)("returned_qty").default(0).notNull(),
  sold_qty: (0, import_mysql_core13.int)("sold_qty").default(0).notNull(),
  status: (0, import_mysql_core13.mysqlEnum)("status", ["LOADED", "CONFIRMED", "RETURNED", "DISCREPANCY"]).default("LOADED").notNull()
});
var discrepancyLogsTable = (0, import_mysql_core13.mysqlTable)("discrepancy_logs", {
  id: uuidv7Type("id").primaryKey(),
  trip_id: uuidv7Type("trip_id").notNull(),
  type: (0, import_mysql_core13.mysqlEnum)("type", ["CASH_SHORTAGE", "CASH_EXCESS", "STOCK_MISSING", "STOCK_EXCESS", "OTHER"]).notNull(),
  description: (0, import_mysql_core13.text)("description").notNull(),
  expected_value: (0, import_mysql_core13.varchar)("expected_value", { length: 100 }),
  actual_value: (0, import_mysql_core13.varchar)("actual_value", { length: 100 }),
  status: (0, import_mysql_core13.mysqlEnum)("status", ["OPEN", "RESOLVED", "WAIVED"]).default("OPEN").notNull(),
  created_at: (0, import_mysql_core13.timestamp)("created_at").defaultNow().notNull()
});
var tripsRelations = (0, import_drizzle_orm11.relations)(tripsTable, ({ one, many }) => ({
  branch: one(branchesTable, { fields: [tripsTable.branch_id], references: [branchesTable.id] }),
  route: one(routesTable, { fields: [tripsTable.route_id], references: [routesTable.id] }),
  vehicle: one(fleetVehiclesTable, { fields: [tripsTable.vehicle_id], references: [fleetVehiclesTable.id] }),
  creator: one(usersTable, { fields: [tripsTable.created_by], references: [usersTable.id] }),
  incharge: one(usersTable, { fields: [tripsTable.incharge_id], references: [usersTable.id] }),
  staff: many(tripStaffTable),
  stock: many(tripStockTable),
  discrepancies: many(discrepancyLogsTable)
}));
var tripStaffRelations = (0, import_drizzle_orm11.relations)(tripStaffTable, ({ one }) => ({
  trip: one(tripsTable, { fields: [tripStaffTable.trip_id], references: [tripsTable.id] }),
  user: one(usersTable, { fields: [tripStaffTable.user_id], references: [usersTable.id] })
}));
var tripStockRelations = (0, import_drizzle_orm11.relations)(tripStockTable, ({ one }) => ({
  trip: one(tripsTable, { fields: [tripStockTable.trip_id], references: [tripsTable.id] }),
  product: one(productsTable, { fields: [tripStockTable.product_id], references: [productsTable.id] }),
  serialItem: one(serialItemsTable, { fields: [tripStockTable.serial_item_id], references: [serialItemsTable.id] })
}));

// src/features/customers/customers.schema.ts
var import_mysql_core14 = require("drizzle-orm/mysql-core");
var import_drizzle_orm12 = require("drizzle-orm");
var customersTable = (0, import_mysql_core14.mysqlTable)("customers", {
  id: uuidv7Type("id").primaryKey(),
  branch_id: uuidv7Type("branch_id").notNull(),
  route_id: uuidv7Type("route_id"),
  full_name: (0, import_mysql_core14.varchar)("full_name", { length: 255 }).notNull(),
  nic: (0, import_mysql_core14.varchar)("nic", { length: 50 }),
  mobile: (0, import_mysql_core14.varchar)("mobile", { length: 50 }).notNull(),
  address: (0, import_mysql_core14.varchar)("address", { length: 255 }).notNull(),
  gps_lat: (0, import_mysql_core14.decimal)("gps_lat", { precision: 10, scale: 7 }),
  gps_lng: (0, import_mysql_core14.decimal)("gps_lng", { precision: 10, scale: 7 }),
  nic_front_url: (0, import_mysql_core14.varchar)("nic_front_url", { length: 500 }),
  nic_back_url: (0, import_mysql_core14.varchar)("nic_back_url", { length: 500 }),
  is_walk_in: (0, import_mysql_core14.boolean)("is_walk_in").default(false).notNull(),
  wallet_balance: (0, import_mysql_core14.decimal)("wallet_balance", { precision: 12, scale: 2 }).default("0.00").notNull(),
  created_at: (0, import_mysql_core14.timestamp)("created_at").defaultNow().notNull()
});
var guarantorsTable = (0, import_mysql_core14.mysqlTable)("guarantors", {
  id: uuidv7Type("id").primaryKey(),
  full_name: (0, import_mysql_core14.varchar)("full_name", { length: 255 }).notNull(),
  nic: (0, import_mysql_core14.varchar)("nic", { length: 50 }).notNull(),
  mobile: (0, import_mysql_core14.varchar)("mobile", { length: 50 }).notNull(),
  address: (0, import_mysql_core14.varchar)("address", { length: 255 }).notNull(),
  nic_front_url: (0, import_mysql_core14.varchar)("nic_front_url", { length: 500 }),
  nic_back_url: (0, import_mysql_core14.varchar)("nic_back_url", { length: 500 }),
  created_at: (0, import_mysql_core14.timestamp)("created_at").defaultNow().notNull()
});
var customersRelations = (0, import_drizzle_orm12.relations)(customersTable, ({ one }) => ({
  branch: one(branchesTable, { fields: [customersTable.branch_id], references: [branchesTable.id] }),
  route: one(routesTable, { fields: [customersTable.route_id], references: [routesTable.id] })
}));
var guarantorsRelations = (0, import_drizzle_orm12.relations)(guarantorsTable, () => ({}));

// src/features/sale/sales.schema.ts
var import_mysql_core16 = require("drizzle-orm/mysql-core");

// src/features/promotions/promotions.schema.ts
var import_mysql_core15 = require("drizzle-orm/mysql-core");
var import_drizzle_orm13 = require("drizzle-orm");
var promotionsTable = (0, import_mysql_core15.mysqlTable)("promotions", {
  id: uuidv7Type("id").primaryKey(),
  name: (0, import_mysql_core15.varchar)("name", { length: 255 }).notNull(),
  description: (0, import_mysql_core15.varchar)("description", { length: 255 }),
  start_date: (0, import_mysql_core15.timestamp)("start_date").notNull(),
  end_date: (0, import_mysql_core15.timestamp)("end_date").notNull(),
  discount_type: (0, import_mysql_core15.mysqlEnum)("discount_type", ["PERCENTAGE", "FIXED"]).notNull(),
  discount_value: (0, import_mysql_core15.decimal)("discount_value", { precision: 14, scale: 2 }).notNull(),
  is_active: (0, import_mysql_core15.boolean)("is_active").default(true).notNull(),
  created_by: uuidv7Type("created_by").notNull(),
  created_at: (0, import_mysql_core15.timestamp)("created_at").defaultNow().notNull(),
  updated_at: (0, import_mysql_core15.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
});
var promotionsRelations = (0, import_drizzle_orm13.relations)(promotionsTable, ({ one }) => ({
  creator: one(usersTable, { fields: [promotionsTable.created_by], references: [usersTable.id] })
}));

// src/features/sale/sales.schema.ts
var import_drizzle_orm14 = require("drizzle-orm");
var salesTable = (0, import_mysql_core16.mysqlTable)("sales", {
  id: uuidv7Type("id").primaryKey(),
  branch_id: uuidv7Type("branch_id").notNull(),
  customer_id: uuidv7Type("customer_id"),
  // Nullable for direct POS walk-ins
  trip_id: uuidv7Type("trip_id"),
  created_by: uuidv7Type("created_by").notNull(),
  sale_type: (0, import_mysql_core16.mysqlEnum)("sale_type", ["DIRECT", "INSTALLMENT"]).notNull(),
  payment_mode: (0, import_mysql_core16.mysqlEnum)("payment_mode", ["CASH", "CARD", "TRANSFER"]).default("CASH").notNull(),
  subtotal: (0, import_mysql_core16.decimal)("subtotal", { precision: 14, scale: 2 }).notNull(),
  promotion_id: uuidv7Type("promotion_id"),
  promotion_discount: (0, import_mysql_core16.decimal)("promotion_discount", { precision: 14, scale: 2 }).default("0.00").notNull(),
  manual_discount: (0, import_mysql_core16.decimal)("manual_discount", { precision: 14, scale: 2 }).default("0.00").notNull(),
  downpayment: (0, import_mysql_core16.decimal)("downpayment", { precision: 14, scale: 2 }).default("0.00").notNull(),
  total: (0, import_mysql_core16.decimal)("total", { precision: 14, scale: 2 }).notNull(),
  status: (0, import_mysql_core16.mysqlEnum)("status", ["COMPLETED", "CANCELLED", "RETURNED"]).default("COMPLETED").notNull(),
  idempotency_key: (0, import_mysql_core16.varchar)("idempotency_key", { length: 255 }).unique(),
  created_at: (0, import_mysql_core16.timestamp)("created_at").defaultNow().notNull()
});
var saleItemsTable = (0, import_mysql_core16.mysqlTable)("sale_items", {
  id: uuidv7Type("id").primaryKey(),
  sale_id: uuidv7Type("sale_id").notNull(),
  product_id: uuidv7Type("product_id").notNull(),
  serial_item_id: uuidv7Type("serial_item_id"),
  quantity: (0, import_mysql_core16.int)("quantity").notNull(),
  unit_price: (0, import_mysql_core16.decimal)("unit_price", { precision: 12, scale: 2 }).notNull(),
  line_total: (0, import_mysql_core16.decimal)("line_total", { precision: 14, scale: 2 }).notNull()
});
var salesRelations = (0, import_drizzle_orm14.relations)(salesTable, ({ one, many }) => ({
  branch: one(branchesTable, { fields: [salesTable.branch_id], references: [branchesTable.id] }),
  customer: one(customersTable, { fields: [salesTable.customer_id], references: [customersTable.id] }),
  trip: one(tripsTable, { fields: [salesTable.trip_id], references: [tripsTable.id] }),
  creator: one(usersTable, { fields: [salesTable.created_by], references: [usersTable.id] }),
  promotion: one(promotionsTable, { fields: [salesTable.promotion_id], references: [promotionsTable.id] }),
  items: many(saleItemsTable)
}));
var saleItemsRelations = (0, import_drizzle_orm14.relations)(saleItemsTable, ({ one }) => ({
  sale: one(salesTable, { fields: [saleItemsTable.sale_id], references: [salesTable.id] }),
  product: one(productsTable, { fields: [saleItemsTable.product_id], references: [productsTable.id] }),
  serialItem: one(serialItemsTable, { fields: [saleItemsTable.serial_item_id], references: [serialItemsTable.id] })
}));

// src/features/collections/collections.schema.ts
var import_mysql_core17 = require("drizzle-orm/mysql-core");
var import_drizzle_orm15 = require("drizzle-orm");
var installmentSchemesTable = (0, import_mysql_core17.mysqlTable)("installment_schemes", {
  id: uuidv7Type("id").primaryKey(),
  branch_id: uuidv7Type("branch_id"),
  // Nullable for global schemes
  name: (0, import_mysql_core17.varchar)("name", { length: 255 }).notNull(),
  terms: (0, import_mysql_core17.int)("terms").notNull(),
  frequency: (0, import_mysql_core17.mysqlEnum)("frequency", ["DAILY", "WEEKLY", "MONTHLY"]).notNull(),
  interest_rate: (0, import_mysql_core17.decimal)("interest_rate", { precision: 5, scale: 2 }).notNull(),
  min_downpayment_percent: (0, import_mysql_core17.decimal)("min_downpayment_percent", { precision: 5, scale: 2 }).notNull(),
  late_fee_percentage: (0, import_mysql_core17.decimal)("late_fee_percentage", { precision: 5, scale: 2 }).notNull(),
  is_active: (0, import_mysql_core17.boolean)("is_active").default(true).notNull(),
  created_at: (0, import_mysql_core17.timestamp)("created_at").defaultNow().notNull()
});
var installmentContractsTable = (0, import_mysql_core17.mysqlTable)("installment_contracts", {
  id: uuidv7Type("id").primaryKey(),
  sale_id: uuidv7Type("sale_id").notNull(),
  customer_id: uuidv7Type("customer_id").notNull(),
  scheme_id: uuidv7Type("scheme_id").notNull(),
  guarantor_id: uuidv7Type("guarantor_id").notNull(),
  principal: (0, import_mysql_core17.decimal)("principal", { precision: 14, scale: 2 }).notNull(),
  interest_rate: (0, import_mysql_core17.decimal)("interest_rate", { precision: 5, scale: 2 }).notNull(),
  interest_amount: (0, import_mysql_core17.decimal)("interest_amount", { precision: 14, scale: 2 }).notNull(),
  total_payable: (0, import_mysql_core17.decimal)("total_payable", { precision: 14, scale: 2 }).notNull(),
  downpayment: (0, import_mysql_core17.decimal)("downpayment", { precision: 14, scale: 2 }).notNull(),
  balance: (0, import_mysql_core17.decimal)("balance", { precision: 14, scale: 2 }).notNull(),
  schedule_frequency: (0, import_mysql_core17.mysqlEnum)("schedule_frequency", ["WEEKLY", "MONTHLY"]).notNull(),
  status: (0, import_mysql_core17.mysqlEnum)("status", ["ACTIVE", "PAID_OFF", "DEFAULTED", "CANCELLED", "SUSPENDED"]).default("ACTIVE").notNull(),
  signature_image_url: (0, import_mysql_core17.varchar)("signature_image_url", { length: 500 }),
  guarantor_signature_image_url: (0, import_mysql_core17.varchar)("guarantor_signature_image_url", { length: 500 }),
  suspended_at: (0, import_mysql_core17.timestamp)("suspended_at"),
  created_at: (0, import_mysql_core17.timestamp)("created_at").defaultNow().notNull()
});
var installmentSchedulesTable = (0, import_mysql_core17.mysqlTable)("installment_schedules", {
  id: uuidv7Type("id").primaryKey(),
  contract_id: uuidv7Type("contract_id").notNull(),
  installment_number: (0, import_mysql_core17.int)("installment_number").notNull(),
  due_date: (0, import_mysql_core17.date)("due_date").notNull(),
  amount_due: (0, import_mysql_core17.decimal)("amount_due", { precision: 12, scale: 2 }).notNull(),
  amount_paid: (0, import_mysql_core17.decimal)("amount_paid", { precision: 12, scale: 2 }).default("0.00").notNull(),
  late_fee: (0, import_mysql_core17.decimal)("late_fee", { precision: 12, scale: 2 }).default("0.00").notNull(),
  status: (0, import_mysql_core17.mysqlEnum)("status", ["PENDING", "PARTIALLY_PAID", "PAID", "OVERDUE", "WAIVED"]).default("PENDING").notNull()
});
var collectionReceiptsTable = (0, import_mysql_core17.mysqlTable)("collection_receipts", {
  id: uuidv7Type("id").primaryKey(),
  receipt_no: (0, import_mysql_core17.varchar)("receipt_no", { length: 100 }).notNull().unique(),
  contract_id: uuidv7Type("contract_id").notNull(),
  customer_id: uuidv7Type("customer_id").notNull(),
  trip_id: uuidv7Type("trip_id"),
  collected_by: uuidv7Type("collected_by").notNull(),
  amount: (0, import_mysql_core17.decimal)("amount", { precision: 14, scale: 2 }).notNull(),
  payment_mode: (0, import_mysql_core17.mysqlEnum)("payment_mode", ["CASH", "CARD", "TRANSFER"]).default("CASH").notNull(),
  sms_status: (0, import_mysql_core17.mysqlEnum)("sms_status", ["PENDING", "SENT", "FAILED", "SKIPPED"]).default("PENDING").notNull(),
  idempotency_key: (0, import_mysql_core17.varchar)("idempotency_key", { length: 255 }).unique(),
  created_at: (0, import_mysql_core17.timestamp)("created_at").defaultNow().notNull()
});
var contractAdjustmentsTable = (0, import_mysql_core17.mysqlTable)("contract_adjustments", {
  id: uuidv7Type("id").primaryKey(),
  contract_id: uuidv7Type("contract_id").notNull(),
  type: (0, import_mysql_core17.mysqlEnum)("type", ["DISCOUNT", "WRITE_OFF", "PENALTY", "REBATE"]).notNull(),
  amount: (0, import_mysql_core17.decimal)("amount", { precision: 14, scale: 2 }).notNull(),
  reason: (0, import_mysql_core17.varchar)("reason", { length: 255 }).notNull(),
  created_by: uuidv7Type("created_by").notNull(),
  created_at: (0, import_mysql_core17.timestamp)("created_at").defaultNow().notNull()
});
var refundsTable = (0, import_mysql_core17.mysqlTable)("refunds", {
  id: uuidv7Type("id").primaryKey(),
  contract_id: uuidv7Type("contract_id").notNull(),
  customer_id: uuidv7Type("customer_id").notNull(),
  amount: (0, import_mysql_core17.decimal)("amount", { precision: 14, scale: 2 }).notNull(),
  reason: (0, import_mysql_core17.varchar)("reason", { length: 255 }).notNull(),
  approved_by: uuidv7Type("approved_by").notNull(),
  created_at: (0, import_mysql_core17.timestamp)("created_at").defaultNow().notNull()
});
var installmentSchemesRelations = (0, import_drizzle_orm15.relations)(installmentSchemesTable, ({ one, many }) => ({
  branch: one(branchesTable, { fields: [installmentSchemesTable.branch_id], references: [branchesTable.id] }),
  contracts: many(installmentContractsTable)
}));
var installmentContractsRelations = (0, import_drizzle_orm15.relations)(installmentContractsTable, ({ one, many }) => ({
  scheme: one(installmentSchemesTable, { fields: [installmentContractsTable.scheme_id], references: [installmentSchemesTable.id] }),
  sale: one(salesTable, { fields: [installmentContractsTable.sale_id], references: [salesTable.id] }),
  customer: one(customersTable, { fields: [installmentContractsTable.customer_id], references: [customersTable.id] }),
  guarantor: one(guarantorsTable, { fields: [installmentContractsTable.guarantor_id], references: [guarantorsTable.id] }),
  schedules: many(installmentSchedulesTable),
  receipts: many(collectionReceiptsTable)
}));
var installmentSchedulesRelations = (0, import_drizzle_orm15.relations)(installmentSchedulesTable, ({ one }) => ({
  contract: one(installmentContractsTable, { fields: [installmentSchedulesTable.contract_id], references: [installmentContractsTable.id] })
}));
var collectionReceiptsRelations = (0, import_drizzle_orm15.relations)(collectionReceiptsTable, ({ one }) => ({
  contract: one(installmentContractsTable, { fields: [collectionReceiptsTable.contract_id], references: [installmentContractsTable.id] }),
  customer: one(customersTable, { fields: [collectionReceiptsTable.customer_id], references: [customersTable.id] }),
  trip: one(tripsTable, { fields: [collectionReceiptsTable.trip_id], references: [tripsTable.id] }),
  collector: one(usersTable, { fields: [collectionReceiptsTable.collected_by], references: [usersTable.id] })
}));

// src/features/service/service.schema.ts
var import_mysql_core18 = require("drizzle-orm/mysql-core");
var import_drizzle_orm16 = require("drizzle-orm");
var returnsTable = (0, import_mysql_core18.mysqlTable)("returns", {
  id: uuidv7Type("id").primaryKey(),
  sale_id: uuidv7Type("sale_id").notNull(),
  sale_item_id: uuidv7Type("sale_item_id").notNull(),
  serial_item_id: uuidv7Type("serial_item_id"),
  type: (0, import_mysql_core18.mysqlEnum)("type", ["CUSTOMER_RETURN", "DEFECTIVE", "WARRANTY"]).notNull(),
  // Where does the returned item physically go?
  disposition: (0, import_mysql_core18.mysqlEnum)("disposition", ["RESTOCKED", "DEFECTIVE_DEPOT", "SUPPLIER_RETURNED", "WRITTEN_OFF"]).notNull(),
  reason: (0, import_mysql_core18.text)("reason").notNull(),
  refund_amount: (0, import_mysql_core18.varchar)("refund_amount", { length: 20 }).default("0.00").notNull(),
  refund_mode: (0, import_mysql_core18.mysqlEnum)("refund_mode", ["CASH", "STORE_CREDIT", "NONE"]).default("NONE").notNull(),
  processed_by: uuidv7Type("processed_by").notNull(),
  created_at: (0, import_mysql_core18.timestamp)("created_at").defaultNow().notNull()
});
var warrantyClaimsTable = (0, import_mysql_core18.mysqlTable)("warranty_claims", {
  id: uuidv7Type("id").primaryKey(),
  sale_item_id: uuidv7Type("sale_item_id").notNull(),
  customer_id: uuidv7Type("customer_id").notNull(),
  serial_item_id: uuidv7Type("serial_item_id"),
  issue_description: (0, import_mysql_core18.text)("issue_description").notNull(),
  // Lifecycle
  status: (0, import_mysql_core18.mysqlEnum)("status", ["OPEN", "ITEM_COLLECTED", "SENT_TO_SUPPLIER", "IN_REPAIR", "REPAIRED", "REPLACED", "REJECTED", "CLOSED"]).default("OPEN").notNull(),
  // Resolution
  resolution: (0, import_mysql_core18.mysqlEnum)("resolution", ["REPAIRED", "REPLACED", "REJECTED"]),
  replacement_serial_id: uuidv7Type("replacement_serial_id"),
  // If replaced with a new unit
  // Staff tracking
  processed_by: uuidv7Type("processed_by").notNull(),
  // Timestamps for timeline
  collected_at: (0, import_mysql_core18.datetime)("collected_at"),
  // When item was taken from customer
  sent_to_supplier_at: (0, import_mysql_core18.datetime)("sent_to_supplier_at"),
  received_from_supplier_at: (0, import_mysql_core18.datetime)("received_from_supplier_at"),
  resolved_at: (0, import_mysql_core18.datetime)("resolved_at"),
  created_at: (0, import_mysql_core18.timestamp)("created_at").defaultNow().notNull()
});
var returnsRelations = (0, import_drizzle_orm16.relations)(returnsTable, ({ one }) => ({
  sale: one(salesTable, { fields: [returnsTable.sale_id], references: [salesTable.id] }),
  saleItem: one(saleItemsTable, { fields: [returnsTable.sale_item_id], references: [saleItemsTable.id] }),
  serialItem: one(serialItemsTable, { fields: [returnsTable.serial_item_id], references: [serialItemsTable.id] }),
  processedBy: one(usersTable, { fields: [returnsTable.processed_by], references: [usersTable.id] })
}));
var warrantyClaimsRelations = (0, import_drizzle_orm16.relations)(warrantyClaimsTable, ({ one }) => ({
  saleItem: one(saleItemsTable, { fields: [warrantyClaimsTable.sale_item_id], references: [saleItemsTable.id] }),
  customer: one(customersTable, { fields: [warrantyClaimsTable.customer_id], references: [customersTable.id] }),
  serialItem: one(serialItemsTable, { fields: [warrantyClaimsTable.serial_item_id], references: [serialItemsTable.id] }),
  processedBy: one(usersTable, { fields: [warrantyClaimsTable.processed_by], references: [usersTable.id] }),
  replacementSerial: one(serialItemsTable, { fields: [warrantyClaimsTable.replacement_serial_id], references: [serialItemsTable.id] })
}));

// src/features/sync/sync.schema.ts
var import_mysql_core19 = require("drizzle-orm/mysql-core");
var import_drizzle_orm17 = require("drizzle-orm");
var syncConflictsTable = (0, import_mysql_core19.mysqlTable)("sync_conflicts", {
  id: uuidv7Type("id").primaryKey(),
  branch_id: uuidv7Type("branch_id").notNull(),
  user_id: uuidv7Type("user_id").notNull(),
  error_type: (0, import_mysql_core19.mysqlEnum)("error_type", ["DOUBLE_SALE", "PHANTOM_STOCK", "OVER_COLLECTION", "OTHER"]).notNull(),
  error_message: (0, import_mysql_core19.text)("error_message").notNull(),
  raw_payload: (0, import_mysql_core19.json)("raw_payload").notNull(),
  status: (0, import_mysql_core19.mysqlEnum)("status", ["PENDING", "RESOLVED", "DISCARDED"]).default("PENDING").notNull(),
  created_at: (0, import_mysql_core19.timestamp)("created_at").defaultNow().notNull(),
  resolved_at: (0, import_mysql_core19.timestamp)("resolved_at")
});
var syncConflictsRelations = (0, import_drizzle_orm17.relations)(syncConflictsTable, ({ one }) => ({
  branch: one(branchesTable, { fields: [syncConflictsTable.branch_id], references: [branchesTable.id] }),
  user: one(usersTable, { fields: [syncConflictsTable.user_id], references: [usersTable.id] })
}));

// src/features/settings/settings.schema.ts
var import_mysql_core20 = require("drizzle-orm/mysql-core");
var import_drizzle_orm18 = require("drizzle-orm");
var systemSettingsTable = (0, import_mysql_core20.mysqlTable)("system_settings", {
  setting_key: (0, import_mysql_core20.varchar)("setting_key", { length: 100 }).primaryKey(),
  setting_value: (0, import_mysql_core20.text)("setting_value"),
  updated_by: uuidv7Type("updated_by"),
  updated_at: (0, import_mysql_core20.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
});
var systemSettingsRelations = (0, import_drizzle_orm18.relations)(systemSettingsTable, ({ one }) => ({
  updatedBy: one(usersTable, { fields: [systemSettingsTable.updated_by], references: [usersTable.id] })
}));

// src/features/notifications/notifications.schema.ts
var import_mysql_core21 = require("drizzle-orm/mysql-core");
var smsTemplatesTable = (0, import_mysql_core21.mysqlTable)("sms_templates", {
  id: uuidv7Type("id").primaryKey(),
  trigger_event: (0, import_mysql_core21.mysqlEnum)("trigger_event", ["SALE_CREATED", "COLLECTION_RECEIPT", "PAYMENT_OVERDUE"]).unique().notNull(),
  body_template: (0, import_mysql_core21.text)("body_template").notNull(),
  // e.g., "Hi {{name}}, received {{amount}}. Balance: {{balance}}"
  is_active: (0, import_mysql_core21.boolean)("is_active").default(true).notNull(),
  created_at: (0, import_mysql_core21.timestamp)("created_at").defaultNow().notNull(),
  updated_at: (0, import_mysql_core21.timestamp)("updated_at").defaultNow().onUpdateNow().notNull()
});
var smsLogsTable = (0, import_mysql_core21.mysqlTable)("sms_logs", {
  id: uuidv7Type("id").primaryKey(),
  customer_id: uuidv7Type("customer_id").notNull(),
  trigger_event: (0, import_mysql_core21.mysqlEnum)("trigger_event", ["SALE_CREATED", "COLLECTION_RECEIPT", "PAYMENT_OVERDUE", "CUSTOM"]).notNull(),
  reference_id: uuidv7Type("reference_id"),
  // Can be sale_id or receipt_id
  phone_number: (0, import_mysql_core21.varchar)("phone_number", { length: 50 }).notNull(),
  message_body: (0, import_mysql_core21.text)("message_body").notNull(),
  status: (0, import_mysql_core21.mysqlEnum)("status", ["PENDING", "SENT", "FAILED"]).default("PENDING").notNull(),
  provider_response: (0, import_mysql_core21.text)("provider_response"),
  created_at: (0, import_mysql_core21.timestamp)("created_at").defaultNow().notNull(),
  sent_at: (0, import_mysql_core21.timestamp)("sent_at")
});

// src/db/index.ts
var dotenv = __toESM(require("dotenv"));
dotenv.config({ path: ".env.development" });
var dbUrl = process.env.DB_URL || "mysql://root:admin@localhost:3307/masterhousenew";
var poolConnection = import_promise.default.createPool(
  dbUrl.startsWith("mysql://") ? dbUrl : `mysql://${dbUrl}`
);
poolConnection.on("connection", (conn) => {
  conn.query("SET time_zone = '+00:00';");
});
var db = (0, import_mysql2.drizzle)(poolConnection, { schema: schema_exports, mode: "default" });

// src/db/seed.ts
var import_uuid2 = require("uuid");
var import_node_crypto = require("crypto");
var dotenv2 = __toESM(require("dotenv"));
dotenv2.config({ path: ".env.development" });
async function seed() {
  console.log("Starting seed process...");
  try {
    const branchId = (0, import_uuid2.v7)();
    await db.insert(branchesTable).values({
      id: branchId,
      name: "Colombo Main Branch",
      code: "CMB-01",
      address: "123 Galle Road, Colombo",
      is_active: true
    });
    await db.insert(branchPhonesTable).values({
      id: (0, import_uuid2.v7)(),
      branch_id: branchId,
      phone_number: "0112345678"
    });
    console.log("\u2705 Created Branch");
    const warehouseId = (0, import_uuid2.v7)();
    await db.insert(warehousesTable).values({
      id: warehouseId,
      branch_id: branchId,
      name: "Colombo Main Warehouse",
      code: "WH-CMB-01",
      address: "123 Galle Road, Colombo",
      is_active: true
    });
    console.log("\u2705 Created Warehouse");
    const roleId = (0, import_uuid2.v7)();
    await db.insert(rolesTable).values({
      id: roleId,
      name: "Super Admin",
      description: "Full system access",
      level: 100
    });
    const adminId = (0, import_uuid2.v7)();
    const salt = (0, import_node_crypto.randomBytes)(16).toString("hex");
    const derivedKey = (0, import_node_crypto.scryptSync)("password123", salt, 64).toString("hex");
    const hash = `${salt}:${derivedKey}`;
    await db.insert(usersTable).values({
      id: adminId,
      email: "admin@masterhouse.lk",
      password_hash: hash,
      first_name: "System",
      last_name: "Admin",
      role_id: roleId,
      branch_id: branchId,
      phone: "0771234567",
      is_active: true
    });
    console.log("\u2705 Created Admin User");
    const productId = (0, import_uuid2.v7)();
    await db.insert(productsTable).values({
      id: productId,
      name: "Samsung 55 inch Smart TV",
      sku: "SAM-55-TV",
      description: "4K UHD Smart TV",
      category: "Electronics",
      brand: "Samsung",
      base_price: "125000.00",
      minimum_price: "115000.00",
      is_serialized: true,
      is_active: true
    });
    console.log("\u2705 Created Product");
    const routeId = (0, import_uuid2.v7)();
    await db.insert(routesTable).values({
      id: routeId,
      branch_id: branchId,
      code: "RT-DHI",
      name: "Route 01 - Dehiwala",
      description: "Dehiwala and Mt Lavinia area",
      is_active: true
    });
    console.log("\u2705 Created Route");
    const customerId = (0, import_uuid2.v7)();
    await db.insert(customersTable).values({
      id: customerId,
      branch_id: branchId,
      route_id: routeId,
      full_name: "Kamal Perera",
      nic: "851234567V",
      mobile: "0779876543",
      address: "45 Station Road, Dehiwala",
      is_walk_in: false
    });
    const guarantorId = (0, import_uuid2.v7)();
    await db.insert(guarantorsTable).values({
      id: guarantorId,
      customer_id: customerId,
      full_name: "Nimal Silva",
      nic: "802345678V",
      mobile: "0711234567",
      address: "12 Temple Road, Mt Lavinia"
    });
    console.log("\u2705 Created Customer and Guarantor");
    const schemeId = (0, import_uuid2.v7)();
    await db.insert(installmentSchemesTable).values({
      id: schemeId,
      branch_id: branchId,
      name: "52-Week Standard Financing",
      terms: 52,
      frequency: "WEEKLY",
      interest_rate: "15.00",
      min_downpayment_percent: "10.00",
      late_fee_percentage: "5.00",
      is_active: true
    });
    console.log("\u2705 Created Installment Scheme");
    console.log("\u{1F389} Seed complete! UI testing is ready.");
    process.exit(0);
  } catch (error) {
    console.error("\u274C Seed failed:", error);
    process.exit(1);
  }
}
seed();
