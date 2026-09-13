import { db } from "./index";
import { v7 as uuidv7 } from "uuid";
import { scryptSync, randomBytes } from "node:crypto";
import { branchesTable, branchPhonesTable } from "../features/branches/branches.schema";
import { warehousesTable } from "../features/warehouses/warehouses.schema";
import { rolesTable, permissionsTable, rolePermissionsTable } from "../features/rbac/rbac.schema";
import { usersTable } from "../features/user/user.schema";
import { productsTable } from "../features/products/products.schema";
import { routesTable } from "../features/routes/routes.schema";
import { customersTable, guarantorsTable } from "../features/customers/customers.schema";
import { installmentSchemesTable } from "../features/collections/collections.schema";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });

async function seed() {
  console.log("Starting seed process...");

  try {
    // 1. Branch
    const branchId = uuidv7();
    await db.insert(branchesTable).values({
      id: branchId,
      name: "Colombo Main Branch",
      code: "CMB-01",
      address: "123 Galle Road, Colombo",
      is_active: true,
    } as any);

    await db.insert(branchPhonesTable).values({
      id: uuidv7(),
      branch_id: branchId,
      phone_number: "0112345678",
    });
    console.log("✅ Created Branch");

    // 2. Warehouse
    const warehouseId = uuidv7();
    await db.insert(warehousesTable).values({
      id: warehouseId,
      branch_id: branchId,
      name: "Colombo Main Warehouse",
      code: "WH-CMB-01",
      address: "123 Galle Road, Colombo",
      is_active: true,
    });
    console.log("✅ Created Warehouse");

    // 3. Role & User
    const roleId = uuidv7();
    await db.insert(rolesTable).values({
      id: roleId,
      name: "Super Admin",
      description: "Full system access",
      level: 100,
    });

    const adminId = uuidv7();
    const salt = randomBytes(16).toString("hex");
    const derivedKey = scryptSync("password123", salt, 64).toString("hex");
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
      is_active: true,
    });
    console.log("✅ Created Admin User");

    // 4. Products
    const productId = uuidv7();
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
      is_active: true,
    });
    console.log("✅ Created Product");

    // 5. Route
    const routeId = uuidv7();
    await db.insert(routesTable).values({
      id: routeId,
      branch_id: branchId,
      code: "RT-DHI",
      name: "Route 01 - Dehiwala",
      description: "Dehiwala and Mt Lavinia area",
      is_active: true,
    });
    console.log("✅ Created Route");

    // 6. Customers
    const customerId = uuidv7();
    await db.insert(customersTable).values({
      id: customerId,
      branch_id: branchId,
      route_id: routeId,
      full_name: "Kamal Perera",
      nic: "851234567V",
      mobile: "0779876543",
      address: "45 Station Road, Dehiwala",
      is_walk_in: false,
    });

    const guarantorId = uuidv7();
    await db.insert(guarantorsTable).values({
      id: guarantorId,
      customer_id: customerId,
      full_name: "Nimal Silva",
      nic: "802345678V",
      mobile: "0711234567",
      address: "12 Temple Road, Mt Lavinia",
    });
    console.log("✅ Created Customer and Guarantor");

    // 7. Installment Scheme
    const schemeId = uuidv7();
    await db.insert(installmentSchemesTable).values({
      id: schemeId,
      branch_id: branchId,
      name: "52-Week Standard Financing",
      terms: 52,
      frequency: "WEEKLY",
      interest_rate: "15.00",
      min_downpayment_percent: "10.00",
      late_fee_percentage: "5.00",
      is_active: true,
    });
    console.log("✅ Created Installment Scheme");

    // 8. Settings
    const { systemSettingsTable } = require("../features/settings/settings.schema");
    await db.insert(systemSettingsTable).values([
      { setting_key: "downpayment_partial_recovery_days_max", setting_value: "14", updated_by: adminId }
    ]);
    console.log("✅ Created System Settings");

    console.log("🎉 Seed complete! UI testing is ready.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seed();
