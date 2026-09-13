import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    await db.execute(sql`ALTER TABLE products DROP COLUMN type;`);
    console.log("Successfully dropped 'type' column.");
  } catch (err) {
    console.error("Column might not exist or drop failed:", err);
  }
  process.exit(0);
}

main();
