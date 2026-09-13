import mysql from "mysql2/promise";
import * as dotenv from 'dotenv';

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: envFile });

const dbUrl = process.env.DB_URL || "mysql://root:admin@localhost:3307/masterhousenew";

async function runMigration() {
  console.log("Connecting to database...");
  const connection = await mysql.createConnection(dbUrl.startsWith("mysql://") ? dbUrl : `mysql://${dbUrl}`);

  try {
    console.log("Altering discrepancy_logs status enum...");
    await connection.query(`
      ALTER TABLE \`discrepancy_logs\` 
      MODIFY COLUMN \`status\` ENUM('OPEN', 'RESOLVED', 'WAIVED', 'CHARGED_TO_WALLET') NOT NULL DEFAULT 'OPEN';
    `);

    console.log("Adding snapshot_data to discrepancy_logs...");
    // Using IF NOT EXISTS logic implicitly or just try/catch if it already exists
    try {
      await connection.query(`ALTER TABLE \`discrepancy_logs\` ADD COLUMN \`snapshot_data\` JSON;`);
    } catch (e: any) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }

    console.log("Creating staff_wallets table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`staff_wallets\` (
        \`id\` VARCHAR(36) PRIMARY KEY,
        \`user_id\` VARCHAR(36) NOT NULL,
        \`branch_id\` VARCHAR(36) NOT NULL,
        \`balance\` DECIMAL(12,2) NOT NULL DEFAULT '0.00',
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    console.log("Creating staff_wallet_transactions table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`staff_wallet_transactions\` (
        \`id\` VARCHAR(36) PRIMARY KEY,
        \`wallet_id\` VARCHAR(36) NOT NULL,
        \`trip_id\` VARCHAR(36),
        \`discrepancy_id\` VARCHAR(36),
        \`type\` ENUM('CASH_SHORTAGE', 'STOCK_SHORTAGE', 'REPAYMENT', 'SALARY_DEDUCTION', 'OTHER') NOT NULL,
        \`amount\` DECIMAL(12,2) NOT NULL,
        \`description\` TEXT NOT NULL,
        \`snapshot_data\` JSON,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await connection.end();
  }
}

runMigration();
