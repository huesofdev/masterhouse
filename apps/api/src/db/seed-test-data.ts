import { db } from "./index";
import { v7 as uuidv7 } from "uuid";
import { branchesTable } from "../features/branches/branches.schema";
import { warehousesTable } from "../features/warehouses/warehouses.schema";
import { productsTable } from "../features/products/products.schema";
import { inventoryBalancesTable, serialItemsTable } from "../features/inventory/inventory.schema";
import { customersTable, guarantorsTable } from "../features/customers/customers.schema";
import { installmentSchemesTable, installmentSchedulesTable, installmentContractsTable } from "../features/collections/collections.schema";
import { salesTable, saleItemsTable } from "../features/sale/sales.schema";
import { SalesService } from "../features/sale/sales.service";
import { CollectionsService } from "../features/collections/collections.service";
import { usersTable } from "../features/user/user.schema";
import { routesTable } from "../features/routes/routes.schema";
import { categoriesTable } from "../features/catalog/catalog.schema";
import { eq, asc } from "drizzle-orm";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });

async function seedTestData() {
  console.log("Starting Comprehensive Test Data Seed...");

  try {
    // 1. Fetch Admin
    const adminUsers = await db.select().from(usersTable).where(eq(usersTable.email, "admin@masterhouse.lk")).limit(1);
    if (adminUsers.length === 0) {
      throw new Error("Admin user not found. Please run seed-rbac.ts first.");
    }
    const adminId = adminUsers[0].id;

    // 2. Fetch HQ Branch
    const branches = await db.select().from(branchesTable).where(eq(branchesTable.name, "HQ (Admin Only)")).limit(1);
    if (branches.length === 0) {
      throw new Error("HQ Branch not found. Please run seed-rbac.ts first.");
    }
    const branchId = branches[0].id;

    // 3. Create Warehouses
    console.log("Setting up Warehouses & Route...");
    const mainWhId = uuidv7();
    await db.insert(warehousesTable).values({
      id: mainWhId,
      branch_id: branchId,
      name: "Main Test Warehouse",
      code: "WH-TEST-MAIN",
      address: "100 Test St, Colombo",
      is_active: true,
    });

    const routeId = uuidv7();
    await db.insert(routesTable).values({
      id: routeId,
      branch_id: branchId,
      code: "RT-TEST-01",
      name: "Test Metro Route",
      description: "Metro Area",
      is_active: true,
    });

    // 4. Create Schemes
    console.log("Creating Installment Schemes...");
    const schemes = [
      { id: uuidv7(), name: "Quick 6-Month Plan", terms: 6, freq: "MONTHLY", int: "5.00", dp: "30.00", late: "2.00" },
      { id: uuidv7(), name: "Standard 12-Month Plan", terms: 12, freq: "MONTHLY", int: "10.00", dp: "20.00", late: "5.00" },
      { id: uuidv7(), name: "Extended 24-Month Plan", terms: 24, freq: "MONTHLY", int: "15.00", dp: "15.00", late: "5.00" }
    ];
    for (const sc of schemes) {
      await db.insert(installmentSchemesTable).values({
        id: sc.id,
        branch_id: branchId,
        name: sc.name,
        terms: sc.terms,
        frequency: sc.freq as any,
        interest_rate: sc.int,
        min_downpayment_percent: sc.dp,
        late_fee_percentage: sc.late,
        is_active: true,
      });
    }
    const defaultSchemeId = schemes[1].id;

    // 5. Create Categories & Products
    console.log("Creating Catalog & Inventory...");
    const categoryIds: Record<string, string> = {};
    const catNames = ["Test Electronics", "Test Appliances", "Test Furniture"];
    for(const catName of catNames) {
      const cId = uuidv7();
      await db.insert(categoriesTable).values({ id: cId, name: catName, is_active: true });
      categoryIds[catName] = cId;
    }

    const createdProducts: { id: string; price: number; serialized: boolean; serials: string[] }[] = [];
    
    const runId = Math.random().toString(36).substring(2, 6).toUpperCase();

    for (let i = 1; i <= 20; i++) {
      const pId = uuidv7();
      const price = 50000 + (i * 5000);
      const isSerialized = i <= 15; // 15 serialized, 5 bulk

      await db.insert(productsTable).values({
        id: pId,
        name: `Test Product ${i} ${runId} - ${isSerialized ? 'PRO' : 'BULK'}`,
        sku: `TST-PRD-${1000+i}-${runId}`,
        description: `Test Product ${i}`,
        category_id: categoryIds[catNames[i % 3]],
        base_price: price.toString(),
        is_serialized: isSerialized,
        is_active: true,
      });

      const qty = 50;
      await db.insert(inventoryBalancesTable).values({
        warehouse_id: mainWhId,
        product_id: pId,
        quantity: qty,
        avg_cost: (price * 0.6).toString(),
      });

      const serials = [];
      if (isSerialized) {
        for(let j = 1; j <= qty; j++) {
          const serialId = uuidv7();
          serials.push(serialId);
          await db.insert(serialItemsTable).values({
            id: serialId,
            product_id: pId,
            warehouse_id: mainWhId,
            serial_number: `TST-SN-${i}-${j}-${runId}`,
            status: "IN_STOCK",
          });
        }
      }
      
      createdProducts.push({ id: pId, price, serialized: isSerialized, serials });
    }

    // 6. Create Customers
    console.log("Creating 20 Customers...");
    const customers = [];
    for (let i = 1; i <= 20; i++) {
      const cId = uuidv7();
      await db.insert(customersTable).values({
        id: cId,
        branch_id: branchId,
        route_id: routeId,
        full_name: `Test Customer ${i} ${runId}`,
        nic: `9${runId}${i.toString().padStart(3, '0')}V`,
        mobile: `077${runId}${i.toString().padStart(3, '0')}`,
        address: `${i} Test Street`,
        is_walk_in: false,
      });

      const gId = uuidv7();
      await db.insert(guarantorsTable).values({
        id: gId,
        customer_id: cId,
        full_name: `Test Guarantor ${i} ${runId}`,
        nic: `8${runId}${i.toString().padStart(3, '0')}V`,
        mobile: `078${runId}${i.toString().padStart(3, '0')}`,
        address: `${i} Guarantor Ave`,
      });
      customers.push({ id: cId, guarantorId: gId });
    }

    // Helper to shift dates
    const shiftDate = (date: Date, days: number) => {
      const d = new Date(date);
      d.setDate(d.getDate() + days);
      return d;
    };
    const shiftMonth = (date: Date, months: number) => {
      const d = new Date(date);
      d.setMonth(d.getMonth() + months);
      return d;
    };

    // 7. Create Sales Scenarios
    console.log("Simulating Historical Sales & Schedules...");

    const makeSale = async (custIndex: number, prodIndex: number, monthsAgo: number, scenario: string) => {
      const c = customers[custIndex];
      const p = createdProducts[prodIndex];
      const serialId = p.serialized ? p.serials.pop() : undefined; // Consume a serial

      const saleDate = shiftMonth(new Date(), -monthsAgo);

      // Create Sale using service
      const saleId = await SalesService.createSale({
        customer_id: c.id,
        sale_type: "INSTALLMENT" as const,
        payment_mode: "CASH" as const,
        subtotal: p.price,
        promotion_discount: 0,
        manual_discount: 0,
        downpayment: p.price * 0.2, // 20% down
        total: p.price,
        items: [{
          product_id: p.id,
          serial_item_id: serialId,
          quantity: 1,
          unit_price: p.price,
          line_total: p.price
        }],
        scheme_id: defaultSchemeId,
        guarantor_id: c.guarantorId,
      }, branchId, mainWhId, adminId);

      // Backdate the sale and schedules
      await db.update(salesTable).set({ created_at: saleDate }).where(eq(salesTable.id, saleId));
      
      const contracts = await db.select().from(installmentContractsTable).where(eq(installmentContractsTable.sale_id, saleId));
      const contract = contracts[0];

      const schedules = await db.select().from(installmentSchedulesTable)
        .where(eq(installmentSchedulesTable.contract_id, contract.id))
        .orderBy(asc(installmentSchedulesTable.installment_number));

      // Adjust schedule due dates relative to saleDate
      for (let i = 0; i < schedules.length; i++) {
        const sch = schedules[i];
        const newDueDate = shiftMonth(saleDate, i + 1);
        await db.update(installmentSchedulesTable).set({ due_date: newDueDate }).where(eq(installmentSchedulesTable.id, sch.id));
        sch.due_date = newDueDate; // update local object
      }

      // Apply payments based on scenario
      if (scenario === "PERFECT") {
        // Pay all past due
        for (const sch of schedules) {
          if (sch.due_date < new Date()) {
            await CollectionsService.processCollectionReceipt({
              contract_id: contract.id,
              amount: parseFloat(sch.amount_due),
              payment_mode: "CASH"
            }, adminId);
          }
        }
      } else if (scenario === "PARTIAL") {
        // Pay exactly half of the first schedule
        await CollectionsService.processCollectionReceipt({
          contract_id: contract.id,
          amount: parseFloat(schedules[0].amount_due) / 2,
          payment_mode: "CASH"
        }, adminId);
      } else if (scenario === "OVERDUE") {
        // Pay nothing, let them be overdue
      }
      
      console.log(`- Created Sale (Scenario: ${scenario}, ${monthsAgo} months ago)`);
    };

    // Scenario A: Sale 3 months ago, Perfect payer (3 installments paid)
    await makeSale(0, 0, 3, "PERFECT");
    // Scenario B: Sale exactly 1 month ago (First schedule due TODAY)
    await makeSale(1, 1, 1, "OVERDUE"); // Overdue will leave it unpaid (so it's due today)
    // Scenario C: Sale 2 months ago, Partial payer (Paid half of first month, rest overdue)
    await makeSale(2, 2, 2, "PARTIAL");
    // Scenario D: Sale 4 months ago, completely defaulted (Overdue)
    await makeSale(3, 3, 4, "OVERDUE");
    // Scenario E: Fresh sale yesterday (Due next month)
    await makeSale(4, 4, 0, "PERFECT"); // 0 months ago. Next month is due.

    // A few more random sales to bulk up the data
    await makeSale(5, 5, 2, "PERFECT");
    await makeSale(6, 6, 5, "OVERDUE");
    await makeSale(7, 7, 1, "PERFECT");
    await makeSale(8, 8, 3, "PARTIAL");
    
    console.log("🎉 Comprehensive Test Seed Complete! Run 'npm run db:push' and restart your dev server if needed.");
    process.exit(0);

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedTestData();
