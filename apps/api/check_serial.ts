import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env') });

async function checkSerial() {
  const connection = await createConnection({
    uri: "mysql://root:admin@localhost:3307/masterhousenew1"
  });

  try {
    const [rows] = await connection.execute(
      `SELECT * FROM discrepancy_logs ORDER BY created_at DESC LIMIT 10`
    );
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

checkSerial();
