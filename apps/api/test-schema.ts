import { db } from "./src/db/index";
import { intakeOrdersTable } from "./src/features/inventory/intake.schema";
import { inventoryBalancesTable } from "./src/features/inventory/inventory.schema";

async function run() {
  console.log("Testing relations...");
  try {
    const r1 = await db.query.inventoryBalancesTable.findMany({
      limit: 1,
      with: { product: true, warehouse: true }
    });
    console.log("Success inventoryBalances:", r1);

    const r2 = await db.query.intakeOrdersTable.findMany({
      limit: 1,
      with: { warehouse: true, creator: true }
    });
    console.log("Success intakeOrders:", r2);
    process.exit(0);
  } catch (e) {
    console.error("FAILED:", e);
    process.exit(1);
  }
}
run();
