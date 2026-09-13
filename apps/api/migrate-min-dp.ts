import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Starting migration...");
  try {
    await db.execute(sql`ALTER TABLE products CHANGE min_downpayment_rate min_downpayment_amount decimal(12,2) NOT NULL DEFAULT '0.00';`);
    console.log("Migration successful!");
  } catch (error: any) {
    if (error.message?.includes("Unknown column")) {
      console.log("Column min_downpayment_rate not found. Checking if it's already renamed...");
    } else {
      console.error("Migration failed:", error);
    }
  }
  process.exit(0);
}

main();
