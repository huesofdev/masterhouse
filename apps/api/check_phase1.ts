import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function main() {
  const tables = ['branches', 'warehouses', 'users', 'roles'];
  for (const t of tables) {
    try {
      const [rows] = await db.execute(sql`DESCRIBE ${sql.identifier(t)}`);
      console.log(`\n--- ${t} schema ---`);
      console.log(rows);
    } catch (err) {
      console.error(`Error describing ${t}:`, err);
    }
  }
  process.exit(0);
}

main();
