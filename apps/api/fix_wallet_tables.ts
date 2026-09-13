import mysql from "mysql2/promise";
import * as dotenv from 'dotenv';

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: envFile });

const dbUrl = process.env.DB_URL || "mysql://root:admin@localhost:3307/masterhousenew";

async function fixMigration() {
  console.log("Connecting to database...");
  const connection = await mysql.createConnection(dbUrl.startsWith("mysql://") ? dbUrl : `mysql://${dbUrl}`);

  try {
    console.log("Fixing staff_wallets column types...");
    await connection.query(`
      ALTER TABLE \`staff_wallets\`
      MODIFY COLUMN \`id\` BINARY(16) NOT NULL,
      MODIFY COLUMN \`user_id\` BINARY(16) NOT NULL,
      MODIFY COLUMN \`branch_id\` BINARY(16) NOT NULL;
    `);

    console.log("Fixing staff_wallet_transactions column types...");
    await connection.query(`
      ALTER TABLE \`staff_wallet_transactions\`
      MODIFY COLUMN \`id\` BINARY(16) NOT NULL,
      MODIFY COLUMN \`wallet_id\` BINARY(16) NOT NULL,
      MODIFY COLUMN \`trip_id\` BINARY(16),
      MODIFY COLUMN \`discrepancy_id\` BINARY(16);
    `);

    console.log("Fix applied successfully!");
  } catch (error) {
    console.error("Fix failed:", error);
  } finally {
    await connection.end();
  }
}

fixMigration();
