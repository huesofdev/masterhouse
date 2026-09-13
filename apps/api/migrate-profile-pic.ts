import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Adding profile_picture_url to users table...");
  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN profile_picture_url VARCHAR(500) NULL;`);
    console.log("Successfully added profile_picture_url column.");
  } catch (error: any) {
    if (error.message.includes("Duplicate column name")) {
      console.log("Column already exists. Skipping.");
    } else {
      console.error("Migration failed:", error);
    }
  }
  process.exit(0);
}

main();
