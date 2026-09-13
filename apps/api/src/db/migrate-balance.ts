
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

async function runMigration() {
  const connectionString = process.env.DB_URL;
  if (!connectionString) throw new Error('DB_URL is not set');
  const connection = await mysql.createConnection(connectionString);
  try {
    await connection.query('ALTER TABLE collection_receipts ADD COLUMN balance_after_receipt decimal(14,2);');
    console.log('Column added successfully.');
  } catch(e: any) {
    console.log(e.message);
  }
  await connection.end();
}
runMigration().catch(console.error);

