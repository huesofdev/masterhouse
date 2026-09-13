import { db } from './apps/api/src/db';
import { installmentContractsTable, installmentSchedulesTable, installmentSchemesTable } from './apps/api/src/features/collections/collections.schema';
import { salesTable } from './apps/api/src/features/sale/sales.schema';
import { eq, desc } from 'drizzle-orm';

async function run() {
  console.log("Fetching last 5 installment sales...");
  const recentSales = await db.select()
    .from(salesTable)
    .where(eq(salesTable.sale_type, 'INSTALLMENT'))
    .orderBy(desc(salesTable.created_at))
    .limit(5);

  if (recentSales.length === 0) {
    console.log("No installment sales found.");
    process.exit(0);
  }

  for (const sale of recentSales) {
    console.log(`\n==================================================`);
    console.log(`SALE ID: ${sale.id}`);
    console.log(`Created At: ${sale.created_at}`);
    console.log(`Total: ${sale.total}, Downpayment: ${sale.downpayment}`);

    const contract = await db.select()
      .from(installmentContractsTable)
      .where(eq(installmentContractsTable.sale_id, sale.id))
      .limit(1);

    if (contract.length === 0) {
      console.log("No installment contract record found.");
      continue;
    }

    const c = contract[0];
    console.log(`CONTRACT: Principal: ${c.principal}, Interest: ${c.interest_amount}, Total Payable: ${c.total_payable}, Downpayment: ${c.downpayment}`);

    const scheme = await db.select()
      .from(installmentSchemesTable)
      .where(eq(installmentSchemesTable.id, c.scheme_id))
      .limit(1);

    if (scheme.length > 0) {
      const s = scheme[0];
      console.log(`SCHEME: Name: ${s.name}, Terms: ${s.terms}, Min DP %: ${s.min_downpayment_percent}, Interest: ${s.interest_rate}%`);
    } else {
      console.log("Scheme record not found.");
    }

    const schedules = await db.select()
      .from(installmentSchedulesTable)
      .where(eq(installmentSchedulesTable.contract_id, c.id))
      .orderBy(installmentSchedulesTable.installment_number);

    console.log("SCHEDULES IN DATABASE:");
    for (const sch of schedules) {
      console.log(`  - Installment #${sch.installment_number}: Due: ${sch.due_date}, Amount Due: ${sch.amount_due}, Status: ${sch.status}`);
    }
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
