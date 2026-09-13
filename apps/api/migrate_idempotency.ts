import { config } from "dotenv";
import { createConnection } from "mysql2/promise";
import path from "path";

config({ path: path.join(__dirname, ".env.development") });

async function migrate() {
  const connection = await createConnection({
    uri: process.env.DB_URL,
  });

  console.log("Connected to database. Applying idempotency schema changes...");

  try {
    // 1. collection_receipts idempotency
    try {
      await connection.query(`
        ALTER TABLE collection_receipts 
        ADD COLUMN idempotency_key VARCHAR(255) NULL UNIQUE;
      `);
      console.log("Added idempotency_key to collection_receipts.");
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log("idempotency_key already exists on collection_receipts.");
      } else {
        throw e;
      }
    }

    // 2. sales idempotency
    try {
      await connection.query(`
        ALTER TABLE sales 
        ADD COLUMN idempotency_key VARCHAR(255) NULL UNIQUE;
      `);
      console.log("Added idempotency_key to sales.");
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log("idempotency_key already exists on sales.");
      } else {
        throw e;
      }
    }

    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await connection.end();
  }
}

migrate();
