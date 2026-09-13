import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Adding type column to products table...");
  try {
    await db.execute(sql`ALTER TABLE products ADD COLUMN type ENUM('bulk', 'serial') NOT NULL DEFAULT 'bulk';`);
    console.log("Successfully added type column to products.");
  } catch (err: any) {
    if (err.message.includes("Duplicate column name")) {
      console.log("Column 'type' already exists.");
    } else {
      console.error("Error adding column:", err);
    }
  }
  process.exit(0);
}

main();
