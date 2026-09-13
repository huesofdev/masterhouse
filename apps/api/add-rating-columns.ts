import 'dotenv/config';
import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function addColumnSafe(ddl: string, colName: string) {
  try {
    await db.execute(sql.raw(ddl));
    console.log(`[MIGRATION] Added column: ${colName}`);
  } catch (err: any) {
    if (err?.cause?.code === 'ER_DUP_FIELDNAME' || err?.message?.includes('Duplicate column')) {
      console.log(`[MIGRATION] Column already exists, skipping: ${colName}`);
    } else {
      throw err;
    }
  }
}

async function addRatingColumns() {
  console.log('[MIGRATION] Adding rating columns to customers table...');

  await addColumnSafe(
    `ALTER TABLE customers ADD COLUMN rating DECIMAL(2,1) NULL DEFAULT NULL`,
    'rating'
  );
  await addColumnSafe(
    `ALTER TABLE customers ADD COLUMN rating_calculated_at TIMESTAMP NULL DEFAULT NULL`,
    'rating_calculated_at'
  );
  await addColumnSafe(
    `ALTER TABLE customers ADD COLUMN rating_override BOOLEAN NOT NULL DEFAULT FALSE`,
    'rating_override'
  );

  console.log('[MIGRATION] Done.');
  process.exit(0);
}

addRatingColumns().catch(err => {
  console.error('[MIGRATION] Failed:', err);
  process.exit(1);
});
