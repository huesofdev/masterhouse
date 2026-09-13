import { db } from "./index";
import { rolesTable } from "../features/rbac/rbac.schema";

async function fix() {
  console.log("Fixing role levels...");
  await db.update(rolesTable).set({ level: 100 });
  console.log("Done.");
  process.exit(0);
}

fix();
