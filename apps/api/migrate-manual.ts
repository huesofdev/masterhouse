import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Running manual migration...');

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key varchar(100) PRIMARY KEY,
        setting_value text,
        updated_by binary(16),
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Created system_settings table successfully.');
  } catch (e) {
    console.error('Error creating table:', e);
  }

  process.exit(0);
}

main();
