import { db } from "../../db";
import { expenseCategoriesTable } from "./expenses.schema";
import { v7 as uuidv7 } from "uuid";

const categories = [
  { name: "Fuel & Transport", type: "OPERATIONAL" },
  { name: "Vehicle Maintenance", type: "OPERATIONAL" },
  { name: "Office Utilities", type: "OPERATIONAL" },
  { name: "Salaries & Allowances", type: "FINANCIAL" },
  { name: "Field Staff Commissions", type: "FINANCIAL" },
  { name: "Debt Recovery Costs", type: "OPERATIONAL" },
  { name: "Miscellaneous", type: "OPERATIONAL" }
];

async function seed() {
  for (const cat of categories) {
    await db.insert(expenseCategoriesTable).values({
      id: uuidv7(),
      name: cat.name,
      type: cat.type,
      is_active: true
    }).onDuplicateKeyUpdate({ set: { name: cat.name } });
  }
  console.log("Expense categories seeded.");
  process.exit(0);
}

seed();
