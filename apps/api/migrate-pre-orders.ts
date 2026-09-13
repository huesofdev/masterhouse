import { db } from './src/db';
import { sql } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import { parse } from 'uuid';

async function migrate() {
  console.log("Starting migration...");
  try {
    await db.execute(sql`DROP TABLE IF EXISTS pre_order_items`);
    // Create new table with BINARY(16)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS pre_order_items (
        id BINARY(16) PRIMARY KEY,
        pre_order_id BINARY(16) NOT NULL,
        product_id BINARY(16) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrate existing data
    const existingOrders: any = await db.execute(sql`SELECT id, product_id, quantity FROM pre_orders`);
    const rows = existingOrders[0];
    
    for (const order of rows) {
      if (order.product_id) {
        // uuidv7() returns string. We parse it to Buffer to match BINARY(16)
        const newId = Buffer.from(parse(uuidv7()));
        // order.id and order.product_id are already Buffer returned by mysql2
        await db.execute(sql`
          INSERT INTO pre_order_items (id, pre_order_id, product_id, quantity)
          VALUES (${newId}, ${order.id}, ${order.product_id}, ${order.quantity})
        `);
      }
    }

    // Drop old columns
    await db.execute(sql`ALTER TABLE pre_orders DROP COLUMN product_id`);
    await db.execute(sql`ALTER TABLE pre_orders DROP COLUMN quantity`);

    console.log("Migration completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
