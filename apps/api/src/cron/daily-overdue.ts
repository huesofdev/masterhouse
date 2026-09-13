import { db } from "../db";
import { eq, and, lte, asc, desc, sql, inArray, like } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { installmentContractsTable, installmentSchedulesTable, contractAdjustmentsTable, installmentSchemesTable } from "../features/collections/collections.schema";
import { customersTable } from "../features/customers/customers.schema";
import { branchesTable, branchPhonesTable } from "../features/branches/branches.schema";
import { SettingsService } from "../features/settings/settings.service";
import { NotificationsService } from "../features/notifications/notifications.service";
import { getTodayStr } from "../utils/date.util";
import { roundMoney } from "../utils/money.util";

async function runOverduePenalties() {
  console.log("Starting Daily Overdue & Penalty Engine...");
  
  const penaltyEnabled = await SettingsService.getSetting("enable_overdue_penalties");
  if (penaltyEnabled === "false") {
    console.log("Overdue penalties are globally disabled in settings. Exiting.");
    process.exit(0);
  }

  const todayStr = getTodayStr();

  // -------------------------------------------------------------
  // PASS 1: INITIAL OVERDUE & GRACE PERIOD EXPIRATION PENALTIES
  // -------------------------------------------------------------
  // Target schedules where: due_date <= TODAY - (grace_period_days + 1)
  const overdueSchedules = await db.select({
    schedule: installmentSchedulesTable,
    contract: installmentContractsTable,
    scheme: installmentSchemesTable,
    customer: customersTable
  })
  .from(installmentSchedulesTable)
  .innerJoin(installmentContractsTable, eq(installmentSchedulesTable.contract_id, installmentContractsTable.id))
  .innerJoin(installmentSchemesTable, eq(installmentContractsTable.scheme_id, installmentSchemesTable.id))
  .innerJoin(customersTable, eq(installmentContractsTable.customer_id, customersTable.id))
  .where(and(
    eq(installmentContractsTable.status, "ACTIVE"),
    sql`DATE(${installmentSchedulesTable.due_date}) <= DATE_SUB(CURDATE(), INTERVAL (${installmentSchemesTable.grace_period_days} + 1) DAY)`,
    inArray(installmentSchedulesTable.status, ["PENDING", "PARTIALLY_PAID"])
  ));

  console.log(`Found ${overdueSchedules.length} schedules that passed their grace period.`);
  const companyName = await SettingsService.getSetting("company_name") || "Our Company";

  for (const record of overdueSchedules) {
    const { schedule, contract, scheme, customer } = record;

    try {
      await db.transaction(async (tx) => {
        // Idempotency check: verify if a penalty has already been logged for this installment number
        const existingPenalty = await tx.select({ id: contractAdjustmentsTable.id })
          .from(contractAdjustmentsTable)
          .where(and(
            eq(contractAdjustmentsTable.contract_id, contract.id),
            eq(contractAdjustmentsTable.type, "PENALTY"),
            like(contractAdjustmentsTable.reason, `%installment #${schedule.installment_number} %`)
          ))
          .limit(1);

        if (existingPenalty.length > 0) {
          console.log(`Schedule #${schedule.installment_number} for contract ${contract.id} already penalized. Skipping.`);
          return;
        }

        // 1. Calculate penalty based on the REMAINING missed amount
        const previouslyPaidAmount = roundMoney(parseFloat(schedule.amount_paid || "0"));
        const actualMissedAmount = roundMoney(parseFloat(schedule.amount_due) - previouslyPaidAmount);
        const penaltyAmount = roundMoney(actualMissedAmount * (parseFloat(scheme.late_fee_percentage) / 100));

        const dueDateStr = new Date(schedule.due_date).toLocaleDateString('en-GB');

        if (penaltyAmount > 0) {
          // 2. Add adjustment
          const adjustmentId = uuidv7();
          await tx.insert(contractAdjustmentsTable).values({
            id: adjustmentId,
            contract_id: contract.id,
            type: "PENALTY",
            amount: penaltyAmount.toFixed(2),
            reason: `Automatic late fee for missed installment #${schedule.installment_number} due on ${dueDateStr}`,
            created_by: "00000000-0000-0000-0000-000000000000"
          });

          // 3. Update contract balance
          const currentBal = roundMoney(parseFloat(contract.balance));
          const newBalance = roundMoney(currentBal + penaltyAmount);
          await tx.update(installmentContractsTable)
            .set({ balance: newBalance.toFixed(2) })
            .where(eq(installmentContractsTable.id, contract.id));
        }

        // 4. Update schedule status to OVERDUE and increase the amount_due by the penalty fee
        const currentSchedDue = roundMoney(parseFloat(schedule.amount_due));
        const newAmountDue = roundMoney(currentSchedDue + penaltyAmount);
        await tx.update(installmentSchedulesTable)
          .set({ 
            status: "OVERDUE",
            amount_due: newAmountDue.toFixed(2)
          })
          .where(eq(installmentSchedulesTable.id, schedule.id));

        // 5. Fire SMS
        const branchRecords = await tx.select().from(branchesTable).where(eq(branchesTable.id, customer.branch_id)).limit(1);
        const branchAddress = branchRecords[0]?.address || "Our Branch";
        const branchPhoneRecords = await tx.select().from(branchPhonesTable).where(eq(branchPhonesTable.branch_id, customer.branch_id));
        const branchPhone = branchPhoneRecords.length > 0 ? branchPhoneRecords.map(p => p.phone_number).join(' | ') : "Support";

        const previouslyPaid = parseFloat(schedule.amount_paid || "0");
        const baseDue = parseFloat(schedule.amount_due);
        const actualMissed = baseDue - previouslyPaid;
        
        await NotificationsService.queueSms("PAYMENT_OVERDUE", customer.id, customer.mobile, {
           company_name: companyName,
           branch_phone: branchPhone,
           branch_address: branchAddress,
           name: customer.full_name,
           missed_amount: actualMissed.toFixed(2),
           penalty_added: penaltyAmount.toFixed(2),
           total_pending: (actualMissed + penaltyAmount).toFixed(2),
           due_date: dueDateStr,
           grace_period: scheme.grace_period_days.toString()
        });
      });
      console.log(`Processed penalty for contract ${contract.id}`);
    } catch (e) {
      console.error(`Failed to process penalty for schedule ${schedule.id}:`, e);
    }
  }

  // -------------------------------------------------------------
  // PASS 2: RECURRING MONTHLY OVERDUE PENALTIES (EVERY 30 DAYS)
  // -------------------------------------------------------------
  const maxRecurringMonthsStr = await SettingsService.getSetting("overdue_penalty_max_recurring_months") || "3";
  const maxRecurringMonths = parseInt(maxRecurringMonthsStr, 10);

  const recurringDaysIntervalStr = await SettingsService.getSetting("overdue_penalty_recurring_days_interval") || "30";
  const recurringDaysInterval = parseInt(recurringDaysIntervalStr, 10);

  console.log(`Checking for recurring overdue penalties (Interval: ${recurringDaysInterval} days, Max: ${maxRecurringMonths} months)...`);

  const activeOverdueSchedules = await db.select({
    schedule: installmentSchedulesTable,
    contract: installmentContractsTable,
    scheme: installmentSchemesTable,
    customer: customersTable
  })
  .from(installmentSchedulesTable)
  .innerJoin(installmentContractsTable, eq(installmentSchedulesTable.contract_id, installmentContractsTable.id))
  .innerJoin(installmentSchemesTable, eq(installmentContractsTable.scheme_id, installmentSchemesTable.id))
  .innerJoin(customersTable, eq(installmentContractsTable.customer_id, customersTable.id))
  .where(and(
    eq(installmentContractsTable.status, "ACTIVE"),
    eq(installmentSchedulesTable.status, "OVERDUE"),
    sql`ROUND(CAST(${installmentSchedulesTable.amount_due} AS DECIMAL(12,2)) - CAST(${installmentSchedulesTable.amount_paid} AS DECIMAL(12,2)), 2) > 0.01`
  ));

  console.log(`Found ${activeOverdueSchedules.length} active OVERDUE schedules to check for recurring penalties.`);

  for (const record of activeOverdueSchedules) {
    const { schedule, contract, scheme, customer } = record;

    try {
      await db.transaction(async (tx) => {
        // Fetch all penalty adjustments for this specific contract & installment number
        const penaltyAdjustments = await tx.select({
          id: contractAdjustmentsTable.id,
          created_at: contractAdjustmentsTable.created_at
        })
        .from(contractAdjustmentsTable)
        .where(and(
          eq(contractAdjustmentsTable.contract_id, contract.id),
          eq(contractAdjustmentsTable.type, "PENALTY"),
          like(contractAdjustmentsTable.reason, `%installment #${schedule.installment_number} %`)
        ))
        .orderBy(desc(contractAdjustmentsTable.created_at));

        const penaltyCount = penaltyAdjustments.length;

        // Skip if max recurring penalty cap reached
        if (penaltyCount >= maxRecurringMonths) {
          return;
        }

        // Skip if no initial penalty was applied yet
        if (penaltyCount === 0) {
          return;
        }

        // Check days passed since last penalty adjustment
        const lastPenaltyDate = new Date(penaltyAdjustments[0].created_at);
        const todayDate = new Date();
        const diffMs = todayDate.getTime() - lastPenaltyDate.getTime();
        const daysSinceLastPenalty = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (daysSinceLastPenalty < recurringDaysInterval) {
          return; // Less than 30 days since last penalty
        }

        // Calculate penalty on the REMAINING unpaid balance
        const currentPaid = roundMoney(parseFloat(schedule.amount_paid || "0"));
        const currentDue = roundMoney(parseFloat(schedule.amount_due));
        const remainingUnpaid = roundMoney(currentDue - currentPaid);

        if (remainingUnpaid <= 0.01) return;

        const penaltyAmount = roundMoney(remainingUnpaid * (parseFloat(scheme.late_fee_percentage) / 100));
        if (penaltyAmount <= 0) return;

        const monthNumber = penaltyCount + 1;

        // Insert recurring penalty adjustment
        const adjustmentId = uuidv7();
        await tx.insert(contractAdjustmentsTable).values({
          id: adjustmentId,
          contract_id: contract.id,
          type: "PENALTY",
          amount: penaltyAmount.toFixed(2),
          reason: `Automatic recurring ${recurringDaysInterval}-day late fee for overdue installment #${schedule.installment_number} (Month ${monthNumber})`,
          created_by: "00000000-0000-0000-0000-000000000000"
        });

        // Update contract balance
        const currentBal = roundMoney(parseFloat(contract.balance));
        const newBalance = roundMoney(currentBal + penaltyAmount);
        await tx.update(installmentContractsTable)
          .set({ balance: newBalance.toFixed(2) })
          .where(eq(installmentContractsTable.id, contract.id));

        // Update schedule amount due
        const newAmountDue = roundMoney(currentDue + penaltyAmount);
        await tx.update(installmentSchedulesTable)
          .set({ 
            amount_due: newAmountDue.toFixed(2)
          })
          .where(eq(installmentSchedulesTable.id, schedule.id));

        // Queue SMS notification
        const branchRecords = await tx.select().from(branchesTable).where(eq(branchesTable.id, customer.branch_id)).limit(1);
        const branchAddress = branchRecords[0]?.address || "Our Branch";
        const branchPhoneRecords = await tx.select().from(branchPhonesTable).where(eq(branchPhonesTable.branch_id, customer.branch_id));
        const branchPhone = branchPhoneRecords.length > 0 ? branchPhoneRecords.map(p => p.phone_number).join(' | ') : "Support";

        await NotificationsService.queueSms("PAYMENT_OVERDUE", customer.id, customer.mobile, {
           company_name: companyName,
           branch_phone: branchPhone,
           branch_address: branchAddress,
           name: customer.full_name,
           missed_amount: remainingUnpaid.toFixed(2),
           penalty_added: penaltyAmount.toFixed(2),
           total_pending: (remainingUnpaid + penaltyAmount).toFixed(2),
           due_date: new Date(schedule.due_date).toLocaleDateString('en-GB'),
           grace_period: `${recurringDaysInterval}-day recurring penalty (Month ${monthNumber})`
        });

        console.log(`Applied recurring Month ${monthNumber} penalty of Rs.${penaltyAmount.toFixed(2)} to contract ${contract.id} (Schedule #${schedule.installment_number})`);
      });
    } catch (e) {
      console.error(`Failed to process recurring penalty for schedule ${schedule.id}:`, e);
    }
  }

  console.log("Daily Overdue Engine complete.");
  process.exit(0);
}

runOverduePenalties();
