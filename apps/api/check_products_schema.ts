import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const [rows] = await db.execute(sql`DESCRIBE products`);
    console.log("products table schema:");
    console.log(rows);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

main();
