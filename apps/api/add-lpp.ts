import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    console.log("Adding last_purchase_price column...");
    await db.execute(sql`ALTER TABLE products ADD COLUMN last_purchase_price decimal(12,2) NOT NULL DEFAULT '0.00'`);
    console.log("Success!");
    process.exit(0);
  } catch (err: any) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("Column already exists. Skipping.");
      process.exit(0);
    }
    console.error(err);
    process.exit(1);
  }
}

run();
