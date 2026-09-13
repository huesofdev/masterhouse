import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { installmentContractsTable, installmentSchedulesTable, installmentSchemesTable } from "../features/collections/collections.schema";
import { customersTable } from "../features/customers/customers.schema";
import { branchesTable, branchPhonesTable } from "../features/branches/branches.schema";
import { SettingsService } from "../features/settings/settings.service";
import { NotificationsService } from "../features/notifications/notifications.service";

async function runDailyReminders() {
  console.log("Starting Daily SMS Reminder Engine...");
  
  const smsEnabled = await SettingsService.getSetting("sms_enabled");
  if (smsEnabled === "false") {
    console.log("SMS is globally disabled in settings. Exiting.");
    process.exit(0);
  }

  // Get the reminder days setting, default to 2
  const reminderDaysSetting = await SettingsService.getSetting("sms_reminder_days");
  const reminderDays = reminderDaysSetting ? parseInt(reminderDaysSetting, 10) : 2;

  // Find schedules due exactly in `reminderDays`
  const reminderSchedules = await db.select({
    schedule: installmentSchedulesTable,
    contract: installmentContractsTable,
    customer: customersTable,
    scheme: installmentSchemesTable
  })
  .from(installmentSchedulesTable)
  .innerJoin(installmentContractsTable, eq(installmentSchedulesTable.contract_id, installmentContractsTable.id))
  .innerJoin(customersTable, eq(installmentContractsTable.customer_id, customersTable.id))
  .innerJoin(installmentSchemesTable, eq(installmentContractsTable.scheme_id, installmentSchemesTable.id))
  .where(and(
    eq(installmentContractsTable.status, "ACTIVE"),
    sql`DATE(${installmentSchedulesTable.due_date}) = DATE_ADD(CURDATE(), INTERVAL ${reminderDays} DAY)`,
    eq(installmentSchedulesTable.status, "PENDING")
  ));

  console.log(`Found ${reminderSchedules.length} schedules due in ${reminderDays} days.`);
  const companyName = await SettingsService.getSetting("company_name") || "Our Company";

  for (const record of reminderSchedules) {
    const { schedule, customer, scheme } = record;

    try {
      const branchRecords = await db.select().from(branchesTable).where(eq(branchesTable.id, customer.branch_id)).limit(1);
      const branchAddress = branchRecords[0]?.address || "Our Branch";
      const branchPhoneRecords = await db.select().from(branchPhonesTable).where(eq(branchPhonesTable.branch_id, customer.branch_id));
      const branchPhone = branchPhoneRecords.length > 0 ? branchPhoneRecords.map(p => p.phone_number).join(' | ') : "Support";

      const dueDateStr = new Date(schedule.due_date).toLocaleDateString('en-GB');

      await NotificationsService.queueSms("PAYMENT_REMINDER", customer.id, customer.mobile, {
         company_name: companyName,
         branch_phone: branchPhone,
         branch_address: branchAddress,
         name: customer.full_name,
         amount_due: parseFloat(schedule.amount_due).toFixed(2),
         due_date: dueDateStr,
         grace_period: scheme.grace_period_days.toString()
      });
      console.log(`Queued reminder SMS for schedule ${schedule.id}`);
    } catch (e) {
      console.error(`Failed to queue reminder for schedule ${schedule.id}:`, e);
    }
  }

  console.log("Daily SMS Reminder Engine complete.");
  process.exit(0);
}

runDailyReminders();
