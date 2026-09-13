import { db } from "./src/db";
import { suppliersTable } from "./src/features/suppliers/suppliers.schema";
import { intakeOrdersTable } from "./src/features/inventory/intake.schema";
import { isNotNull, notIlike, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

async function seedSuppliers() {
  console.log("Seeding suppliers from existing intake orders...");
  
  try {
    const intakes = await db.select({ name: intakeOrdersTable.supplier_name }).from(intakeOrdersTable).groupBy(intakeOrdersTable.supplier_name);
    
    for (const intake of intakes) {
      if (!intake.name) continue;
      
      const existing = await db.query.suppliersTable.findFirst({
        where: eq(suppliersTable.name, intake.name)
      });
      
      let supplierId = existing?.id;
      
      if (!supplierId) {
        supplierId = uuidv7();
        await db.insert(suppliersTable).values({
          id: supplierId,
          name: intake.name,
        });
        console.log(`Created supplier: ${intake.name}`);
      }
      
      await db.update(intakeOrdersTable)
        .set({ supplier_id: supplierId })
        .where(eq(intakeOrdersTable.supplier_name, intake.name));
      
      console.log(`Linked supplier ${intake.name} to its intake orders`);
    }
    
    console.log("✅ Seed complete");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedSuppliers();
