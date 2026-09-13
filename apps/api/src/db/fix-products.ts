import { db } from "./index";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Adding image_url column to products...");
  try {
    await db.execute(sql`ALTER TABLE products ADD COLUMN image_url VARCHAR(1000) NULL;`);
    console.log("Successfully added image_url column.");
  } catch (error: any) {
    if (error.message.includes("Duplicate column name")) {
      console.log("Column image_url already exists.");
    } else {
      console.error("Error:", error);
    }
  }
  process.exit(0);
}

main();
