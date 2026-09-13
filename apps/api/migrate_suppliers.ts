import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function columnExists(table: string, column: string): Promise<boolean> {
  const [rows] = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${table} AND COLUMN_NAME = ${column}
  `) as any;
  return rows[0].cnt > 0;
}

async function tableExists(table: string): Promise<boolean> {
  const [rows] = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${table}
  `) as any;
  return rows[0].cnt > 0;
}

async function migrate() {
  console.log("=== Suppliers + Intake Migration ===\n");

  // 1. Create suppliers table
  if (!(await tableExists('suppliers'))) {
    console.log("Creating suppliers table...");
    await db.execute(sql`
      CREATE TABLE suppliers (
        id binary(16) NOT NULL PRIMARY KEY,
        name varchar(255) NOT NULL,
        contact_person varchar(255) NULL,
        phone varchar(20) NULL,
        email varchar(255) NULL,
        address text NULL,
        notes text NULL,
        is_active tinyint(1) NOT NULL DEFAULT 1,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now() ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ suppliers table created");
  } else {
    console.log("✓ suppliers table already exists");
  }

  // 2. Add supplier_id to intake_orders
  if (!(await columnExists('intake_orders', 'supplier_id'))) {
    console.log("Adding supplier_id to intake_orders...");
    await db.execute(sql`ALTER TABLE intake_orders ADD COLUMN supplier_id binary(16) NULL AFTER warehouse_id`);
    console.log("✓ supplier_id column added");
  } else {
    console.log("✓ supplier_id already exists in intake_orders");
  }

  console.log("\n✅ Migration complete!");
  process.exit(0);
}

migrate().catch(err => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
