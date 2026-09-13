import { db } from "./src/db";
import { installmentSchemesTable } from "./src/features/collections/collections.schema";
import { customersTable } from "./src/features/customers/customers.schema";
import { v7 as uuidv7 } from "uuid";
import "dotenv/config";

async function main() {
  console.log("Seeding installment schemes and dummy customer...");

  // 1. We need a branch ID to attach schemes and customers. 
  // We can fetch the first available branch.
  const branches = await db.query.branchesTable.findMany({ limit: 1 });
  if (branches.length === 0) {
    console.error("No branches found! Cannot seed.");
    process.exit(1);
  }
  const branchId = branches[0].id;

  // 2. Insert dummy schemes
  const scheme1Id = uuidv7();
  const scheme2Id = uuidv7();

  await db.insert(installmentSchemesTable).values([
    {
      id: scheme1Id,
      branch_id: branchId,
      name: "3 Months 0% Interest Promo",
      terms: 3,
      frequency: "MONTHLY",
      interest_rate: "0.00",
      min_downpayment_percent: "20.00",
      late_fee_percentage: "5.00"
    },
    {
      id: scheme2Id,
      branch_id: branchId,
      name: "12 Months Standard",
      terms: 12,
      frequency: "MONTHLY",
      interest_rate: "18.00",
      min_downpayment_percent: "10.00",
      late_fee_percentage: "5.00"
    }
  ]);
  console.log("Inserted dummy installment schemes.");

  // 3. Insert a dummy verified customer with a NIC
  const customerId = uuidv7();
  await db.insert(customersTable).values({
    id: customerId,
    branch_id: branchId,
    full_name: "John Doe",
    nic: "199012345678",
    mobile: "0771234567",
    address: "123 Galle Road, Colombo 03",
    is_walk_in: false
  });
  console.log(`Inserted dummy customer (NIC: 199012345678, ID: ${customerId})`);

  console.log("Done.");
  process.exit(0);
}

main().catch(console.error);
