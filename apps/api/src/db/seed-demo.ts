import { db } from "./index";
import { v7 as uuidv7 } from "uuid";
import { branchesTable, branchPhonesTable } from "../features/branches/branches.schema";
import { warehousesTable } from "../features/warehouses/warehouses.schema";
import { productsTable } from "../features/products/products.schema";
import { inventoryBalancesTable, serialItemsTable } from "../features/inventory/inventory.schema";
import { customersTable, guarantorsTable } from "../features/customers/customers.schema";
import { installmentSchemesTable, installmentSchedulesTable, installmentContractsTable } from "../features/collections/collections.schema";
import { SalesService } from "../features/sale/sales.service";
import { CollectionsService } from "../features/collections/collections.service";
import { usersTable } from "../features/user/user.schema";
import { routesTable } from "../features/routes/routes.schema";
import { categoriesTable } from "../features/catalog/catalog.schema";
import { eq, asc } from "drizzle-orm";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });

async function seedDemo() {
  console.log("Starting Demo Data Seed...");

  try {
    // Check for admin
    const adminUsers = await db.select().from(usersTable).where(eq(usersTable.email, "admin@masterhouse.lk")).limit(1);
    if (adminUsers.length === 0) {
      throw new Error("Admin user not found. Please run seed-rbac.ts first.");
    }
    const adminId = adminUsers[0].id;

    // 1. Fetch HQ Branch & Create Warehouse
    console.log("Fetching HQ Branch and Creating Warehouse...");
    const branches = await db.select().from(branchesTable).where(eq(branchesTable.name, "HQ (Admin Only)")).limit(1);
    if (branches.length === 0) {
      throw new Error("HQ Branch not found. Please run seed-rbac.ts first.");
    }
    const branchId = branches[0].id;

    const warehouseId = uuidv7();
    await db.insert(warehousesTable).values({
      id: warehouseId,
      branch_id: branchId,
      name: "Demo Backroom",
      code: "WH-DEMO-01",
      address: "456 Demo Avenue",
      is_active: true,
    });

    const routeId = uuidv7();
    await db.insert(routesTable).values({
      id: routeId,
      branch_id: branchId,
      code: "DEMO-RT-01",
      name: "Demo Route",
      description: "Demo Route Area",
      is_active: true,
    });

    // 2. Installment Scheme
    const schemeId = uuidv7();
    await db.insert(installmentSchemesTable).values({
      id: schemeId,
      branch_id: branchId,
      name: "Demo 12-Month Plan",
      terms: 12,
      frequency: "MONTHLY",
      interest_rate: "10.00",
      min_downpayment_percent: "20.00",
      late_fee_percentage: "5.00",
      is_active: true,
    });

    // 3. Products & Inventory
    console.log("Creating Categories & 30 Products...");
    
    const categoryIds: Record<string, string> = {};
    const catNames = ["Electronics", "Appliances", "Furniture", "Small Appliances", "Electricals"];
    for(const catName of catNames) {
      const cId = uuidv7();
      await db.insert(categoriesTable).values({ id: cId, name: catName, is_active: true });
      categoryIds[catName] = cId;
    }

    const demoProducts = [
      { name: "LG 65' 4K Smart TV", category: "Electronics", price: 150000, serialized: true },
      { name: "Samsung 55' 4K TV", category: "Electronics", price: 120000, serialized: true },
      { name: "Sony 50' LED TV", category: "Electronics", price: 95000, serialized: true },
      { name: "Hisense 43' Smart TV", category: "Electronics", price: 75000, serialized: true },
      { name: "Panasonic 32' LED TV", category: "Electronics", price: 45000, serialized: true },
      
      { name: "Whirlpool 2-Door Fridge", category: "Appliances", price: 110000, serialized: true },
      { name: "Samsung Inverter Fridge", category: "Appliances", price: 135000, serialized: true },
      { name: "LG Side-by-Side Fridge", category: "Appliances", price: 250000, serialized: true },
      { name: "Beko Single Door Fridge", category: "Appliances", price: 65000, serialized: true },
      { name: "Innovex Mini Fridge", category: "Appliances", price: 35000, serialized: true },
      
      { name: "Samsung 7kg Washing Machine", category: "Appliances", price: 85000, serialized: true },
      { name: "LG 9kg Front Load Washer", category: "Appliances", price: 145000, serialized: true },
      { name: "Whirlpool 6kg Washer", category: "Appliances", price: 70000, serialized: true },
      { name: "Panasonic 8kg Top Load", category: "Appliances", price: 90000, serialized: true },
      { name: "Beko 10kg Washer/Dryer", category: "Appliances", price: 180000, serialized: true },

      { name: "Premium Teak Sofa Set", category: "Furniture", price: 120000, serialized: false },
      { name: "Modern L-Shape Fabric Sofa", category: "Furniture", price: 95000, serialized: false },
      { name: "Queen Size Wooden Bed", category: "Furniture", price: 65000, serialized: false },
      { name: "King Size Spring Mattress", category: "Furniture", price: 55000, serialized: false },
      { name: "6-Seater Glass Dining Table", category: "Furniture", price: 85000, serialized: false },

      { name: "Philips Iron", category: "Small Appliances", price: 4500, serialized: false },
      { name: "Panasonic Rice Cooker 1.8L", category: "Small Appliances", price: 8500, serialized: false },
      { name: "Black+Decker Blender", category: "Small Appliances", price: 12000, serialized: false },
      { name: "Kenwood Stand Mixer", category: "Small Appliances", price: 35000, serialized: false },
      { name: "Sharp Microwave Oven 20L", category: "Small Appliances", price: 25000, serialized: false },

      { name: "KDK Ceiling Fan", category: "Electricals", price: 15000, serialized: false },
      { name: "Orient Stand Fan", category: "Electricals", price: 8500, serialized: false },
      { name: "Orange Wall Fan", category: "Electricals", price: 6500, serialized: false },
      { name: "Sony Home Theater 5.1", category: "Electronics", price: 65000, serialized: true },
      { name: "JBL PartyBox 100", category: "Electronics", price: 85000, serialized: true },
    ];

    let productId1 = "";
    let firstSerialId = "";

    for (let i = 0; i < demoProducts.length; i++) {
      const p = demoProducts[i];
      const pId = uuidv7();
      
      if (i === 0) {
        productId1 = pId;
      }

      await db.insert(productsTable).values({
        id: pId,
        name: p.name,
        sku: `DEMO-${i+100}`,
        description: `Demo product for ${p.name}`,
        category_id: categoryIds[p.category],
        base_price: p.price.toString(),
        is_serialized: p.serialized,
        is_active: true,
      });

      const qty = p.serialized ? 5 : 20;
      await db.insert(inventoryBalancesTable).values({
        warehouse_id: warehouseId,
        product_id: pId,
        quantity: qty,
        avg_cost: (p.price * 0.7).toString(),
      });

      if (p.serialized) {
        for(let j = 1; j <= qty; j++) {
          const serialId = uuidv7();
          if (i === 0 && j === 1) firstSerialId = serialId;
          await db.insert(serialItemsTable).values({
            id: serialId,
            product_id: pId,
            warehouse_id: warehouseId,
            serial_number: `SN-DEMO-00${j}-${i}`,
            status: "IN_STOCK",
          });
        }
      }
    }

    // 4. Customers
    console.log("Creating Customers...");
    const customerId1 = uuidv7();
    await db.insert(customersTable).values({
      id: customerId1,
      branch_id: branchId,
      route_id: routeId,
      full_name: "Demo Customer One",
      nic: "801234567V",
      mobile: "0771111111",
      address: "111 First Demo St",
      is_walk_in: false,
    });

    const guarantorId = uuidv7();
    await db.insert(guarantorsTable).values({
      id: guarantorId,
      customer_id: customerId1,
      full_name: "Demo Guarantor One",
      nic: "809876543V",
      mobile: "0772222222",
      address: "222 Second Demo St",
    });

    console.log("✅ Created Installment Scheme");

    // 8. Settings
    const { systemSettingsTable } = require("../features/settings/settings.schema");
    await db.insert(systemSettingsTable).values([
      { setting_key: "downpayment_partial_recovery_days_max", setting_value: "14", updated_by: adminId }
    ]);
    console.log("✅ Created System Settings");

    // 5. Create Installment Sale
    console.log("Processing Installment Sale...");
    const salePayload = {
      customer_id: customerId1,
      sale_type: "INSTALLMENT" as const,
      payment_mode: "CASH" as const,
      subtotal: 150000,
      downpayment: 30000,
      total: 150000,
      items: [{
        product_id: productId1,
        serial_item_id: firstSerialId,
        quantity: 1,
        unit_price: 150000,
        line_total: 150000
      }],
      scheme_id: schemeId,
      guarantor_id: guarantorId,
    };

    const saleResult = await SalesService.createSale(salePayload, branchId, warehouseId, adminId);
    const saleId = (typeof saleResult === 'object' && saleResult !== null) ? (saleResult as any).id : saleResult;
    console.log(`✅ Installment Sale Created (ID: ${saleId})`);

    // 6. Force a schedule to be overdue for testing
    // We need to fetch the schedules for this sale's contract
    const contracts = await db.select()
      .from(installmentContractsTable)
      .where(eq(installmentContractsTable.sale_id, saleId));
      
    const contract = contracts[0];
    if (contract) {
      const schedules = await db.select()
        .from(installmentSchedulesTable)
        .where(eq(installmentSchedulesTable.contract_id, contract.id))
        .orderBy(asc(installmentSchedulesTable.installment_number));
      console.log("Simulating overdue and partial payments...");
      
      const firstSchedule = schedules[0];
      const secondSchedule = schedules[1];

      // Pay the first schedule completely
      await CollectionsService.processCollectionReceipt({
        contract_id: contract.id,
        amount: parseFloat(firstSchedule.amount_due),
        payment_mode: "CASH",
        trip_id: undefined,
      }, adminId, branchId);
      console.log("✅ Processed full payment for Schedule 1");

      // Make the second schedule overdue manually (set due date to yesterday)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 2); // 2 days ago
      await db.update(installmentSchedulesTable)
        .set({ due_date: yesterday, status: "PENDING" })
        .where(eq(installmentSchedulesTable.id, secondSchedule.id));
      
      console.log("✅ Made Schedule 2 overdue for cron testing");
    }

    console.log("🎉 Demo Seed complete! You now have a branch, warehouse, active stock, a customer, and a live overdue contract.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Demo Seed failed:", error);
    process.exit(1);
  }
}

seedDemo();
