import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, 'apps/api/.env.development') });

import { OperationsService } from './apps/api/src/features/operations/operations.service';

async function run() {
  // Try to fetch for trip 'test' or find a valid trip first
  const { db } = require('./apps/api/src/db');
  const { tripsTable } = require('./apps/api/src/features/operations/operations.schema');
  
  const trip = await db.select().from(tripsTable).limit(1);
  if (trip.length > 0) {
    const data = await OperationsService.getMobileData(trip[0].id, trip[0].branch_id);
    console.log(JSON.stringify(data.branch, null, 2));
  } else {
    console.log("No trips found in DB");
  }
  process.exit(0);
}
run();
