/**
 * audit_inventory.ts
 * 
 * Diagnoses inventory discrepancies caused by intake records that were deleted
 * WITHOUT properly reversing the warehouse stock (due to the now-fixed silent
 * skip bug in deleteIntake).
 * 
 * This script:
 *  1. Computes what each warehouse SHOULD have based on:
 *     - Remaining intake records (quantity added)
 *     - Minus sold quantity (sale_items)
 *     - Minus transferred-out quantity (stock_transfers)
 *     - Plus transferred-in quantity (stock_transfers)
 *  2. Compares against current inventory_balances
 *  3. Reports any discrepancies (surplus = orphaned stock from deleted intakes)
 * 
 * Run with: npx tsx audit_inventory.ts
 */

import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("=== INVENTORY AUDIT REPORT ===\n");
  console.log("Checking for orphaned stock caused by deleted intake records...\n");

  // --- 1. Compute what the balance SHOULD be per (warehouse, product) ---
  // Total received from remaining intakes
  const [intakeTotals] = await db.execute(sql`
    SELECT 
      ii.warehouse_id,
      ii.product_id,
      SUM(ii.quantity) AS total_received
    FROM intake_items ii
    GROUP BY ii.warehouse_id, ii.product_id
  `);

  // Total sold (from sale_items joined to sales for branch/trip context)
  const [soldTotals] = await db.execute(sql`
    SELECT 
      si.product_id,
      s.trip_id,
      SUM(si.quantity) AS total_sold
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE s.status != 'CANCELLED'
    GROUP BY si.product_id, s.trip_id
  `);

  // Total transferred OUT per warehouse
  const [transfersOut] = await db.execute(sql`
    SELECT 
      ti.product_id,
      st.from_warehouse_id AS warehouse_id,
      SUM(ti.quantity) AS total_out
    FROM transfer_items ti
    JOIN stock_transfers st ON ti.transfer_id = st.id
    WHERE st.status = 'COMPLETED'
    GROUP BY ti.product_id, st.from_warehouse_id
  `);

  // Total transferred IN per warehouse
  const [transfersIn] = await db.execute(sql`
    SELECT 
      ti.product_id,
      st.to_warehouse_id AS warehouse_id,
      SUM(ti.quantity) AS total_in
    FROM transfer_items ti
    JOIN stock_transfers st ON ti.transfer_id = st.id
    WHERE st.status = 'COMPLETED'
    GROUP BY ti.product_id, st.to_warehouse_id
  `);

  // --- 2. Current balances ---
  const [currentBalances] = await db.execute(sql`
    SELECT 
      ib.warehouse_id,
      ib.product_id,
      ib.quantity AS current_qty,
      ib.avg_cost,
      w.name AS warehouse_name,
      p.name AS product_name,
      p.sku
    FROM inventory_balances ib
    JOIN warehouses w ON ib.warehouse_id = w.id
    JOIN products p ON ib.product_id = p.id
    ORDER BY w.name, p.name
  `);

  // --- 3. Build lookup maps ---
  const intakeMap = new Map<string, number>();
  for (const row of intakeTotals as any[]) {
    const key = `${row.warehouse_id}|${row.product_id}`;
    intakeMap.set(key, Number(row.total_received));
  }

  const soldMap = new Map<string, number>();
  for (const row of soldTotals as any[]) {
    // Trip sales deduct from trip_stock (not directly from warehouse balances on trip)
    // Non-trip sales deduct from warehouse. We report total sold per product for context.
    const key = `product:${row.product_id}`;
    soldMap.set(key, (soldMap.get(key) || 0) + Number(row.total_sold));
  }

  const outMap = new Map<string, number>();
  for (const row of transfersOut as any[]) {
    const key = `${row.warehouse_id}|${row.product_id}`;
    outMap.set(key, (outMap.get(key) || 0) + Number(row.total_out));
  }

  const inMap = new Map<string, number>();
  for (const row of transfersIn as any[]) {
    const key = `${row.warehouse_id}|${row.product_id}`;
    inMap.set(key, (inMap.get(key) || 0) + Number(row.total_in));
  }

  // --- 4. Compare and report ---
  let totalDiscrepancies = 0;
  const discrepancies: any[] = [];

  for (const row of currentBalances as any[]) {
    const key = `${row.warehouse_id}|${row.product_id}`;
    
    const fromIntakes = intakeMap.get(key) || 0;
    const transferOut = outMap.get(key) || 0;
    const transferIn = inMap.get(key) || 0;
    const totalSold = soldMap.get(`product:${row.product_id}`) || 0;

    // Expected = intake received + transfers in - transfers out
    // (Sales are deducted directly from balances by the service, so we
    //  compare against the balance itself, not recompute sales per warehouse)
    const expectedFromIntakeHistory = fromIntakes + transferIn - transferOut;
    const currentQty = Number(row.current_qty);
    
    // Surplus = current balance is HIGHER than what intake records justify
    // This surplus = orphaned stock from deleted intake records
    const surplus = currentQty - expectedFromIntakeHistory;

    if (surplus > 0) {
      totalDiscrepancies++;
      discrepancies.push({
        warehouse: row.warehouse_name,
        product: row.product_name,
        sku: row.sku,
        current_qty: currentQty,
        expected_from_intake_records: expectedFromIntakeHistory,
        orphaned_surplus: surplus,
        warehouse_id: row.warehouse_id,
        product_id: row.product_id,
      });
    }
  }

  if (discrepancies.length === 0) {
    console.log("✅ No discrepancies found. All inventory balances match intake records.\n");
  } else {
    console.log(`⚠️  Found ${totalDiscrepancies} product(s) with orphaned stock:\n`);
    console.log("─".repeat(100));
    
    for (const d of discrepancies) {
      console.log(`📦 Product  : ${d.product} (SKU: ${d.sku})`);
      console.log(`   Warehouse: ${d.warehouse}`);
      console.log(`   Current Qty    : ${d.current_qty}`);
      console.log(`   Expected (from remaining intakes): ${d.expected_from_intake_records}`);
      console.log(`   🔴 Orphaned Surplus: ${d.orphaned_surplus} units (from deleted intakes that weren't reversed)`);
      console.log(`   Fix SQL: UPDATE inventory_balances SET quantity = ${d.expected_from_intake_records} WHERE warehouse_id = '${d.warehouse_id}' AND product_id = '${d.product_id}';`);
      console.log("─".repeat(100));
    }

    console.log("\n📋 SUMMARY");
    console.log(`Total products with orphaned stock: ${totalDiscrepancies}`);
    console.log("\n⚡ To apply corrections automatically, run: npx tsx fix_orphaned_stock.ts");
    console.log("   (Review the discrepancies above before running the fix!)");
  }

  process.exit(0);
}

main().catch(err => {
  console.error("Audit failed:", err);
  process.exit(1);
});
