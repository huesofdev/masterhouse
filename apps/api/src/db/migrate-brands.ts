import { db } from "./index";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Starting custom migration for brands and warranty...");

  try {
    // 1. Create brands table
    console.log("Creating brands table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS \`brands\` (
        \`id\` binary(16) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`description\` text,
        \`is_active\` boolean NOT NULL DEFAULT true,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      )
    `);

    // 2. Modify products table
    console.log("Updating products table schema...");
    await db.execute(sql`
      ALTER TABLE \`products\` 
      ADD COLUMN \`brand_id\` binary(16) NULL,
      ADD COLUMN \`warranty_type\` ENUM('WARRANTY', 'GUARANTY', 'NONE') NOT NULL DEFAULT 'NONE',
      ADD COLUMN \`warranty_period_years\` int NOT NULL DEFAULT 0,
      ADD COLUMN \`warranty_period_months\` int NOT NULL DEFAULT 0;
    `);

    // 3. Migrate existing data
    console.log("Migrating existing warranty data...");
    await db.execute(sql`
      UPDATE \`products\`
      SET 
        \`warranty_type\` = IF(\`warranty_months\` > 0, 'WARRANTY', 'NONE'),
        \`warranty_period_years\` = FLOOR(\`warranty_months\` / 12),
        \`warranty_period_months\` = \`warranty_months\` % 12
      WHERE \`warranty_months\` IS NOT NULL;
    `);

    // 4. Drop the old column
    console.log("Dropping old warranty_months column...");
    await db.execute(sql`
      ALTER TABLE \`products\` DROP COLUMN \`warranty_months\`;
    `);

    try {
      console.log("Adding foreign key constraint for brand_id...");
      await db.execute(sql`
        ALTER TABLE \`products\`
        ADD CONSTRAINT \`products_brand_id_fk\` FOREIGN KEY (\`brand_id\`) REFERENCES \`brands\`(\`id\`);
      `);
    } catch (e: any) {
      console.log("Note: Foreign key constraint could not be added. Might already exist or schema mismatch.", e.message);
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    process.exit(0);
  }
}

main();
