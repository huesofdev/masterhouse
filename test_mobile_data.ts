import { db } from './apps/api/src/db';
import { installmentSchemesTable } from './apps/api/src/features/collections/collections.schema';
import { eq, or, and, sql } from 'drizzle-orm';

async function run() {
  const branchId = '019e7cc5-f234-760f-835d-6bc7637962ed';
  
  const schemes = await db.select().from(installmentSchemesTable).where(
    and(
      eq(installmentSchemesTable.is_active, true),
      or(
        eq(installmentSchemesTable.branch_id, branchId),
        sql`${installmentSchemesTable.branch_id} IS NULL`
      )
    )
  );

  console.log('Schemes returned for branch:', branchId);
  console.log(JSON.stringify(schemes, null, 2));

  process.exit(0);
}

run();
