import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function columnExists(table: string, column: string): Promise<boolean> {
  const [rows] = await db.execute(sql`
    SELECT COUNT(*) as cnt 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${table} AND COLUMN_NAME = ${column}
  `) as any;
  return rows[0].cnt > 0;
}

async function migrate() {
  console.log("Starting products table migration...\n");

  try {
    // 1. Add category_id
    if (!(await columnExists('products', 'category_id'))) {
      console.log("Adding category_id column...");
      await db.execute(sql`ALTER TABLE products ADD COLUMN category_id binary(16) AFTER id`);
    } else {
      console.log("✓ category_id already exists");
    }

    // 2. Add description
    if (!(await columnExists('products', 'description'))) {
      console.log("Adding description column...");
      await db.execute(sql`ALTER TABLE products ADD COLUMN description text AFTER sku`);
    } else {
      console.log("✓ description already exists");
    }

    // 3. Add base_price
    if (!(await columnExists('products', 'base_price'))) {
      console.log("Adding base_price column...");
      await db.execute(sql`ALTER TABLE products ADD COLUMN base_price decimal(12,2) NOT NULL DEFAULT 0.00 AFTER description`);
    } else {
      console.log("✓ base_price already exists");
    }

    // 4. Add uom
    if (!(await columnExists('products', 'uom'))) {
      console.log("Adding uom column...");
      await db.execute(sql`ALTER TABLE products ADD COLUMN uom enum('pieces','kg','g','l','ml','box','pack') NOT NULL DEFAULT 'pieces' AFTER base_price`);
    } else {
      console.log("✓ uom already exists");
    }

    // 5. Migrate existing category string → category_id FK
    if (await columnExists('products', 'category')) {
      console.log("\nMigrating category name → category_id FK...");
      await db.execute(sql`
        UPDATE products p
        JOIN categories c ON c.name = p.category
        SET p.category_id = c.id
        WHERE p.category_id IS NULL
      `);

      const [check] = await db.execute(sql`SELECT COUNT(*) as missing FROM products WHERE category_id IS NULL`) as any;
      console.log(`Products without matched category_id: ${check[0].missing}`);

      // 6. Drop old columns
      console.log("\nDropping old columns: category, brand, model...");
      await db.execute(sql`ALTER TABLE products DROP COLUMN category`);
      await db.execute(sql`ALTER TABLE products DROP COLUMN brand`);
      await db.execute(sql`ALTER TABLE products DROP COLUMN model`);
      console.log("✓ Old columns dropped");
    } else {
      console.log("✓ Old columns already dropped");
    }

    // 7. Make category_id NOT NULL
    const [nullCheck] = await db.execute(sql`SELECT COUNT(*) as missing FROM products WHERE category_id IS NULL`) as any;
    if (nullCheck[0].missing === 0) {
      await db.execute(sql`ALTER TABLE products MODIFY COLUMN category_id binary(16) NOT NULL`);
      console.log("✓ category_id set to NOT NULL");
    } else {
      console.warn(`⚠️  ${nullCheck[0].missing} products have no category_id — keeping nullable`);
    }

    console.log("\n✅ Migration complete! Final schema:");
    const [schema] = await db.execute(sql`DESCRIBE products`) as any;
    schema.forEach((col: any) => {
      console.log(`  ${col.Field.padEnd(25)} ${col.Type.padEnd(30)} ${col.Null === 'YES' ? 'nullable' : 'NOT NULL'}`);
    });

    process.exit(0);
  } catch (err) {
    console.error("\n❌ Migration failed:", err);
    process.exit(1);
  }
}

migrate();
