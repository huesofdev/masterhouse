import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const [cats] = await db.execute(sql`SELECT * FROM categories LIMIT 5`);
    console.log("categories:");
    console.log(cats);

    const [prods] = await db.execute(sql`SELECT * FROM products LIMIT 5`);
    console.log("products:");
    console.log(prods);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

main();
