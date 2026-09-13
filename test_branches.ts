import { db } from './apps/api/src/db';
import { installmentSchemesTable } from './apps/api/src/features/collections/collections.schema';
import { branchesTable } from './apps/api/src/features/branches/branches.schema';

async function run() {
  const schemes = await db.select().from(installmentSchemesTable);
  console.log('All Schemes in DB:');
  console.log(schemes.map(s => ({ id: s.id, name: s.name, branch_id: s.branch_id })));

  const branches = await db.select().from(branchesTable);
  console.log('\nAll Branches in DB:');
  console.log(branches.map(b => ({ id: b.id, name: b.name })));
  
  process.exit(0);
}

run();
