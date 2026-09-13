import { db } from "../db";
import { eq, and, sql, ne } from "drizzle-orm";
import { customersTable } from "../features/customers/customers.schema";
import { salesTable } from "../features/sale/sales.schema";
import { preOrdersTable } from "../features/orders/orders.schema";
import {
  installmentContractsTable,
  installmentSchedulesTable,
  collectionAttemptsTable,
  contractAdjustmentsTable,
} from "../features/collections/collections.schema";
import { returnsTable } from "../features/service/service.schema";

/**
 * Compute a 1.0–5.0 rating for a single customer based on their behaviour.
 */
async function computeRating(customerId: string): Promise<string> {
  let score = 3.0;

  // ─── A. Installment On-Time Rate (up to +1.0) ───────────────────────────────
  const scheduleStats = await db
    .select({
      total: sql<number>`COUNT(*)`,
      paid: sql<number>`SUM(CASE WHEN ${installmentSchedulesTable.status} IN ('PAID','WAIVED') THEN 1 ELSE 0 END)`,
      overdue: sql<number>`SUM(CASE WHEN ${installmentSchedulesTable.status} = 'OVERDUE' THEN 1 ELSE 0 END)`,
    })
    .from(installmentSchedulesTable)
    .innerJoin(
      installmentContractsTable,
      eq(installmentSchedulesTable.contract_id, installmentContractsTable.id)
    )
    .where(
      and(
        eq(installmentContractsTable.customer_id, customerId),
        ne(installmentSchedulesTable.installment_number, 0),
        sql`${installmentSchedulesTable.due_date} <= CURDATE()`
      )
    );

  const sched = scheduleStats[0];
  if (sched && Number(sched.total) > 0) {
    const onTimeRate = Number(sched.paid) / Number(sched.total);
    score += onTimeRate * 1.0; // A
    const overdueRate = Number(sched.overdue) / Number(sched.total);
    score -= overdueRate * 0.8; // F partial (overdue rate)
  }

  // ─── B. Contracts Successfully Paid Off (up to +0.5) ────────────────────────
  const paidOff = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(installmentContractsTable)
    .where(
      and(
        eq(installmentContractsTable.customer_id, customerId),
        eq(installmentContractsTable.status, "PAID_OFF")
      )
    );
  score += Math.min(Number(paidOff[0]?.count ?? 0) * 0.15, 0.5);

  // ─── C. Defaulted Contracts (up to -1.5) ────────────────────────────────────
  const defaulted = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(installmentContractsTable)
    .where(
      and(
        eq(installmentContractsTable.customer_id, customerId),
        eq(installmentContractsTable.status, "DEFAULTED")
      )
    );
  score -= Math.min(Number(defaulted[0]?.count ?? 0) * 0.75, 1.5);

  // ─── D. Suspended Contracts (up to -0.5) ────────────────────────────────────
  const suspended = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(installmentContractsTable)
    .where(
      and(
        eq(installmentContractsTable.customer_id, customerId),
        eq(installmentContractsTable.status, "SUSPENDED")
      )
    );
  score -= Math.min(Number(suspended[0]?.count ?? 0) * 0.25, 0.5);

  // ─── E. Lifetime Spend Tier (up to +0.4) ────────────────────────────────────
  const spendResult = await db
    .select({ total: sql<number>`SUM(${salesTable.total})` })
    .from(salesTable)
    .where(
      and(
        eq(salesTable.customer_id, customerId),
        eq(salesTable.status, "COMPLETED")
      )
    );
  const totalSpend = Number(spendResult[0]?.total ?? 0);
  if (totalSpend >= 500000) score += 0.4;
  else if (totalSpend >= 250000) score += 0.3;
  else if (totalSpend >= 100000) score += 0.2;
  else if (totalSpend >= 50000) score += 0.1;

  // ─── F. Purchase Frequency – last 12 months (up to +0.3) ────────────────────
  const freqResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(salesTable)
    .where(
      and(
        eq(salesTable.customer_id, customerId),
        eq(salesTable.status, "COMPLETED"),
        sql`${salesTable.created_at} >= DATE_SUB(NOW(), INTERVAL 12 MONTH)`
      )
    );
  const purchaseCount = Number(freqResult[0]?.count ?? 0);
  if (purchaseCount >= 6) score += 0.3;
  else if (purchaseCount >= 4) score += 0.2;
  else if (purchaseCount >= 2) score += 0.1;

  // ─── G. Missed Collection Attempts (up to -0.4) ─────────────────────────────
  const attemptsResult = await db
    .select({
      total: sql<number>`COUNT(*)`,
      missed: sql<number>`SUM(CASE WHEN ${collectionAttemptsTable.status} IN ('MISSED','CUSTOMER_UNAVAILABLE') THEN 1 ELSE 0 END)`,
    })
    .from(collectionAttemptsTable)
    .where(eq(collectionAttemptsTable.customer_id, customerId));
  const att = attemptsResult[0];
  if (att && Number(att.total) > 0) {
    const missedRate = Number(att.missed) / Number(att.total);
    score -= missedRate * 0.4;
  }

  // ─── H. Penalty Adjustments (up to -0.3) ────────────────────────────────────
  const penaltiesResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(contractAdjustmentsTable)
    .innerJoin(
      installmentContractsTable,
      eq(contractAdjustmentsTable.contract_id, installmentContractsTable.id)
    )
    .where(
      and(
        eq(installmentContractsTable.customer_id, customerId),
        eq(contractAdjustmentsTable.type, "PENALTY")
      )
    );
  score -= Math.min(Number(penaltiesResult[0]?.count ?? 0) * 0.05, 0.3);

  // ─── I. Pre-Order Completion Rate (up to +0.2 / down to -0.2) ───────────────
  const preOrderResult = await db
    .select({
      total: sql<number>`COUNT(*)`,
      fulfilled: sql<number>`SUM(CASE WHEN ${preOrdersTable.status} = 'FULFILLED' THEN 1 ELSE 0 END)`,
      cancelled: sql<number>`SUM(CASE WHEN ${preOrdersTable.status} = 'CANCELLED' THEN 1 ELSE 0 END)`,
    })
    .from(preOrdersTable)
    .where(eq(preOrdersTable.customer_id, customerId));
  const po = preOrderResult[0];
  if (po && Number(po.total) > 0) {
    const fulfilRate = Number(po.fulfilled) / Number(po.total);
    const cancelRate = Number(po.cancelled) / Number(po.total);
    score += fulfilRate * 0.2;
    score -= cancelRate * 0.2;
  }

  // ─── J. Inactivity Decay (up to -0.3) ───────────────────────────────────────
  const lastPurchaseResult = await db
    .select({ last: sql<Date>`MAX(${salesTable.created_at})` })
    .from(salesTable)
    .where(
      and(
        eq(salesTable.customer_id, customerId),
        eq(salesTable.status, "COMPLETED")
      )
    );
  const lastPurchase = lastPurchaseResult[0]?.last;
  if (lastPurchase) {
    const monthsAgo =
      (Date.now() - new Date(lastPurchase).getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsAgo > 24) score -= 0.3;
    else if (monthsAgo > 12) score -= 0.15;
  } else {
    // Never purchased
    score -= 0.15;
  }

  // ─── Clamp and round ────────────────────────────────────────────────────────
  const clamped = Math.max(1.0, Math.min(5.0, score));
  return (Math.round(clamped * 10) / 10).toFixed(1);
}

async function runCustomerRatings() {
  console.log("[RATING CRON] Starting customer rating recalculation...");

  // Fetch all non-override customers
  const allCustomers = await db
    .select({ id: customersTable.id, name: customersTable.full_name })
    .from(customersTable)
    .where(eq(customersTable.rating_override, false));

  console.log(`[RATING CRON] Processing ${allCustomers.length} customers...`);

  let success = 0;
  let failed = 0;

  for (const customer of allCustomers) {
    try {
      const rating = await computeRating(customer.id);
      await db
        .update(customersTable)
        .set({ rating, rating_calculated_at: new Date() })
        .where(eq(customersTable.id, customer.id));
      success++;
    } catch (e) {
      console.error(`[RATING CRON] Failed for customer ${customer.id} (${customer.name}):`, e);
      failed++;
    }
  }

  console.log(
    `[RATING CRON] Done. ✅ Success: ${success} | ❌ Failed: ${failed}`
  );
  process.exit(0);
}

runCustomerRatings().catch((err) => {
  console.error("[RATING CRON] Fatal error:", err);
  process.exit(1);
});
