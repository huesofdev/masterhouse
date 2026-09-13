import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables (.env.development or .env)
dotenv.config({ path: path.join(__dirname, '../../.env.development') });
if (!process.env.DB_URL) {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const DB_URL = process.env.DB_URL || "mysql://root:admin@localhost:3307/masterhousenew";

// Operational and transactional tables to wipe clean:
const OPERATIONAL_TABLES = [
  // 1. Sales & Quotations
  'sale_items',
  'sales',
  'quotations',
  'orders',
  'pre_orders',

  // 2. Installments & Collections
  'installment_schedules',
  'collection_receipts',
  'collection_attempts',
  'contract_adjustments',
  'refunds',
  'installment_contracts',

  // 3. Intakes & Supplier Ledgers
  'intake_items',
  'intakes',
  'supplier_ledgers',
  'supplier_ledger',

  // 4. Customers & Guarantors
  'guarantors',
  'customers',

  // 5. Operations, Trips & Customer Ledgers
  'trip_inventory',
  'trips',
  'route_stops',
  'customer_ledgers',
  'customer_ledger',
  'inventory_adjustments',
  'inventory_transfers',
  'service_jobs',
  'expenses',
  'wallets',
  'wallet_transactions',
  'idempotency_keys',
  'sync_logs',
  'notifications'
];

async function clearOperationalData() {
  console.log(`🔌 Connecting to database: ${DB_URL.replace(/:[^:@]+@/, ':****@')}`);
  const conn = await mysql.createConnection(DB_URL);

  try {
    console.log("🔒 Disabling foreign key checks...");
    await conn.query("SET FOREIGN_KEY_CHECKS = 0;");

    // Fetch existing tables in current database
    const [rows]: any = await conn.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()`
    );

    const existingTables = new Set<string>(rows.map((r: any) => (r.TABLE_NAME || r.table_name).toLowerCase()));
    
    let wipedCount = 0;

    for (const table of OPERATIONAL_TABLES) {
      if (existingTables.has(table.toLowerCase())) {
        console.log(`🧹 Clearing operational table: ${table}...`);
        await conn.query(`TRUNCATE TABLE \`${table}\`;`);
        wipedCount++;
      } else {
        console.log(`ℹ️  Table \`${table}\` not present in database. Skipped.`);
      }
    }

    console.log(`\n✅ Successfully wiped operational data from ${wipedCount} tables!`);
    console.log(`🛡️  Master data preserved: Users, Roles, Branches, Warehouses, Products, Catalog, Suppliers, Installment Schemes, Settings.`);

  } catch (error) {
    console.error("❌ Error clearing operational data:", error);
  } finally {
    await conn.query("SET FOREIGN_KEY_CHECKS = 1;");
    await conn.end();
    process.exit(0);
  }
}

clearOperationalData();
