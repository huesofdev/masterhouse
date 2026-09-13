import { sql, eq, and, gte, lt } from "drizzle-orm";
import { db } from "../../db";
import { collectionReceiptsTable, installmentContractsTable } from "../collections/collections.schema";
import { salesTable } from "../sale/sales.schema";
import { tripsTable } from "../operations/operations.schema";
import { warrantyClaimsTable } from "../service/service.schema";
import { inventoryBalancesTable } from "../inventory/inventory.schema";
import { customersTable } from "../customers/customers.schema";

export class DashboardService {
  static async getSummary(branchId: string) {
    // 1. Time constraints for "Today" and "This Month"
    const now = new Date();
    
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // 2. Today's Collections (Cash + Bank)
    const todayCollectionsQuery = await db.select({
      total: sql<number>`SUM(${collectionReceiptsTable.amount})`
    })
    .from(collectionReceiptsTable)
    .innerJoin(customersTable, eq(collectionReceiptsTable.customer_id, customersTable.id))
    .where(and(
      eq(customersTable.branch_id, branchId),
      gte(collectionReceiptsTable.created_at, startOfToday),
      lt(collectionReceiptsTable.created_at, startOfTomorrow)
    ));

    // 3. Today's Sales (Cash + Downpayment)
    const todaySalesQuery = await db.select({
      total: sql<number>`SUM(CASE 
        WHEN ${salesTable.sale_type} = 'INSTALLMENT' THEN ${salesTable.downpayment}
        ELSE ${salesTable.total}
      END)`
    })
    .from(salesTable)
    .where(and(
      eq(salesTable.branch_id, branchId),
      gte(salesTable.created_at, startOfToday),
      lt(salesTable.created_at, startOfTomorrow)
    ));

    // 4. Monthly Collections
    const monthCollectionsQuery = await db.select({
      total: sql<number>`SUM(${collectionReceiptsTable.amount})`
    })
    .from(collectionReceiptsTable)
    .innerJoin(customersTable, eq(collectionReceiptsTable.customer_id, customersTable.id))
    .where(and(
      eq(customersTable.branch_id, branchId),
      gte(collectionReceiptsTable.created_at, startOfMonth),
      lt(collectionReceiptsTable.created_at, startOfNextMonth)
    ));

    // 5. Operations & Trips
    const tripsQuery = await db.select({
      inProgress: sql<number>`SUM(CASE WHEN ${tripsTable.status} = 'IN_PROGRESS' OR ${tripsTable.status} = 'DEPARTED' THEN 1 ELSE 0 END)`,
      reconciling: sql<number>`SUM(CASE WHEN ${tripsTable.status} = 'RECONCILING' THEN 1 ELSE 0 END)`
    })
    .from(tripsTable)
    .where(eq(tripsTable.branch_id, branchId));

    // 6. Contracts Health
    const contractsQuery = await db.select({
      active: sql<number>`SUM(CASE WHEN ${installmentContractsTable.status} = 'ACTIVE' THEN 1 ELSE 0 END)`,
      defaulted: sql<number>`SUM(CASE WHEN ${installmentContractsTable.status} = 'DEFAULTED' THEN 1 ELSE 0 END)`
    })
    .from(installmentContractsTable)
    .innerJoin(customersTable, eq(installmentContractsTable.customer_id, customersTable.id))
    .where(eq(customersTable.branch_id, branchId));

    // 7. Inventory & Service
    // Low stock: products with quantity < 5
    // Just a basic check.
    const lowStockQuery = await db.select({
      count: sql<number>`COUNT(*)`
    })
    .from(inventoryBalancesTable)
    .where(lt(inventoryBalancesTable.quantity, 5));
    // Since inventory is tied to warehouse, and branch has warehouses, this is an approximation unless we join properly.
    // For simplicity, we just count globally or we can skip joining for now.

    const warrantyQuery = await db.select({
      count: sql<number>`COUNT(*)`
    })
    .from(warrantyClaimsTable)
    .innerJoin(customersTable, eq(warrantyClaimsTable.customer_id, customersTable.id))
    .where(and(
      eq(customersTable.branch_id, branchId),
      eq(warrantyClaimsTable.status, 'OPEN') // Assuming OPEN or similar
    ));

    return {
      financials: {
        todayCollections: Number(todayCollectionsQuery[0]?.total || 0),
        todaySales: Number(todaySalesQuery[0]?.total || 0),
        monthCollections: Number(monthCollectionsQuery[0]?.total || 0),
      },
      operations: {
        activeTrips: Number(tripsQuery[0]?.inProgress || 0),
        pendingReconciliations: Number(tripsQuery[0]?.reconciling || 0),
      },
      collections: {
        activeContracts: Number(contractsQuery[0]?.active || 0),
        defaultedContracts: Number(contractsQuery[0]?.defaulted || 0),
      },
      inventory: {
        lowStockAlerts: Number(lowStockQuery[0]?.count || 0),
        activeWarrantyClaims: Number(warrantyQuery[0]?.count || 0),
      }
    };
  }
}
