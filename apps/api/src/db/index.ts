import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

import * as dotenv from 'dotenv';
import * as fs from 'fs';
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
} else {
  dotenv.config(); // fallback to .env
}

const dbUrl = process.env.DB_URL || "mysql://root:admin@localhost:3307/masterhousenew";

const poolConnection = mysql.createPool(
  dbUrl.startsWith("mysql://") ? dbUrl : `mysql://${dbUrl}`
);

// THE FIX: This force-sets UTC every time a new connection is born
poolConnection.on('connection', (conn) => {
    conn.query("SET time_zone = '+00:00';");
});

export const db = drizzle(poolConnection, { schema, mode: "default" });
