import { db } from './apps/api/src/db';
import { installmentSchemesTable } from './apps/api/src/features/collections/collections.schema';

async function run() {
  await db.update(installmentSchemesTable).set({ branch_id: null });
  console.log('Updated all schemes to be GLOBAL (branch_id = null)');
  process.exit(0);
}

run();
