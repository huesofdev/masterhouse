// Central export file for all module schemas
export * from "../features/user/user.schema";
export * from "../features/rbac/rbac.schema";
export * from "../features/branches/branches.schema";
// Phase 1 schemas
export * from '../features/warehouses/warehouses.schema';
export * from '../features/catalog/catalog.schema';
export * from "../features/vehicles/vehicles.schema";
export * from "../features/routes/routes.schema";

// Phase 2 & 3 schemas
export * from "../features/products/products.schema";
export * from "../features/suppliers/suppliers.schema";
export * from "../features/suppliers/supplier_ledger.schema";
export * from "../features/inventory/intake.schema";
export * from "../features/inventory/inventory.schema";
export * from "../features/inventory/transfers.schema";

// Phase 4 schemas
export * from "../features/operations/operations.schema";

// Phase 5 schemas
export * from "../features/customers/customers.schema";
export * from "../features/sale/sales.schema";
export * from "../features/sale/quotations.schema";
export * from "../features/collections/collections.schema";
export * from "../features/service/service.schema";
export * from "../features/assets/assets.schema";
export * from "../features/orders/orders.schema";

// Phase 6 schemas
export * from "../features/sync/sync.schema";
export * from "../features/settings/settings.schema";
export * from "../features/settings/sequences.schema";
export * from "../features/notifications/notifications.schema";

// Promotions
export * from "../features/promotions/promotions.schema";

// Expenses
export * from "../features/expenses/expenses.schema";
