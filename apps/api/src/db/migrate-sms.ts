import { db } from "./index";
import { sql } from "drizzle-orm";

async function runCustomMigration() {
  console.log("Running custom migration for SMS Reminders & Grace Period...");
  
  try {
    // 1. Add grace_period_days to installment_schemes
    console.log("Adding grace_period_days to installment_schemes...");
    try {
      await db.execute(sql`ALTER TABLE installment_schemes ADD COLUMN grace_period_days INT NOT NULL DEFAULT 5;`);
      console.log("Successfully added grace_period_days.");
    } catch (e: any) {
      if (e.message.includes("Duplicate column name")) {
        console.log("grace_period_days column already exists. Skipping.");
      } else {
        throw e;
      }
    }

    // 2. Update sms_templates trigger_event ENUM
    console.log("Updating sms_templates trigger_event enum...");
    await db.execute(sql`ALTER TABLE sms_templates MODIFY COLUMN trigger_event ENUM('SALE_CREATED', 'COLLECTION_RECEIPT', 'PAYMENT_OVERDUE', 'DIRECT_SALE_CREATED', 'PAYMENT_REMINDER') NOT NULL;`);
    console.log("Successfully updated sms_templates enum.");

    // 3. Update sms_logs trigger_event ENUM
    console.log("Updating sms_logs trigger_event enum...");
    await db.execute(sql`ALTER TABLE sms_logs MODIFY COLUMN trigger_event ENUM('SALE_CREATED', 'COLLECTION_RECEIPT', 'PAYMENT_OVERDUE', 'CUSTOM', 'DIRECT_SALE_CREATED', 'PAYMENT_REMINDER') NOT NULL;`);
    console.log("Successfully updated sms_logs enum.");

    console.log("Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runCustomMigration();
