import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, 'apps/api/.env.development') });

import { db } from './apps/api/src/db';
import { branchesTable, branchPhonesTable } from './apps/api/src/features/branches/branches.schema';
import { eq } from 'drizzle-orm';
async function run() {
  const allPhones = await db.select().from(branchPhonesTable);
  console.log("DATABASE IN USE:", process.env.DB_URL);
  console.log(JSON.stringify(allPhones, null, 2));
  process.exit(0);
}
run();
