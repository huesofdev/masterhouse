import { db } from "./index";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Fixing brands table and products brand_id column type...");

  try {
    // 1. Drop the foreign key constraint first
    console.log("Dropping foreign key...");
    try {
      await db.execute(sql`ALTER TABLE \`products\` DROP FOREIGN KEY \`products_brand_id_fk\``);
    } catch (e: any) {
      console.log("FK not found or already dropped.");
    }

    // 2. Change column types
    console.log("Changing column types to binary(16)...");
    await db.execute(sql`ALTER TABLE \`brands\` MODIFY COLUMN \`id\` binary(16) NOT NULL`);
    await db.execute(sql`ALTER TABLE \`products\` MODIFY COLUMN \`brand_id\` binary(16) NULL`);

    // 3. Re-add foreign key constraint
    console.log("Re-adding foreign key constraint...");
    await db.execute(sql`
      ALTER TABLE \`products\`
      ADD CONSTRAINT \`products_brand_id_fk\` FOREIGN KEY (\`brand_id\`) REFERENCES \`brands\`(\`id\`)
    `);

    console.log("Fix completed successfully!");
  } catch (error) {
    console.error("Fix failed:", error);
  } finally {
    process.exit(0);
  }
}

main();
