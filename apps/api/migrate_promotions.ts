import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Migrating database for Promotions & Discount Engine...");

  try {
    console.log("Adding max_discount_percentage to users...");
    await db.execute(sql`ALTER TABLE users ADD COLUMN max_discount_percentage decimal(5,2) NOT NULL DEFAULT '0.00';`);
  } catch (err: any) {
    if (err.message?.includes("Duplicate column name")) {
      console.log("Column 'max_discount_percentage' already exists.");
    } else {
      console.error("Error adding max_discount_percentage:", err);
    }
  }

  try {
    console.log("Creating promotions table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS promotions (
        id binary(16) NOT NULL PRIMARY KEY,
        name varchar(255) NOT NULL,
        description varchar(255),
        start_date timestamp NOT NULL,
        end_date timestamp NOT NULL,
        discount_type enum('PERCENTAGE','FIXED') NOT NULL,
        discount_value decimal(14,2) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_by binary(16) NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_promotions_created_by FOREIGN KEY (created_by) REFERENCES users(id)
      );
    `);
  } catch (err: any) {
    console.error("Error creating promotions table:", err);
  }

  try {
    console.log("Adding fields to sales table...");
    await db.execute(sql`ALTER TABLE sales ADD COLUMN promotion_id binary(16) DEFAULT NULL;`);
  } catch (err: any) {
    if (!err.message?.includes("Duplicate column name")) console.error("Error adding promotion_id:", err);
  }

  try {
    await db.execute(sql`ALTER TABLE sales ADD CONSTRAINT fk_sales_promotion_id FOREIGN KEY (promotion_id) REFERENCES promotions(id);`);
  } catch (err: any) {
    if (!err.message?.includes("Duplicate key name")) console.error("Error adding fk_sales_promotion_id:", err);
  }

  try {
    await db.execute(sql`ALTER TABLE sales ADD COLUMN promotion_discount decimal(14,2) NOT NULL DEFAULT '0.00';`);
  } catch (err: any) {
    if (!err.message?.includes("Duplicate column name")) console.error("Error adding promotion_discount:", err);
  }

  try {
    await db.execute(sql`ALTER TABLE sales ADD COLUMN manual_discount decimal(14,2) NOT NULL DEFAULT '0.00';`);
  } catch (err: any) {
    if (!err.message?.includes("Duplicate column name")) console.error("Error adding manual_discount:", err);
  }

  console.log("Migration complete!");
  process.exit(0);
}

main();
