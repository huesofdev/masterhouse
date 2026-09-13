import { db } from './apps/api/src/db';
import { installmentSchemesTable } from './apps/api/src/features/collections/collections.schema';

async function run() {
  const res = await db.select().from(installmentSchemesTable);
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
}

run();
