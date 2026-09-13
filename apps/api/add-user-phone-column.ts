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

async function runMigration() {
  console.log('[MIGRATION] Adding phone_number column to users table...');

  await addColumnSafe(
    `ALTER TABLE users ADD COLUMN phone_number VARCHAR(50) NULL DEFAULT NULL AFTER name`,
    'phone_number'
  );

  console.log('[MIGRATION] Done.');
  process.exit(0);
}

runMigration().catch(err => {
  console.error('[MIGRATION] Failed:', err);
  process.exit(1);
});
