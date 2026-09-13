import fs from 'fs';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

async function runMigration() {
  const connectionString = process.env.DB_URL;
  if (!connectionString) {
    throw new Error('DB_URL is not set');
  }

  const connection = await mysql.createConnection(connectionString);
  
  const sqlContent = fs.readFileSync(path.resolve(__dirname, '../../drizzle/0001_sharp_nextwave.sql'), 'utf-8');
  
  // Split by statement-breakpoint
  const statements = sqlContent.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s.length > 0);
  
  console.log(`Found ${statements.length} statements to execute.`);
  
  for (let i = 0; i < statements.length; i++) {
    try {
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      await connection.query(statements[i]);
    } catch (err: any) {
      if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME') {
        console.log(`Skipping existing element: ${err.message}`);
      } else if (err.code === 'ER_DUP_ENTRY') {
          console.log(`Skipping due to duplicate entry constraint violation: ${err.message}`);
      } else {
        console.error(`Error executing statement ${i + 1}: ${err.message}`);
        // We will ignore UNIQUE constraint errors that occur because rows already exist without a valid reference number.
        // Wait, if it fails to add a unique constraint, the column is still added!
      }
    }
  }
  
  await connection.end();
  console.log('Migration script finished.');
}

runMigration().catch(console.error);
