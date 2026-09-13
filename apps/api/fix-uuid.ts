import { db } from './src/db/index.js';
import { sql, eq, inArray } from 'drizzle-orm';
import { permissionsTable, rolePermissionsTable, rolesTable } from './src/features/rbac/rbac.schema.js';
import { v7 as uuidv7 } from 'uuid';

async function fix() {
  try {
    console.log("Finding bad permission...");
    const [perms]: any = await db.execute(sql`SELECT id FROM permissions WHERE name = 'sales:view_cost'`);
    if (perms.length > 0) {
      const badId = perms[0].id;
      console.log("Deleting bad role_permissions...");
      await db.execute(sql`DELETE FROM role_permissions WHERE permission_id = ${badId}`);
      console.log("Deleting bad permission...");
      await db.execute(sql`DELETE FROM permissions WHERE name = 'sales:view_cost'`);
    }

    console.log("Inserting correctly using Drizzle ORM...");
    const pId = uuidv7();
    await db.insert(permissionsTable).values({
      id: pId,
      name: 'sales:view_cost',
      description: 'Allows viewing cost of items in POS'
    });

    console.log("Assigning to Owner and Super Admin roles using Drizzle...");
    const roles = await db.select().from(rolesTable).where(inArray(rolesTable.name, ['Owner', 'Super Admin']));
    
    for (const role of roles) {
      await db.insert(rolePermissionsTable).values({
        role_id: role.id,
        permission_id: pId
      });
    }

    console.log("Success!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fix();
