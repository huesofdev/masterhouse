import { db } from './apps/api/src/db';
import { branchesTable } from './apps/api/src/features/branches/branches.schema';

async function run() {
  const branchInfo = await db.query.branchesTable.findFirst({
    with: { phones: true }
  });
  console.log(JSON.stringify(branchInfo, null, 2));
  process.exit(0);
}
run();
