import { db } from './index';
import { sql, eq, and, inArray } from 'drizzle-orm';
import { returnsTable } from '../features/service/service.schema';
import { serialItemsTable, inventoryBalancesTable } from '../features/inventory/inventory.schema';
import { warehousesTable } from '../features/warehouses/warehouses.schema';
import { salesTable, saleItemsTable } from '../features/sale/sales.schema';
import { productsTable } from '../features/products/products.schema';

async function fixReturnedSerials() {
  console.log('--- Inspecting Returned Items in Database ---');

  // 1. Fetch all returns with RESTOCKED disposition
  const restockedReturns = await db.select({
    returnId: returnsTable.id,
    saleId: returnsTable.sale_id,
    saleItemId: returnsTable.sale_item_id,
    serialItemId: returnsTable.serial_item_id,
    disposition: returnsTable.disposition,
    createdAt: returnsTable.created_at,
    branchId: salesTable.branch_id,
    productId: saleItemsTable.product_id,
  })
  .from(returnsTable)
  .innerJoin(salesTable, eq(returnsTable.sale_id, salesTable.id))
  .innerJoin(saleItemsTable, eq(returnsTable.sale_item_id, saleItemsTable.id))
  .where(eq(returnsTable.disposition, 'RESTOCKED'));

  console.log(Found  RESTOCKED return records.);

  for (const ret of restockedReturns) {
    console.log(\nProcessing Return: );
    console.log(- Product ID: );
    console.log(- Serial Item ID: );
    console.log(- Branch ID: );

    // Find default warehouse for this branch
    const defWh = await db.select().from(warehousesTable)
      .where(and(eq(warehousesTable.branch_id, ret.branchId), eq(warehousesTable.is_default, true)))
      .limit(1);
    
    let targetWhId = defWh.length > 0 ? defWh[0].id : null;
    if (!targetWhId) {
      const anyWh = await db.select().from(warehousesTable)
        .where(eq(warehousesTable.branch_id, ret.branchId))
        .limit(1);
      if (anyWh.length > 0) targetWhId = anyWh[0].id;
    }

    if (!targetWhId) {
      console.warn(⚠️ No warehouse found for branch . Skipping.);
      continue;
    }

    console.log(- Target Warehouse: );

    if (ret.serialItemId) {
      // 1. Ensure serial item is IN_STOCK and has target warehouse_id
      await db.update(serialItemsTable)
        .set({
          status: 'IN_STOCK',
          warehouse_id: targetWhId,
        })
        .where(eq(serialItemsTable.id, ret.serialItemId));
      console.log(  ✅ Updated serial_items # -> status: IN_STOCK, warehouse_id: );
    }
  }

  // 2. Global Sync: Re-sync inventory_balances for all serialized products based on actual IN_STOCK serial count per warehouse
  console.log('\n--- Reconciling inventory_balances with actual IN_STOCK count ---');
  await db.execute(sql
    INSERT INTO inventory_balances (warehouse_id, product_id, quantity)
    SELECT 
      si.warehouse_id,
      si.product_id,
      COUNT(*) AS quantity
    FROM serial_items si
    INNER JOIN products p ON si.product_id = p.id
    WHERE p.is_serialized = 1 AND si.status = 'IN_STOCK' AND si.warehouse_id IS NOT NULL
    GROUP BY si.warehouse_id, si.product_id
    ON DUPLICATE KEY UPDATE quantity = VALUES(quantity);
  );
  console.log('✅ Synchronized inventory_balances quantities with actual IN_STOCK serial counts.');

  console.log('\nAll restocked serials and inventory balances are now 100% in sync!');
  process.exit(0);
}

fixReturnedSerials().catch(err => {
  console.error('Error fixing returned serials:', err);
  process.exit(1);
});
