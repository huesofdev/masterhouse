import { db } from './apps/api/src/db';
import { installmentSchemesTable } from './apps/api/src/features/collections/collections.schema';

async function run() {
  await db.update(installmentSchemesTable).set({ branch_id: '019e7cc5-f234-760f-835d-6bc7637962ed' });
  console.log('Reverted scheme to HQ branch');
  process.exit(0);
}

run();
