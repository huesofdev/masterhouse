import mysql from "mysql2/promise";
import * as dotenv from 'dotenv';
import * as fs from 'fs';

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
} else {
  dotenv.config(); // fallback to .env
}

const dbUrl = process.env.DB_URL || "mysql://root:admin@localhost:3307/masterhousenew";

async function run() {
  console.log("Connecting to database using:", dbUrl);
  const connection = await mysql.createConnection(
    dbUrl.startsWith("mysql://") ? dbUrl : `mysql://${dbUrl}`
  );

  try {
    console.log("Creating route_areas table if not exists...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS route_areas (
        id binary(16) NOT NULL PRIMARY KEY,
        route_id binary(16) NOT NULL,
        name varchar(255) NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);
    console.log("route_areas table verified.");

    // Check if area_id column exists in customers table
    console.log("Checking if area_id column exists in customers table...");
    const [columns]: any = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'customers' AND COLUMN_NAME = 'area_id'
    `);

    if (columns.length === 0) {
      console.log("Adding area_id column to customers table...");
      await connection.query(`
        ALTER TABLE customers ADD COLUMN area_id binary(16) NULL;
      `);
      console.log("area_id column added.");
    } else {
      console.log("area_id column already exists in customers table.");
    }

    // Check if foreign key constraint exists
    console.log("Checking if foreign key constraint exists...");
    const [constraints]: any = await connection.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'customers' AND CONSTRAINT_NAME = 'fk_customers_route_areas'
    `);

    if (constraints.length === 0) {
      console.log("Adding foreign key constraint for area_id to route_areas...");
      try {
        await connection.query(`
          ALTER TABLE customers 
          ADD CONSTRAINT fk_customers_route_areas 
          FOREIGN KEY (area_id) REFERENCES route_areas(id) ON DELETE SET NULL;
        `);
        console.log("Foreign key constraint added.");
      } catch (err: any) {
        console.warn("Could not add foreign key constraint (it might already exist under a different name):", err.message);
      }
    } else {
      console.log("Foreign key constraint fk_customers_route_areas already exists.");
    }

    console.log("✅ Migration completed successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await connection.end();
  }
}

run();
