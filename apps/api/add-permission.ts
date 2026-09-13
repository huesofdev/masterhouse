import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';
import { v7 as uuidv7 } from "uuid";

async function run() {
  try {
    console.log("Adding sales:view_cost permission...");
    const pId = uuidv7();
    await db.execute(sql`INSERT IGNORE INTO permissions (id, name, description) VALUES (${pId}, 'sales:view_cost', 'Allows viewing cost of items in POS')`);

    console.log("Assigning to Owner and Super Admin roles...");
    // Find the permission id
    const [perms]: any = await db.execute(sql`SELECT id FROM permissions WHERE name = 'sales:view_cost'`);
    if (perms.length === 0) {
      console.error("Permission not found");
      process.exit(1);
    }
    const actualPId = perms[0].id;

    // Find the roles
    const [roles]: any = await db.execute(sql`SELECT id FROM roles WHERE name IN ('Owner', 'Super Admin')`);
    for (const role of roles) {
      await db.execute(sql`INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (${role.id}, ${actualPId})`);
    }

    console.log("Success!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
