import { db } from './apps/api/src/db';
import { serialItemsTable } from './apps/api/src/features/inventory/inventory.schema';
import { saleItemsTable, salesTable } from './apps/api/src/features/sale/sales.schema';
import { installmentContractsTable, collectionReceiptsTable, installmentSchedulesTable } from './apps/api/src/features/collections/collections.schema';
import { customersTable } from './apps/api/src/features/customers/customers.schema';
import { eq, like } from 'drizzle-orm';

async function check() {
  console.log("Searching for serial item matching '63903'...");
  const serials = await db.select().from(serialItemsTable).where(like(serialItemsTable.serial_number, '%63903%'));
  console.log("Found serial items:", JSON.stringify(serials, null, 2));

  for (const s of serials) {
    const saleItems = await db.select().from(saleItemsTable).where(eq(saleItemsTable.serial_item_id, s.id));
    console.log(`Sale items for serial ${s.serial_number}:`, JSON.stringify(saleItems, null, 2));

    for (const si of saleItems) {
      const sale = await db.select().from(salesTable).where(eq(salesTable.id, si.sale_id));
      console.log(`Sale detail:`, JSON.stringify(sale, null, 2));

      if (sale.length > 0) {
        if (sale[0].customer_id) {
          const cust = await db.select().from(customersTable).where(eq(customersTable.id, sale[0].customer_id));
          console.log(`Customer detail:`, JSON.stringify(cust, null, 2));
        } else {
          console.log(`Customer: null (WALK-IN)`);
        }

        const contracts = await db.select().from(installmentContractsTable).where(eq(installmentContractsTable.sale_id, sale[0].id));
        console.log(`Installment Contracts:`, JSON.stringify(contracts, null, 2));

        for (const c of contracts) {
          const receipts = await db.select().from(collectionReceiptsTable).where(eq(collectionReceiptsTable.contract_id, c.id));
          console.log(`Receipts:`, JSON.stringify(receipts, null, 2));
          const schedules = await db.select().from(installmentSchedulesTable).where(eq(installmentSchedulesTable.contract_id, c.id));
          console.log(`Schedules count: ${schedules.length}`);
        }
      }
    }
  }

  process.exit(0);
}

check().catch((err) => {
  console.error(err);
  process.exit(1);
});
