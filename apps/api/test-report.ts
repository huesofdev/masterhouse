import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function run() {
  const saleIds = [
    "019e9242-0d7b-76dc-8793-8dd3ebb7f61a",
    "019e9242-0c84-7796-af3b-6001c448797b",
    "019e9242-0e2b-759c-9bdb-e259040addbd"
  ];
  const items = await db.execute(sql`SELECT count(*) FROM sale_items WHERE hex(sale_id) IN ('019E92420D7B76DC87938DD3EBB7F61A', '019E92420C847796AF3B6001C448797B', '019E92420E2B759C9BDBE259040ADDBD')`);
  console.log(items[0]);
  process.exit(0);
}

run();
