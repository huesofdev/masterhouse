import { db } from "../../db";
import { sql, and, eq, desc, inArray, gte, lte, isNull, isNotNull, asc, ne } from "drizzle-orm";
import { serialItemsTable, inventoryBalancesTable } from "../inventory/inventory.schema";
import { intakeOrdersTable, intakeItemsTable } from "../inventory/intake.schema";
import { suppliersTable } from "../suppliers/suppliers.schema";
import { productsTable } from "../products/products.schema";
import { warehousesTable } from "../warehouses/warehouses.schema";
import { salesTable, saleItemsTable } from "../sale/sales.schema";
import { installmentContractsTable, installmentSchedulesTable, collectionReceiptsTable, installmentSchemesTable, refundsTable } from "../collections/collections.schema";
import { returnsTable } from "../service/service.schema";
import { customersTable } from "../customers/customers.schema";
import { branchesTable } from "../branches/branches.schema";
import { routesTable } from "../routes/routes.schema";
import { usersTable, userBranchesTable } from "../user/user.schema";
import { rolesTable } from "../rbac/rbac.schema";
import { expensesTable, expenseCategoriesTable } from "../expenses/expenses.schema";
import { categoriesTable, brandsTable } from "../catalog/catalog.schema";
import { preOrdersTable, preOrderItemsTable } from "../orders/orders.schema";
import { tripsTable, tripStockTable } from "../operations/operations.schema";
import { fleetVehiclesTable } from "../vehicles/vehicles.schema";
import * as ExcelJS from "exceljs";

export function parseReportDateRange(startDate?: string, endDate?: string) {
  let start: Date | undefined;
  let end: Date | undefined;

  if (startDate) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      const [y, m, d] = startDate.split('-').map(Number);
      start = new Date(y, m - 1, d, 0, 0, 0, 0);
    } else {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
    }
  }

  if (endDate) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      const [y, m, d] = endDate.split('-').map(Number);
      end = new Date(y, m - 1, d, 23, 59, 59, 999);
    } else {
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    }
  }

  return { start, end };
}

export class ReportsService {
  static async attachProductsToReport(data: any[], saleIdKey: string = 'saleId') {
    const saleIds = [...new Set(data.map(d => d[saleIdKey]).filter(Boolean))] as string[];
    if (saleIds.length === 0) return data;

    const items = await db.select({ saleId: saleItemsTable.sale_id, productName: productsTable.name })
      .from(saleItemsTable)
      .innerJoin(productsTable, eq(saleItemsTable.product_id, productsTable.id))
      .where(inArray(saleItemsTable.sale_id, saleIds));

    const itemMap = items.reduce((acc, item) => {
      if (!acc[item.saleId]) acc[item.saleId] = [];
      acc[item.saleId].push(item.productName);
      return acc;
    }, {} as Record<string, string[]>);

    data.forEach(d => {
      d.products = itemMap[d[saleIdKey]]?.join(', ') || '-';
    });
    return data;
  }

  static async getStockReport(warehouseId?: string, page?: number, limit?: number, brandId?: string) {
    const conditions = [];
    if (warehouseId) {
      conditions.push(eq(inventoryBalancesTable.warehouse_id, warehouseId));
    }
    if (brandId) {
      conditions.push(eq(productsTable.brand_id, brandId));
    }

    const baseQuery = db
      .select({
        productName: productsTable.name,
        sku: productsTable.sku,
        warehouseName: warehousesTable.name,
        quantity: inventoryBalancesTable.quantity,
        avgCost: inventoryBalancesTable.avg_cost,
        totalWorth: sql<number>`(${inventoryBalancesTable.quantity} * ${inventoryBalancesTable.avg_cost})`,
      })
      .from(inventoryBalancesTable)
      .innerJoin(productsTable, eq(inventoryBalancesTable.product_id, productsTable.id))
      .innerJoin(warehousesTable, eq(inventoryBalancesTable.warehouse_id, warehousesTable.id))
      .where(and(...conditions));

    const totalCountRes = await db.select({ 
      count: sql<number>`count(*)`,
      totalWorth: sql<number>`COALESCE(SUM(${inventoryBalancesTable.quantity} * ${inventoryBalancesTable.avg_cost}), 0)`
    })
    .from(inventoryBalancesTable)
    .innerJoin(productsTable, eq(inventoryBalancesTable.product_id, productsTable.id))
    .where(and(...conditions));
    
    const total = totalCountRes[0]?.count || 0;
    const summary = {
      totalWorth: Number(totalCountRes[0]?.totalWorth || 0)
    };

    let query = baseQuery.orderBy(productsTable.name) as any;
    
    if (page && limit) {
      query = query.limit(limit).offset((page - 1) * limit);
    }

    const data = await query;
    return { data, total, summary };
  }

  // Sales Report
  static async getSalesReport(filters: { branchId?: string; startDate?: string; endDate?: string; saleType?: string; status?: string; userId?: string; source?: string; page?: number; limit?: number; routeId?: string; }) {
    const conditions = [];
    const { start, end } = parseReportDateRange(filters.startDate, filters.endDate);
    if (filters.branchId) conditions.push(eq(salesTable.branch_id, filters.branchId));
    if (filters.userId) conditions.push(eq(salesTable.created_by, filters.userId));
    if (filters.saleType) conditions.push(eq(salesTable.sale_type, filters.saleType as any));
    if (filters.status) conditions.push(eq(salesTable.status, filters.status as any));
    if (start) conditions.push(gte(salesTable.created_at, start));
    if (end) conditions.push(lte(salesTable.created_at, end));
    if (filters.source === "OFFICE") conditions.push(isNull(salesTable.trip_id));
    else if (filters.source === "TRIP") conditions.push(isNotNull(salesTable.trip_id));
    if (filters.routeId) conditions.push(eq(customersTable.route_id, filters.routeId));

    const baseQuery = db
      .select({
        id: salesTable.id,
        date: salesTable.created_at,
        branchName: branchesTable.name,
        saleType: salesTable.sale_type,
        status: salesTable.status,
        paymentMode: salesTable.payment_mode,
        subtotal: salesTable.subtotal,
        downpayment: salesTable.downpayment,
        total: salesTable.total,
        refundedAmount: sql<number>`COALESCE((SELECT SUM(CAST(r.refund_amount AS DECIMAL(14,2))) FROM returns r WHERE r.sale_id = ${salesTable.id}), 0)`,
        pendingAmount: sql<number>`IF(${salesTable.sale_type} = 'DIRECT', 0, COALESCE(${installmentContractsTable.balance}, 0))`,
        receivedAmount: sql<number>`IF(${salesTable.sale_type} = 'DIRECT', ${salesTable.total} - COALESCE((SELECT SUM(CAST(r.refund_amount AS DECIMAL(14,2))) FROM returns r WHERE r.sale_id = ${salesTable.id}), 0), ${salesTable.downpayment} + (COALESCE(${installmentContractsTable.total_payable}, 0) - COALESCE(${installmentContractsTable.balance}, 0)) - COALESCE((SELECT SUM(CAST(ref.amount AS DECIMAL(14,2))) FROM refunds ref WHERE ref.contract_id = ${installmentContractsTable.id}), 0))`,
        customerName: customersTable.full_name,
        createdBy: usersTable.name,
        tripId: salesTable.trip_id,
      })
      .from(salesTable)
      .innerJoin(branchesTable, eq(salesTable.branch_id, branchesTable.id))
      .leftJoin(customersTable, eq(salesTable.customer_id, customersTable.id))
      .leftJoin(usersTable, eq(salesTable.created_by, usersTable.id))
      .leftJoin(installmentContractsTable, eq(salesTable.id, installmentContractsTable.sale_id))
      .where(and(...conditions));

    const summaryRes = await db.select({ 
      count: sql<number>`count(*)`,
      totalVolume: sql<number>`COALESCE(SUM(${salesTable.total}), 0)`,
      totalDownpayments: sql<number>`COALESCE(SUM(${salesTable.downpayment}), 0)`,
      totalPending: sql<number>`COALESCE(SUM(IF(${salesTable.sale_type} = 'DIRECT', 0, COALESCE(${installmentContractsTable.balance}, 0))), 0)`,
      totalReceived: sql<number>`COALESCE(SUM(IF(${salesTable.sale_type} = 'DIRECT', ${salesTable.total} - COALESCE((SELECT SUM(CAST(r.refund_amount AS DECIMAL(14,2))) FROM returns r WHERE r.sale_id = ${salesTable.id}), 0), ${salesTable.downpayment} + (COALESCE(${installmentContractsTable.total_payable}, 0) - COALESCE(${installmentContractsTable.balance}, 0)) - COALESCE((SELECT SUM(CAST(ref.amount AS DECIMAL(14,2))) FROM refunds ref WHERE ref.contract_id = ${installmentContractsTable.id}), 0))), 0)`
    })
      .from(salesTable)
      .leftJoin(customersTable, eq(salesTable.customer_id, customersTable.id))
      .leftJoin(installmentContractsTable, eq(salesTable.id, installmentContractsTable.sale_id))
      .where(and(...conditions));

    const total = summaryRes[0]?.count || 0;
    const summary = {
      totalVolume: Number(summaryRes[0]?.totalVolume || 0),
      totalDownpayments: Number(summaryRes[0]?.totalDownpayments || 0),
      totalPending: Number(summaryRes[0]?.totalPending || 0),
      totalReceived: Number(summaryRes[0]?.totalReceived || 0),
    };

    let query = baseQuery.orderBy(desc(salesTable.created_at)) as any;
    
    if (filters.page && filters.limit) {
      query = query.limit(filters.limit).offset((filters.page - 1) * filters.limit);
    }

    const data = await query;
    await ReportsService.attachProductsToReport(data, 'id');
    return { data, total, summary };
  }

  // Collections Report
  static async getCollectionsReport(filters: { status?: string; scheduleStatus?: string; routeId?: string; branchId?: string; page?: number; limit?: number; }) {
    const conditions = [];
    if (filters.status) conditions.push(eq(installmentContractsTable.status, filters.status as any));
    if (filters.routeId) conditions.push(eq(customersTable.route_id, filters.routeId));
    if (filters.branchId) conditions.push(eq(salesTable.branch_id, filters.branchId));
    
    const contracts = await db
      .select({
        id: installmentContractsTable.id,
        customerName: customersTable.full_name,
        phone: customersTable.mobile,
        routeName: routesTable.name,
        status: installmentContractsTable.status,
        principal: installmentContractsTable.principal,
        totalPayable: installmentContractsTable.total_payable,
        balance: installmentContractsTable.balance,
        downpayment: installmentContractsTable.downpayment,
        createdAt: installmentContractsTable.created_at,
        saleId: installmentContractsTable.sale_id,
      })
      .from(installmentContractsTable)
      .innerJoin(customersTable, eq(installmentContractsTable.customer_id, customersTable.id))
      .innerJoin(salesTable, eq(installmentContractsTable.sale_id, salesTable.id))
      .leftJoin(routesTable, eq(customersTable.route_id, routesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(installmentContractsTable.created_at));

    const schedules = await db
      .select({
        contractId: installmentSchedulesTable.contract_id,
        amountDue: installmentSchedulesTable.amount_due,
        amountPaid: installmentSchedulesTable.amount_paid,
        status: installmentSchedulesTable.status,
        dueDate: installmentSchedulesTable.due_date,
      })
      .from(installmentSchedulesTable);

    const scheduleMap = schedules.reduce((acc, sch) => {
      if (!acc[sch.contractId]) acc[sch.contractId] = { pending: 0, overdue: 0, paid: 0 };
      if (sch.status === 'PAID') acc[sch.contractId].paid += Number(sch.amountPaid);
      if (sch.status === 'PENDING' || sch.status === 'PARTIALLY_PAID') {
        const remaining = Number(sch.amountDue) - Number(sch.amountPaid);
        if (new Date(sch.dueDate) < new Date()) {
          acc[sch.contractId].overdue += remaining;
        } else {
          acc[sch.contractId].pending += remaining;
        }
      }
      return acc;
    }, {} as Record<string, any>);

    let filteredData = contracts.map(c => ({
      ...c,
      overdueAmount: scheduleMap[c.id]?.overdue || 0,
      pendingAmount: scheduleMap[c.id]?.pending || 0,
      paidAmount: scheduleMap[c.id]?.paid || 0,
    })).filter(c => {
      if (filters.scheduleStatus === 'OVERDUE') return c.overdueAmount > 0;
      if (filters.scheduleStatus === 'PENDING') return c.pendingAmount > 0;
      return true;
    });

    const total = filteredData.length;
    const summary = {
      totalOverdue: filteredData.reduce((sum, c) => sum + Number(c.overdueAmount || 0), 0),
      totalPending: filteredData.reduce((sum, c) => sum + Number(c.pendingAmount || 0), 0),
      totalPaid: filteredData.reduce((sum, c) => sum + Number(c.paidAmount || 0), 0),
    };

    let paginatedData = filteredData;
    if (filters.page && filters.limit) {
      paginatedData = filteredData.slice((filters.page - 1) * filters.limit, filters.page * filters.limit);
    }

    await ReportsService.attachProductsToReport(paginatedData, 'saleId');
    return { data: paginatedData, total, summary };
  }

  // Schedules Report
  static async getSchedulesReport(filters: { status?: string; routeId?: string; branchId?: string; page?: number; limit?: number; }) {
    const conditions = [];
    if (filters.status) conditions.push(eq(installmentSchedulesTable.status, filters.status as any));
    if (filters.routeId) conditions.push(eq(customersTable.route_id, filters.routeId));
    if (filters.branchId) conditions.push(eq(salesTable.branch_id, filters.branchId));

    const baseQuery = db
      .select({
        id: installmentSchedulesTable.id,
        contractId: installmentSchedulesTable.contract_id,
        customerName: customersTable.full_name,
        routeName: routesTable.name,
        installmentNumber: installmentSchedulesTable.installment_number,
        dueDate: installmentSchedulesTable.due_date,
        amountDue: installmentSchedulesTable.amount_due,
        amountPaid: installmentSchedulesTable.amount_paid,
        status: installmentSchedulesTable.status,
        saleId: installmentContractsTable.sale_id,
      })
      .from(installmentSchedulesTable)
      .innerJoin(installmentContractsTable, eq(installmentSchedulesTable.contract_id, installmentContractsTable.id))
      .innerJoin(salesTable, eq(installmentContractsTable.sale_id, salesTable.id))
      .innerJoin(customersTable, eq(installmentContractsTable.customer_id, customersTable.id))
      .leftJoin(routesTable, eq(customersTable.route_id, routesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const summaryRes = await db.select({ 
      count: sql<number>`count(*)`,
      totalDue: sql<number>`COALESCE(SUM(${installmentSchedulesTable.amount_due}), 0)`,
      totalPaid: sql<number>`COALESCE(SUM(${installmentSchedulesTable.amount_paid}), 0)`
    })
      .from(installmentSchedulesTable)
      .innerJoin(installmentContractsTable, eq(installmentSchedulesTable.contract_id, installmentContractsTable.id))
      .innerJoin(salesTable, eq(installmentContractsTable.sale_id, salesTable.id))
      .innerJoin(customersTable, eq(installmentContractsTable.customer_id, customersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    const total = summaryRes[0]?.count || 0;
    const summary = {
      totalDue: Number(summaryRes[0]?.totalDue || 0),
      totalPaid: Number(summaryRes[0]?.totalPaid || 0)
    };

    let query = baseQuery.orderBy(desc(installmentSchedulesTable.due_date)) as any;
    
    if (filters.page && filters.limit) {
      query = query.limit(filters.limit).offset((filters.page - 1) * filters.limit);
    }

    const data = await query;
    await ReportsService.attachProductsToReport(data, 'saleId');
    return { data, total, summary };
  }

  // Receipts Report
  static async getReceiptsReport(filters: { routeId?: string; branchId?: string; startDate?: string; endDate?: string; userId?: string; page?: number; limit?: number; }) {
    const conditions = [];
    const { start, end } = parseReportDateRange(filters.startDate, filters.endDate);
    if (filters.routeId) conditions.push(eq(customersTable.route_id, filters.routeId));
    if (filters.userId) conditions.push(eq(collectionReceiptsTable.collected_by, filters.userId));
    if (start) conditions.push(gte(collectionReceiptsTable.created_at, start));
    if (end) conditions.push(lte(collectionReceiptsTable.created_at, end));
    if (filters.branchId) conditions.push(eq(salesTable.branch_id, filters.branchId));

    const baseQuery = db
      .select({
        id: collectionReceiptsTable.id,
        receiptNo: collectionReceiptsTable.receipt_no,
        date: collectionReceiptsTable.created_at,
        customerName: customersTable.full_name,
        routeName: routesTable.name,
        amount: collectionReceiptsTable.amount,
        balanceAfterReceipt: collectionReceiptsTable.balance_after_receipt,
        paymentMode: collectionReceiptsTable.payment_mode,
        collectedBy: usersTable.name,
        saleId: installmentContractsTable.sale_id,
      })
      .from(collectionReceiptsTable)
      .innerJoin(customersTable, eq(collectionReceiptsTable.customer_id, customersTable.id))
      .leftJoin(installmentContractsTable, eq(collectionReceiptsTable.contract_id, installmentContractsTable.id))
      .leftJoin(salesTable, eq(installmentContractsTable.sale_id, salesTable.id))
      .leftJoin(routesTable, eq(customersTable.route_id, routesTable.id))
      .leftJoin(usersTable, eq(collectionReceiptsTable.collected_by, usersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const summaryRes = await db.select({ 
      count: sql<number>`count(*)`,
      totalAmount: sql<number>`COALESCE(SUM(${collectionReceiptsTable.amount}), 0)`
    })
      .from(collectionReceiptsTable)
      .innerJoin(customersTable, eq(collectionReceiptsTable.customer_id, customersTable.id))
      .leftJoin(installmentContractsTable, eq(collectionReceiptsTable.contract_id, installmentContractsTable.id))
      .leftJoin(salesTable, eq(installmentContractsTable.sale_id, salesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    const total = summaryRes[0]?.count || 0;
    const summary = {
      totalAmount: Number(summaryRes[0]?.totalAmount || 0)
    };

    let query = baseQuery.orderBy(desc(collectionReceiptsTable.created_at)) as any;
    
    if (filters.page && filters.limit) {
      query = query.limit(filters.limit).offset((filters.page - 1) * filters.limit);
    }

    const data = await query;
    await ReportsService.attachProductsToReport(data, 'saleId');
    return { data, total, summary };
  }

  static async getProfitLossReport(filters: { startDate?: string; endDate?: string; routeId?: string; branchId?: string; }) {
    const { start, end } = parseReportDateRange(filters.startDate, filters.endDate);
    const salesConditions = [];
    if (filters.routeId) salesConditions.push(eq(customersTable.route_id, filters.routeId));
    if (start) salesConditions.push(gte(salesTable.created_at, start));
    if (end) salesConditions.push(lte(salesTable.created_at, end));
    if (filters.branchId) salesConditions.push(eq(salesTable.branch_id, filters.branchId));
    salesConditions.push(ne(salesTable.status, "CANCELLED"));

    // 1. Direct Sales Revenue, COGS, Tax, and Returns/Refunds
    const directRevenueRes = await db
      .select({
        grossRevenue: sql<number>`COALESCE(SUM(${salesTable.total} - ${salesTable.tax_amount}), 0)`,
        taxCollected: sql<number>`COALESCE(SUM(${salesTable.tax_amount}), 0)`
      })
      .from(salesTable)
      .leftJoin(customersTable, eq(salesTable.customer_id, customersTable.id))
      .where(and(eq(salesTable.sale_type, 'DIRECT'), ...(salesConditions.length > 0 ? salesConditions : [sql`1=1`])));

    const directCogsRes = await db
      .select({
        grossCogs: sql<number>`COALESCE(SUM(${saleItemsTable.quantity} * ${saleItemsTable.unit_cost}), 0)`
      })
      .from(saleItemsTable)
      .innerJoin(salesTable, eq(saleItemsTable.sale_id, salesTable.id))
      .leftJoin(customersTable, eq(salesTable.customer_id, customersTable.id))
      .where(and(eq(salesTable.sale_type, 'DIRECT'), ...(salesConditions.length > 0 ? salesConditions : [sql`1=1`])));

    // 1.1 Direct Sales Returns & Cash Refunds
    const directRefundsRes = await db
      .select({
        totalRefunds: sql<number>`COALESCE(SUM(CAST(${returnsTable.refund_amount} AS DECIMAL(14,2))), 0)`
      })
      .from(returnsTable)
      .innerJoin(salesTable, eq(returnsTable.sale_id, salesTable.id))
      .leftJoin(customersTable, eq(salesTable.customer_id, customersTable.id))
      .where(and(eq(salesTable.sale_type, 'DIRECT'), ...(salesConditions.length > 0 ? salesConditions : [sql`1=1`])));

    // 1.2 Restocked Item Cost (COGS reversal for returned items back in stock)
    const restockedCogsRes = await db
      .select({
        restockedCogs: sql<number>`COALESCE(SUM(${saleItemsTable.quantity} * ${saleItemsTable.unit_cost}), 0)`
      })
      .from(returnsTable)
      .innerJoin(salesTable, eq(returnsTable.sale_id, salesTable.id))
      .innerJoin(saleItemsTable, eq(returnsTable.sale_item_id, saleItemsTable.id))
      .leftJoin(customersTable, eq(salesTable.customer_id, customersTable.id))
      .where(and(
        eq(returnsTable.disposition, 'RESTOCKED'),
        ...(salesConditions.length > 0 ? salesConditions : [sql`1=1`])
      ));

    const grossDirectRevenue = Number(directRevenueRes[0]?.grossRevenue || 0);
    const directRefunds = Number(directRefundsRes[0]?.totalRefunds || 0);
    const netDirectRevenue = Math.max(0, grossDirectRevenue - directRefunds);

    const grossDirectCogs = Number(directCogsRes[0]?.grossCogs || 0);
    const restockedCogs = Number(restockedCogsRes[0]?.restockedCogs || 0);
    const netDirectCogs = Math.max(0, grossDirectCogs - restockedCogs);

    const directSales = {
      grossRevenue: grossDirectRevenue,
      refunds: directRefunds,
      revenue: netDirectRevenue,
      taxCollected: Number(directRevenueRes[0]?.taxCollected || 0),
      grossCogs: grossDirectCogs,
      restockedCogs: restockedCogs,
      cogs: netDirectCogs
    };

    // 2. Installment Expected Revenue, COGS, Tax, and Refunds
    const installmentRevenueRes = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${salesTable.total} - ${salesTable.tax_amount}), 0)`,
        taxCollected: sql<number>`COALESCE(SUM(${salesTable.tax_amount}), 0)`,
        interest: sql<number>`COALESCE(SUM(${installmentContractsTable.total_payable} - ${installmentContractsTable.principal}), 0)`
      })
      .from(installmentContractsTable)
      .innerJoin(salesTable, eq(installmentContractsTable.sale_id, salesTable.id))
      .innerJoin(customersTable, eq(installmentContractsTable.customer_id, customersTable.id))
      .where(and(...(salesConditions.length > 0 ? salesConditions : [sql`1=1`])));

    const installmentCogsRes = await db
      .select({
        cogs: sql<number>`COALESCE(SUM(${saleItemsTable.quantity} * ${saleItemsTable.unit_cost}), 0)`
      })
      .from(saleItemsTable)
      .innerJoin(salesTable, eq(saleItemsTable.sale_id, salesTable.id))
      .innerJoin(installmentContractsTable, eq(installmentContractsTable.sale_id, salesTable.id))
      .innerJoin(customersTable, eq(installmentContractsTable.customer_id, customersTable.id))
      .where(and(...(salesConditions.length > 0 ? salesConditions : [sql`1=1`])));

    const installmentRefundsRes = await db
      .select({
        totalRefunds: sql<number>`COALESCE(SUM(CAST(${refundsTable.amount} AS DECIMAL(14,2))), 0)`
      })
      .from(refundsTable)
      .innerJoin(installmentContractsTable, eq(refundsTable.contract_id, installmentContractsTable.id))
      .innerJoin(salesTable, eq(installmentContractsTable.sale_id, salesTable.id))
      .innerJoin(customersTable, eq(installmentContractsTable.customer_id, customersTable.id))
      .where(and(...(salesConditions.length > 0 ? salesConditions : [sql`1=1`])));

    const installmentRefunds = Number(installmentRefundsRes[0]?.totalRefunds || 0);

    const installmentSales = {
      totalRevenue: Number(installmentRevenueRes[0]?.totalRevenue || 0),
      taxCollected: Number(installmentRevenueRes[0]?.taxCollected || 0),
      interest: Number(installmentRevenueRes[0]?.interest || 0),
      cogs: Number(installmentCogsRes[0]?.cogs || 0),
      refunds: installmentRefunds,
    };

    // 3. Realized Cash (Downpayments and Receipts minus Refunds)
    const receiptsConditions = [];
    if (filters.routeId) receiptsConditions.push(eq(customersTable.route_id, filters.routeId));
    if (start) receiptsConditions.push(gte(collectionReceiptsTable.created_at, start));
    if (end) receiptsConditions.push(lte(collectionReceiptsTable.created_at, end));
    if (filters.branchId) receiptsConditions.push(eq(salesTable.branch_id, filters.branchId));

    const receiptsRes = await db
      .select({
        collected: sql<number>`COALESCE(SUM(${collectionReceiptsTable.amount}), 0)`
      })
      .from(collectionReceiptsTable)
      .innerJoin(customersTable, eq(collectionReceiptsTable.customer_id, customersTable.id))
      .innerJoin(installmentContractsTable, eq(collectionReceiptsTable.contract_id, installmentContractsTable.id))
      .innerJoin(salesTable, eq(installmentContractsTable.sale_id, salesTable.id))
      .where(and(...(receiptsConditions.length > 0 ? receiptsConditions : [sql`1=1`])));

    const downpaymentsRes = await db
      .select({
        downpayment: sql<number>`COALESCE(SUM(${salesTable.downpayment}), 0)`
      })
      .from(salesTable)
      .leftJoin(customersTable, eq(salesTable.customer_id, customersTable.id))
      .where(and(eq(salesTable.sale_type, 'INSTALLMENT'), ...(salesConditions.length > 0 ? salesConditions : [sql`1=1`])));

    const realizedCash = {
      receipts: Number(receiptsRes[0]?.collected || 0),
      downpayments: Number(downpaymentsRes[0]?.downpayment || 0)
    };

    const totalContractualRevenue = directSales.revenue + installmentSales.totalRevenue + installmentSales.interest;
    const totalContractualCogs = directSales.cogs + installmentSales.cogs;
    const contractualGrossProfit = totalContractualRevenue - totalContractualCogs;

    const totalTaxCollected = directSales.taxCollected + installmentSales.taxCollected;

    // 4. Branch Expenses
    const expensesConditions = [];
    if (filters.branchId) expensesConditions.push(eq(expensesTable.branch_id, filters.branchId));
    if (start) expensesConditions.push(gte(expensesTable.expense_date, start));
    if (end) expensesConditions.push(lte(expensesTable.expense_date, end));

    const expensesRes = await db
      .select({ total: sql<number>`COALESCE(SUM(${expensesTable.amount}), 0)` })
      .from(expensesTable)
      .where(and(...(expensesConditions.length > 0 ? expensesConditions : [sql`1=1`])));
    
    const totalExpenses = Number(expensesRes[0]?.total || 0);

    const netRealizedInstallmentReceipts = Math.max(0, realizedCash.receipts - installmentSales.refunds);
    const totalRealizedInflow = directSales.revenue + netRealizedInstallmentReceipts + realizedCash.downpayments;
    const realizedGrossProfit = totalRealizedInflow - totalContractualCogs;
    
    const realizedNetProfit = realizedGrossProfit - totalExpenses;
    const contractualNetProfit = contractualGrossProfit - totalExpenses;

    return {
      contractual: {
        grossDirectSalesRevenue: directSales.grossRevenue,
        directSalesRefunds: directSales.refunds,
        directSalesRevenue: directSales.revenue,
        installmentRevenue: installmentSales.totalRevenue,
        installmentInterest: installmentSales.interest,
        installmentRefunds: installmentSales.refunds,
        totalRevenue: totalContractualRevenue,
        totalTaxCollected: totalTaxCollected,
        totalCogs: totalContractualCogs,
        grossProfit: contractualGrossProfit,
        totalExpenses: totalExpenses,
        netProfit: contractualNetProfit
      },
      realized: {
        grossDirectSalesCash: directSales.grossRevenue,
        directSalesRefunds: directSales.refunds,
        directSalesCash: directSales.revenue,
        downpaymentsCollected: realizedCash.downpayments,
        receiptsCollected: realizedCash.receipts,
        installmentRefunds: installmentSales.refunds,
        totalInflow: totalRealizedInflow,
        totalTaxCollected: totalTaxCollected,
        totalCogs: totalContractualCogs,
        grossProfit: realizedGrossProfit,
        totalExpenses: totalExpenses,
        netProfit: realizedNetProfit
      }
    };
  }

  // Collection Efficiency Report
  static async getCollectionEfficiencyReport(filters: { startDate?: string; endDate?: string; branchId?: string; }) {
    const { start: parsedStart, end: parsedEnd } = parseReportDateRange(filters.startDate, filters.endDate);
    // Default to this month if no dates provided
    const start = parsedStart || new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0, 0);
    const end = parsedEnd || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    const branchCondition = filters.branchId ? eq(salesTable.branch_id, filters.branchId) : sql`1=1`;

    // 1. Get Targets (Schedules Due)
    const targetsRes = await db
      .select({
        routeId: customersTable.route_id,
        target: sql<number>`SUM(${installmentSchedulesTable.amount_due})`
      })
      .from(installmentSchedulesTable)
      .innerJoin(installmentContractsTable, eq(installmentSchedulesTable.contract_id, installmentContractsTable.id))
      .innerJoin(customersTable, eq(installmentContractsTable.customer_id, customersTable.id))
      .innerJoin(salesTable, eq(installmentContractsTable.sale_id, salesTable.id))
      .where(and(
        gte(installmentSchedulesTable.due_date, startStr),
        lte(installmentSchedulesTable.due_date, endStr),
        branchCondition
      ))
      .groupBy(customersTable.route_id);

    // 2. Get Actuals (Receipts Collected)
    const actualsRes = await db
      .select({
        routeId: customersTable.route_id,
        collected: sql<number>`SUM(${collectionReceiptsTable.amount})`
      })
      .from(collectionReceiptsTable)
      .innerJoin(customersTable, eq(collectionReceiptsTable.customer_id, customersTable.id))
      .innerJoin(installmentContractsTable, eq(collectionReceiptsTable.contract_id, installmentContractsTable.id))
      .innerJoin(salesTable, eq(installmentContractsTable.sale_id, salesTable.id))
      .where(and(
        gte(collectionReceiptsTable.created_at, start),
        lte(collectionReceiptsTable.created_at, end),
        branchCondition
      ))
      .groupBy(customersTable.route_id);

    // 3. Get All Routes for Mapping
    const allRoutes = await db.select().from(routesTable);

    // Merge Data
    const efficiencyData = allRoutes.map(route => {
      const targetObj = targetsRes.find(t => t.routeId === route.id);
      const actualObj = actualsRes.find(a => a.routeId === route.id);

      const expectedAmount = Number(targetObj?.target || 0);
      const collectedAmount = Number(actualObj?.collected || 0);
      
      let efficiencyPercentage = 0;
      if (expectedAmount > 0) {
        efficiencyPercentage = (collectedAmount / expectedAmount) * 100;
      } else if (collectedAmount > 0) {
        efficiencyPercentage = 100; // Collected without expectations
      }

      return {
        routeId: route.id,
        routeName: route.name,
        expectedAmount,
        collectedAmount,
        efficiencyPercentage: Math.round(efficiencyPercentage * 100) / 100 // Round to 2 decimals
      };
    });

    // Sort by Expected Amount DESC
    efficiencyData.sort((a, b) => b.expectedAmount - a.expectedAmount);

    return efficiencyData;
  }

  // Expense Report
  static async getExpenseReport(filters: { branchId?: string; startDate?: string; endDate?: string; categoryId?: string; page?: number; limit?: number; }) {
    const conditions = [];
    const { start, end } = parseReportDateRange(filters.startDate, filters.endDate);
    if (filters.branchId) conditions.push(eq(expensesTable.branch_id, filters.branchId));
    if (filters.categoryId) conditions.push(eq(expensesTable.category_id, filters.categoryId));
    if (start) conditions.push(gte(expensesTable.expense_date, start));
    if (end) conditions.push(lte(expensesTable.expense_date, end));

    const baseQuery = db
      .select({
        id: expensesTable.id,
        date: expensesTable.expense_date,
        branchName: branchesTable.name,
        categoryName: expenseCategoriesTable.name,
        categoryType: expenseCategoriesTable.type,
        amount: expensesTable.amount,
        description: expensesTable.description,
        createdBy: usersTable.name
      })
      .from(expensesTable)
      .innerJoin(branchesTable, eq(expensesTable.branch_id, branchesTable.id))
      .innerJoin(expenseCategoriesTable, eq(expensesTable.category_id, expenseCategoriesTable.id))
      .innerJoin(usersTable, eq(expensesTable.user_id, usersTable.id))
      .where(and(...conditions));

    const totalCountRes = await db.select({ count: sql<number>`count(*)` }).from(expensesTable).where(and(...conditions));
    const total = totalCountRes[0]?.count || 0;

    const totalAmountRes = await db.select({ total: sql<number>`SUM(${expensesTable.amount})` }).from(expensesTable).where(and(...conditions));
    const totalAmount = Number(totalAmountRes[0]?.total || 0);

    let query = baseQuery.orderBy(desc(expensesTable.expense_date)) as any;
    
    if (filters.page && filters.limit) {
      query = query.limit(filters.limit).offset((filters.page - 1) * filters.limit);
    }

    const data = await query;
    return { data, total, totalAmount };
  }

  // Tax Summary Report
  static async getTaxReport(filters: { branchId?: string; startDate?: string; endDate?: string; page?: number; limit?: number; }) {
    const conditions = [];
    const { start, end } = parseReportDateRange(filters.startDate, filters.endDate);
    if (filters.branchId) conditions.push(eq(salesTable.branch_id, filters.branchId));
    if (start) conditions.push(gte(salesTable.created_at, start));
    if (end) conditions.push(lte(salesTable.created_at, end));
    conditions.push(sql`${salesTable.tax_amount} > 0`);

    const baseQuery = db
      .select({
        id: salesTable.id,
        referenceNumber: salesTable.reference_number,
        date: salesTable.created_at,
        branchName: branchesTable.name,
        saleType: salesTable.sale_type,
        netAmount: sql<number>`${salesTable.total} - ${salesTable.tax_amount}`,
        taxAmount: salesTable.tax_amount,
        taxDetails: salesTable.tax_details
      })
      .from(salesTable)
      .innerJoin(branchesTable, eq(salesTable.branch_id, branchesTable.id))
      .where(and(...conditions));

    const totalCountRes = await db.select({ count: sql<number>`count(*)` }).from(salesTable).where(and(...conditions));
    const total = totalCountRes[0]?.count || 0;

    const totalTaxRes = await db.select({ total: sql<number>`SUM(${salesTable.tax_amount})` }).from(salesTable).where(and(...conditions));
    const totalTaxAmount = Number(totalTaxRes[0]?.total || 0);

    let query = baseQuery.orderBy(desc(salesTable.created_at)) as any;
    
    if (filters.page && filters.limit) {
      query = query.limit(filters.limit).offset((filters.page - 1) * filters.limit);
    }

    const data = await query;
    return { data, total, totalTaxAmount };
  }

  // Product Performance Report
  static async getProductPerformanceReport(filters: { branchId?: string; startDate?: string; endDate?: string; categoryId?: string; page?: number; limit?: number; }) {
    const conditions = [];
    const { start, end } = parseReportDateRange(filters.startDate, filters.endDate);
    if (filters.branchId) conditions.push(eq(salesTable.branch_id, filters.branchId));
    if (start) conditions.push(gte(salesTable.created_at, start));
    if (end) conditions.push(lte(salesTable.created_at, end));
    if (filters.categoryId) conditions.push(eq(productsTable.category_id, filters.categoryId));

    const baseQuery = db
      .select({
        productId: productsTable.id,
        productName: productsTable.name,
        sku: productsTable.sku,
        categoryName: categoriesTable.name,
        totalQuantitySold: sql<number>`SUM(${saleItemsTable.quantity})`,
        totalRevenue: sql<number>`SUM(${saleItemsTable.line_total})`
      })
      .from(saleItemsTable)
      .innerJoin(salesTable, eq(saleItemsTable.sale_id, salesTable.id))
      .innerJoin(productsTable, eq(saleItemsTable.product_id, productsTable.id))
      .innerJoin(categoriesTable, eq(productsTable.category_id, categoriesTable.id))
      .where(and(...conditions))
      .groupBy(productsTable.id, productsTable.name, productsTable.sku, categoriesTable.name);

    const allData = await baseQuery.orderBy(desc(sql`SUM(${saleItemsTable.line_total})`));
    
    const total = allData.length;
    const data = (filters.page && filters.limit) ? allData.slice((filters.page - 1) * filters.limit, filters.page * filters.limit) : allData;

    return { data, total };
  }

  // Bookings / Pre-Orders Report
  static async getBookingsReport(filters: { branchId?: string; status?: string; startDate?: string; endDate?: string; page?: number; limit?: number; }) {
    const conditions = [];
    const { start, end } = parseReportDateRange(filters.startDate, filters.endDate);
    if (filters.branchId) conditions.push(eq(preOrdersTable.branch_id, filters.branchId));
    if (filters.status) conditions.push(eq(preOrdersTable.status, filters.status as any));
    if (start) conditions.push(gte(preOrdersTable.created_at, start));
    if (end) conditions.push(lte(preOrdersTable.created_at, end));

    const baseQuery = db
      .select({
        id: preOrdersTable.id,
        referenceNumber: preOrdersTable.reference_number,
        date: preOrdersTable.created_at,
        branchName: branchesTable.name,
        customerName: customersTable.full_name,
        status: preOrdersTable.status,
        advancePayment: preOrdersTable.advance_payment,
        paymentMethod: preOrdersTable.payment_method,
        createdBy: usersTable.name
      })
      .from(preOrdersTable)
      .leftJoin(branchesTable, eq(preOrdersTable.branch_id, branchesTable.id))
      .leftJoin(customersTable, eq(preOrdersTable.customer_id, customersTable.id))
      .leftJoin(usersTable, eq(preOrdersTable.created_by, usersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const totalCountRes = await db.select({ count: sql<number>`count(*)` }).from(preOrdersTable).where(conditions.length > 0 ? and(...conditions) : undefined);
    const total = totalCountRes[0]?.count || 0;

    const totalAdvancesRes = await db.select({ total: sql<number>`SUM(CAST(${preOrdersTable.advance_payment} AS DECIMAL(14,2)))` }).from(preOrdersTable).where(conditions.length > 0 ? and(...conditions) : undefined);
    const totalAdvances = Number(totalAdvancesRes[0]?.total || 0);

    let query = baseQuery.orderBy(desc(preOrdersTable.created_at)) as any;
    
    if (filters.page && filters.limit) {
      query = query.limit(filters.limit).offset((filters.page - 1) * filters.limit);
    }

    let data = await query;

    // Attach items
    const preOrderIds = data.map((d: any) => d.id);
    if (preOrderIds.length > 0) {
      const items = await db.select({ preOrderId: preOrderItemsTable.pre_order_id, productName: productsTable.name, quantity: preOrderItemsTable.quantity })
        .from(preOrderItemsTable)
        .innerJoin(productsTable, eq(preOrderItemsTable.product_id, productsTable.id))
        .where(inArray(preOrderItemsTable.pre_order_id, preOrderIds));

      const itemMap = items.reduce((acc, item) => {
        if (!acc[item.preOrderId]) acc[item.preOrderId] = [];
        acc[item.preOrderId].push(`${item.productName} (x${item.quantity})`);
        return acc;
      }, {} as Record<string, string[]>);

      data = data.map((d: any) => ({
        ...d,
        products: itemMap[d.id]?.join(', ') || '-'
      }));
    } else {
      data = data.map((d: any) => ({ ...d, products: '-' }));
    }

    return { data, total, totalAdvances };
  }

  // Staff Payroll & Collections Performance Report
  static async getPayrollReport(filters: { branchId?: string; userId?: string; startDate?: string; endDate?: string; page?: number; limit?: number; }) {
    const { start, end } = parseReportDateRange(filters.startDate, filters.endDate);

    // 1. Fetch Users
    const userConditions = [];
    if (filters.userId) userConditions.push(eq(usersTable.id, filters.userId));
    if (filters.branchId) userConditions.push(eq(userBranchesTable.branch_id, filters.branchId));

    const usersQuery = db.select({
      userId: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: sql<string>`COALESCE(${rolesTable.name}, 'STAFF')`,
      branchName: sql<string>`COALESCE(${branchesTable.name}, '-')`,
    })
    .from(usersTable)
    .leftJoin(rolesTable, eq(usersTable.role_id, rolesTable.id))
    .leftJoin(userBranchesTable, eq(usersTable.id, userBranchesTable.user_id))
    .leftJoin(branchesTable, eq(userBranchesTable.branch_id, branchesTable.id));

    if (userConditions.length > 0) {
      usersQuery.where(and(...userConditions));
    }

    const rawUsers = await usersQuery.orderBy(asc(usersTable.name));

    // Deduplicate users in case user is assigned to multiple branches
    const userMapTemp = new Map<string, any>();
    for (const u of rawUsers) {
      if (!userMapTemp.has(u.userId)) {
        userMapTemp.set(u.userId, u);
      }
    }
    const users = Array.from(userMapTemp.values());

    // 2. Aggregate Direct Sales (created_by = user)
    const directSalesConditions = [
      eq(salesTable.sale_type, "DIRECT"),
      ne(salesTable.status, "CANCELLED")
    ];
    if (filters.userId) directSalesConditions.push(eq(salesTable.created_by, filters.userId));
    if (filters.branchId) directSalesConditions.push(eq(salesTable.branch_id, filters.branchId));
    if (start) directSalesConditions.push(gte(salesTable.created_at, start));
    if (end) directSalesConditions.push(lte(salesTable.created_at, end));

    const directSalesAgg = await db.select({
      userId: salesTable.created_by,
      count: sql<number>`COUNT(*)`,
      totalAmount: sql<number>`COALESCE(SUM(CAST(${salesTable.total} AS DECIMAL(14,2))), 0)`
    })
    .from(salesTable)
    .where(and(...directSalesConditions))
    .groupBy(salesTable.created_by);

    const directSalesMap = directSalesAgg.reduce((acc, d) => {
      if (d.userId) {
        acc[d.userId] = {
          directCount: Number(d.count || 0),
          directAmount: Number(d.totalAmount || 0)
        };
      }
      return acc;
    }, {} as Record<string, any>);

    // 2.1 Aggregate Direct Sales Refunds (for sales created by user)
    const directRefundsConditions = [
      eq(salesTable.sale_type, "DIRECT"),
      ne(salesTable.status, "CANCELLED")
    ];
    if (filters.userId) directRefundsConditions.push(eq(salesTable.created_by, filters.userId));
    if (filters.branchId) directRefundsConditions.push(eq(salesTable.branch_id, filters.branchId));
    if (start) directRefundsConditions.push(gte(returnsTable.created_at, start));
    if (end) directRefundsConditions.push(lte(returnsTable.created_at, end));

    const directRefundsAgg = await db.select({
      userId: salesTable.created_by,
      count: sql<number>`COUNT(*)`,
      refundAmount: sql<number>`COALESCE(SUM(CAST(${returnsTable.refund_amount} AS DECIMAL(14,2))), 0)`
    })
    .from(returnsTable)
    .innerJoin(salesTable, eq(returnsTable.sale_id, salesTable.id))
    .where(and(...directRefundsConditions))
    .groupBy(salesTable.created_by);

    const directRefundsMap = directRefundsAgg.reduce((acc, r) => {
      if (r.userId) {
        acc[r.userId] = {
          refundCount: Number(r.count || 0),
          refundAmount: Number(r.refundAmount || 0)
        };
      }
      return acc;
    }, {} as Record<string, any>);

    // 3. Aggregate Installment Sales Downpayments (created_by = user)
    const installmentSalesConditions = [
      eq(salesTable.sale_type, "INSTALLMENT"),
      ne(salesTable.status, "CANCELLED")
    ];
    if (filters.userId) installmentSalesConditions.push(eq(salesTable.created_by, filters.userId));
    if (filters.branchId) installmentSalesConditions.push(eq(salesTable.branch_id, filters.branchId));
    if (start) installmentSalesConditions.push(gte(salesTable.created_at, start));
    if (end) installmentSalesConditions.push(lte(salesTable.created_at, end));

    const installmentSalesAgg = await db.select({
      userId: salesTable.created_by,
      count: sql<number>`COUNT(*)`,
      downpaymentTotal: sql<number>`COALESCE(SUM(CAST(${salesTable.downpayment} AS DECIMAL(14,2))), 0)`
    })
    .from(salesTable)
    .where(and(...installmentSalesConditions))
    .groupBy(salesTable.created_by);

    const installmentSalesMap = installmentSalesAgg.reduce((acc, i) => {
      if (i.userId) {
        acc[i.userId] = {
          installmentCount: Number(i.count || 0),
          downpaymentsCollected: Number(i.downpaymentTotal || 0)
        };
      }
      return acc;
    }, {} as Record<string, any>);

    // 3.1 Aggregate Installment Refunds with Option B: Downpayment Deduction & Pro-Rata Collection Sharing
    const installmentRefundsConditions = [
      eq(salesTable.sale_type, "INSTALLMENT"),
      ne(salesTable.status, "CANCELLED")
    ];
    if (filters.userId) installmentRefundsConditions.push(eq(salesTable.created_by, filters.userId));
    if (filters.branchId) installmentRefundsConditions.push(eq(salesTable.branch_id, filters.branchId));
    if (start) installmentRefundsConditions.push(gte(refundsTable.created_at, start));
    if (end) installmentRefundsConditions.push(lte(refundsTable.created_at, end));

    const refundedContracts = await db.select({
      contractId: refundsTable.contract_id,
      salesRepId: salesTable.created_by,
      downpayment: sql<number>`CAST(${salesTable.downpayment} AS DECIMAL(14,2))`,
      totalRefunded: sql<number>`SUM(CAST(${refundsTable.amount} AS DECIMAL(14,2)))`
    })
    .from(refundsTable)
    .innerJoin(installmentContractsTable, eq(refundsTable.contract_id, installmentContractsTable.id))
    .innerJoin(salesTable, eq(installmentContractsTable.sale_id, salesTable.id))
    .where(and(...installmentRefundsConditions))
    .groupBy(refundsTable.contract_id, salesTable.created_by, salesTable.downpayment);

    const downpaymentRefundsMap: Record<string, number> = {};
    const collectorRefundsMap: Record<string, number> = {};

    for (const rc of refundedContracts) {
      const salesRepId = rc.salesRepId;
      const downpayment = Number(rc.downpayment || 0);
      const totalRefunded = Number(rc.totalRefunded || 0);

      // Downpayment covers up to its full amount
      const downpaymentDeduction = Math.min(downpayment, totalRefunded);
      if (salesRepId) {
        downpaymentRefundsMap[salesRepId] = (downpaymentRefundsMap[salesRepId] || 0) + downpaymentDeduction;
      }

      // Excess refund beyond downpayment is shared pro-rata among collectors on this contract
      const excessRefund = Math.max(0, totalRefunded - downpayment);
      if (excessRefund > 0) {
        const receiptsOnContract = await db.select({
          collectorId: collectionReceiptsTable.collected_by,
          amount: sql<number>`SUM(CAST(${collectionReceiptsTable.amount} AS DECIMAL(14,2)))`
        })
        .from(collectionReceiptsTable)
        .where(eq(collectionReceiptsTable.contract_id, rc.contractId))
        .groupBy(collectionReceiptsTable.collected_by);

        const totalCollectedOnContract = receiptsOnContract.reduce((sum, r) => sum + Number(r.amount || 0), 0);
        if (totalCollectedOnContract > 0) {
          for (const rec of receiptsOnContract) {
            const collectorId = rec.collectorId;
            const collectorAmt = Number(rec.amount || 0);
            const collectorShare = (collectorAmt / totalCollectedOnContract) * excessRefund;
            if (collectorId) {
              collectorRefundsMap[collectorId] = (collectorRefundsMap[collectorId] || 0) + collectorShare;
            }
          }
        }
      }
    }

    // 4. Aggregate Collection Receipts & Downpayment Recoveries (collected_by = user)
    const receiptsConditions = [];
    if (filters.userId) receiptsConditions.push(eq(collectionReceiptsTable.collected_by, filters.userId));
    if (start) receiptsConditions.push(gte(collectionReceiptsTable.created_at, start));
    if (end) receiptsConditions.push(lte(collectionReceiptsTable.created_at, end));

    const receiptsQuery = db.select({
      userId: collectionReceiptsTable.collected_by,
      count: sql<number>`COUNT(*)`,
      amountTotal: sql<number>`COALESCE(SUM(CAST(${collectionReceiptsTable.amount} AS DECIMAL(14,2))), 0)`
    })
    .from(collectionReceiptsTable);

    if (filters.branchId) {
      receiptsQuery
        .innerJoin(installmentContractsTable, eq(collectionReceiptsTable.contract_id, installmentContractsTable.id))
        .innerJoin(salesTable, eq(installmentContractsTable.sale_id, salesTable.id));
      receiptsConditions.push(eq(salesTable.branch_id, filters.branchId));
    }

    const receiptsAgg = await receiptsQuery
    .where(receiptsConditions.length > 0 ? and(...receiptsConditions) : undefined)
    .groupBy(collectionReceiptsTable.collected_by);

    const receiptsMap = receiptsAgg.reduce((acc, r) => {
      if (r.userId) {
        acc[r.userId] = {
          receiptsCount: Number(r.count || 0),
          collectionsAmount: Number(r.amountTotal || 0)
        };
      }
      return acc;
    }, {} as Record<string, any>);

    // 5. Combine all User IDs
    const userMap = users.reduce((acc, u) => {
      acc[u.userId] = u;
      return acc;
    }, {} as Record<string, any>);

    const extraUserIds = [...new Set([
      ...Object.keys(directSalesMap),
      ...Object.keys(directRefundsMap),
      ...Object.keys(installmentSalesMap),
      ...Object.keys(downpaymentRefundsMap),
      ...Object.keys(collectorRefundsMap),
      ...Object.keys(receiptsMap)
    ])].filter(id => !userMap[id]);

    if (extraUserIds.length > 0) {
      const extraUsers = await db.select({
        userId: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: sql<string>`COALESCE(${rolesTable.name}, 'STAFF')`,
        branchName: sql<string>`COALESCE(${branchesTable.name}, '-')`,
      })
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.role_id, rolesTable.id))
      .leftJoin(userBranchesTable, eq(usersTable.id, userBranchesTable.user_id))
      .leftJoin(branchesTable, eq(userBranchesTable.branch_id, branchesTable.id))
      .where(inArray(usersTable.id, extraUserIds));

      extraUsers.forEach(u => {
        if (!userMap[u.userId]) {
          userMap[u.userId] = u;
        }
      });
    }

    const allUserIds = Array.from(new Set([
      ...users.map(u => u.userId),
      ...Object.keys(directSalesMap),
      ...Object.keys(directRefundsMap),
      ...Object.keys(installmentSalesMap),
      ...Object.keys(downpaymentRefundsMap),
      ...Object.keys(collectorRefundsMap),
      ...Object.keys(receiptsMap)
    ]));

    // 6. Build final rows
    const fullPayrollData: any[] = [];

    for (const uId of allUserIds) {
      const user = userMap[uId] || {
        userId: uId,
        name: 'Staff Member',
        email: '-',
        role: 'STAFF',
        branchName: '-'
      };

      const d = directSalesMap[uId] || { directCount: 0, directAmount: 0 };
      const dr = directRefundsMap[uId] || { refundCount: 0, refundAmount: 0 };
      const i = installmentSalesMap[uId] || { installmentCount: 0, downpaymentsCollected: 0 };
      const r = receiptsMap[uId] || { receiptsCount: 0, collectionsAmount: 0 };

      const directGrossAmount = d.directAmount;
      const directRefundAmount = dr.refundAmount;
      const directNetAmount = Math.max(0, directGrossAmount - directRefundAmount);

      const downpaymentGrossAmount = i.downpaymentsCollected;
      const downpaymentRefundAmount = downpaymentRefundsMap[uId] || 0;
      const downpaymentNetAmount = Math.max(0, downpaymentGrossAmount - downpaymentRefundAmount);

      const collectionsGrossAmount = r.collectionsAmount;
      const collectionsRefundAmount = collectorRefundsMap[uId] || 0;
      const collectionsNetAmount = Math.max(0, collectionsGrossAmount - collectionsRefundAmount);

      const totalRefundsDeducted = directRefundAmount + downpaymentRefundAmount + collectionsRefundAmount;
      const totalMoneyHandled = directNetAmount + downpaymentNetAmount + collectionsNetAmount;

      fullPayrollData.push({
        ...user,
        directSalesCount: d.directCount,
        directSalesGrossAmount: directGrossAmount,
        directRefundsAmount: directRefundAmount,
        directRefundsCount: dr.refundCount,
        directSalesAmount: directNetAmount, // Net Direct Sales for commission

        installmentSalesCount: i.installmentCount,
        downpaymentsGrossAmount: downpaymentGrossAmount,
        downpaymentsRefundAmount: downpaymentRefundAmount,
        downpaymentsCollected: downpaymentNetAmount, // Net Downpayment

        receiptsCount: r.receiptsCount,
        collectionsGrossAmount: collectionsGrossAmount,
        collectionsRefundAmount: collectionsRefundAmount,
        collectionsAmount: collectionsNetAmount, // Net Collections

        totalRefundsDeducted,
        totalMoneyHandled
      });
    }

    // Sort by totalMoneyHandled descending
    fullPayrollData.sort((a, b) => b.totalMoneyHandled - a.totalMoneyHandled || a.name.localeCompare(b.name));

    const total = fullPayrollData.length;

    const summary = {
      grandTotalDirectSalesGross: fullPayrollData.reduce((sum, u) => sum + u.directSalesGrossAmount, 0),
      grandTotalDirectRefunds: fullPayrollData.reduce((sum, u) => sum + u.directRefundsAmount, 0),
      grandTotalDirectSales: fullPayrollData.reduce((sum, u) => sum + u.directSalesAmount, 0),

      grandTotalDownpaymentsGross: fullPayrollData.reduce((sum, u) => sum + u.downpaymentsGrossAmount, 0),
      grandTotalDownpaymentsRefunds: fullPayrollData.reduce((sum, u) => sum + u.downpaymentsRefundAmount, 0),
      grandTotalDownpayments: fullPayrollData.reduce((sum, u) => sum + u.downpaymentsCollected, 0),

      grandTotalCollectionsGross: fullPayrollData.reduce((sum, u) => sum + u.collectionsGrossAmount, 0),
      grandTotalCollectionsRefunds: fullPayrollData.reduce((sum, u) => sum + u.collectionsRefundAmount, 0),
      grandTotalCollections: fullPayrollData.reduce((sum, u) => sum + u.collectionsAmount, 0),

      grandTotalRefunds: fullPayrollData.reduce((sum, u) => sum + u.totalRefundsDeducted, 0),
      grandTotalHandled: fullPayrollData.reduce((sum, u) => sum + u.totalMoneyHandled, 0),
    };

    let paginatedData = fullPayrollData;
    if (filters.page && filters.limit) {
      paginatedData = fullPayrollData.slice((filters.page - 1) * filters.limit, filters.page * filters.limit);
    }

    return { data: paginatedData, total, summary };
  }

  static async getMyStats(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthName = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

    const formatDateStr = (d: Date) => {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const dateRangeLabel = `${formatDateStr(startOfMonth)} - ${formatDateStr(endOfMonth)}`;

    // Query 1: Direct Sales by this user in running month
    const directSalesRes = await db
      .select({
        count: sql<number>`count(*)`,
        totalAmount: sql<number>`COALESCE(sum(${salesTable.total}), 0)`,
      })
      .from(salesTable)
      .where(
        and(
          eq(salesTable.created_by, userId),
          eq(salesTable.sale_type, 'DIRECT'),
          eq(salesTable.status, 'COMPLETED'),
          gte(salesTable.created_at, startOfMonth),
          lte(salesTable.created_at, endOfMonth)
        )
      );

    // Query 1.1: Direct Sales Returns / Refunds for sales created by this user
    const directRefundsRes = await db
      .select({
        count: sql<number>`count(*)`,
        refundTotal: sql<number>`COALESCE(sum(CAST(${returnsTable.refund_amount} AS DECIMAL(14,2))), 0)`
      })
      .from(returnsTable)
      .innerJoin(salesTable, eq(returnsTable.sale_id, salesTable.id))
      .where(
        and(
          eq(salesTable.created_by, userId),
          eq(salesTable.sale_type, 'DIRECT'),
          gte(returnsTable.created_at, startOfMonth),
          lte(returnsTable.created_at, endOfMonth)
        )
      );

    // Query 2: Installment Sales by this user in running month
    const installmentSalesRes = await db
      .select({
        count: sql<number>`count(*)`,
        downpaymentsSum: sql<number>`COALESCE(sum(${salesTable.downpayment}), 0)`,
        totalValueSum: sql<number>`COALESCE(sum(${salesTable.total}), 0)`,
      })
      .from(salesTable)
      .where(
        and(
          eq(salesTable.created_by, userId),
          eq(salesTable.sale_type, 'INSTALLMENT'),
          ne(salesTable.status, 'CANCELLED'),
          gte(salesTable.created_at, startOfMonth),
          lte(salesTable.created_at, endOfMonth)
        )
      );

    // Query 2.1: Installment Contract Refunds for contracts in running month
    const refundedContracts = await db.select({
      contractId: refundsTable.contract_id,
      salesRepId: salesTable.created_by,
      downpayment: sql<number>`CAST(${salesTable.downpayment} AS DECIMAL(14,2))`,
      totalRefunded: sql<number>`SUM(CAST(${refundsTable.amount} AS DECIMAL(14,2)))`
    })
    .from(refundsTable)
    .innerJoin(installmentContractsTable, eq(refundsTable.contract_id, installmentContractsTable.id))
    .innerJoin(salesTable, eq(installmentContractsTable.sale_id, salesTable.id))
    .where(
      and(
        eq(salesTable.sale_type, 'INSTALLMENT'),
        ne(salesTable.status, 'CANCELLED'),
        gte(refundsTable.created_at, startOfMonth),
        lte(refundsTable.created_at, endOfMonth)
      )
    )
    .groupBy(refundsTable.contract_id, salesTable.created_by, salesTable.downpayment);

    let downpaymentRefundsAmount = 0;
    let collectorRefundsAmount = 0;

    for (const rc of refundedContracts) {
      const salesRepId = rc.salesRepId;
      const downpayment = Number(rc.downpayment || 0);
      const totalRefunded = Number(rc.totalRefunded || 0);

      // Downpayment deduction attributed to the sales rep
      const downpaymentDeduction = Math.min(downpayment, totalRefunded);
      if (salesRepId === userId) {
        downpaymentRefundsAmount += downpaymentDeduction;
      }

      // Excess refund beyond downpayment shared pro-rata among collectors on this contract
      const excessRefund = Math.max(0, totalRefunded - downpayment);
      if (excessRefund > 0) {
        const receiptsOnContract = await db.select({
          collectorId: collectionReceiptsTable.collected_by,
          amount: sql<number>`SUM(CAST(${collectionReceiptsTable.amount} AS DECIMAL(14,2)))`
        })
        .from(collectionReceiptsTable)
        .where(eq(collectionReceiptsTable.contract_id, rc.contractId))
        .groupBy(collectionReceiptsTable.collected_by);

        const totalCollectedOnContract = receiptsOnContract.reduce((sum, r) => sum + Number(r.amount || 0), 0);
        if (totalCollectedOnContract > 0) {
          for (const rec of receiptsOnContract) {
            if (rec.collectorId === userId) {
              const collectorAmt = Number(rec.amount || 0);
              collectorRefundsAmount += (collectorAmt / totalCollectedOnContract) * excessRefund;
            }
          }
        }
      }
    }

    // Query 3: Collections / Payment Receipts by this user in running month
    const collectionsRes = await db
      .select({
        count: sql<number>`count(*)`,
        collectionsAmount: sql<number>`COALESCE(sum(${collectionReceiptsTable.amount}), 0)`,
      })
      .from(collectionReceiptsTable)
      .where(
        and(
          eq(collectionReceiptsTable.collected_by, userId),
          gte(collectionReceiptsTable.created_at, startOfMonth),
          lte(collectionReceiptsTable.created_at, endOfMonth)
        )
      );

    const directSalesCount = Number(directSalesRes[0]?.count || 0);
    const directSalesGrossAmount = Number(directSalesRes[0]?.totalAmount || 0);
    const directRefundsCount = Number(directRefundsRes[0]?.count || 0);
    const directRefundsAmount = Number(directRefundsRes[0]?.refundTotal || 0);
    const directSalesNetAmount = Math.max(0, directSalesGrossAmount - directRefundsAmount);

    const installmentSalesCount = Number(installmentSalesRes[0]?.count || 0);
    const installmentDownpaymentsGross = Number(installmentSalesRes[0]?.downpaymentsSum || 0);
    const installmentTotalValue = Number(installmentSalesRes[0]?.totalValueSum || 0);
    const installmentDownpaymentsNet = Math.max(0, installmentDownpaymentsGross - downpaymentRefundsAmount);

    const collectionsCount = Number(collectionsRes[0]?.count || 0);
    const collectionsGrossAmount = Number(collectionsRes[0]?.collectionsAmount || 0);
    const collectionsNetAmount = Math.max(0, collectionsGrossAmount - collectorRefundsAmount);

    const totalRefundsDeducted = directRefundsAmount + downpaymentRefundsAmount + collectorRefundsAmount;
    const totalGrossHandled = directSalesGrossAmount + installmentDownpaymentsGross + collectionsGrossAmount;
    const totalMoneyHandled = directSalesNetAmount + installmentDownpaymentsNet + collectionsNetAmount;

    return {
      runningMonth: {
        monthName,
        dateRangeLabel,
        startDate: startOfMonth.toISOString(),
        endDate: endOfMonth.toISOString(),
      },
      directSales: {
        count: directSalesCount,
        grossAmount: directSalesGrossAmount,
        refundsAmount: directRefundsAmount,
        refundsCount: directRefundsCount,
        netAmount: directSalesNetAmount,
        totalRevenue: directSalesNetAmount, // backward-compatible alias
      },
      installmentSales: {
        count: installmentSalesCount,
        downpaymentsGross: installmentDownpaymentsGross,
        downpaymentsRefunds: downpaymentRefundsAmount,
        downpaymentsCollected: installmentDownpaymentsNet, // Net downpayments
        totalContractValue: installmentTotalValue,
      },
      collections: {
        count: collectionsCount,
        collectionsGross: collectionsGrossAmount,
        collectionsRefunds: collectorRefundsAmount,
        totalCollected: collectionsNetAmount, // Net collections
      },
      refunds: {
        totalRefundsDeducted,
        directRefunds: directRefundsAmount,
        directRefundsCount,
        downpaymentRefunds: downpaymentRefundsAmount,
        collectorRefunds: collectorRefundsAmount,
      },
      summary: {
        totalGrossHandled,
        totalRefundsDeducted,
        totalMoneyHandled,
      }
    };
  }

  static async getSerialLifecycleReport(serialInput: string[] | string) {
    let list: string[] = [];
    if (Array.isArray(serialInput)) {
      list = serialInput.map(s => String(s || '').trim()).filter(Boolean);
    } else if (typeof serialInput === 'string') {
      list = serialInput.split(/[\n,\s]+/).map(s => String(s || '').trim()).filter(Boolean);
    }

    const cleanSerials = [...new Set(list)].slice(0, 50);

    if (cleanSerials.length === 0) {
      return {
        data: [],
        summary: { searched: 0, found: 0, notFound: 0, inStock: 0, onTrip: 0, sold: 0, activeInstallments: 0 }
      };
    }

    const serialRecords = await db
      .select({
        id: serialItemsTable.id,
        serial_number: serialItemsTable.serial_number,
        status: serialItemsTable.status,
        created_at: serialItemsTable.created_at,
        product_id: productsTable.id,
        product_name: productsTable.name,
        product_sku: productsTable.sku,
        brand_name: brandsTable.name,
        category_name: categoriesTable.name,
        warehouse_id: warehousesTable.id,
        warehouse_name: warehousesTable.name,
        intake_item_id: serialItemsTable.intake_item_id,
        unit_cost: intakeItemsTable.unit_cost,
        intake_id: intakeOrdersTable.id,
        intake_ref: intakeOrdersTable.invoice_number,
        intake_date: intakeOrdersTable.created_at,
        supplier_name: intakeOrdersTable.supplier_name,
      })
      .from(serialItemsTable)
      .innerJoin(productsTable, eq(serialItemsTable.product_id, productsTable.id))
      .leftJoin(brandsTable, eq(productsTable.brand_id, brandsTable.id))
      .leftJoin(categoriesTable, eq(productsTable.category_id, categoriesTable.id))
      .leftJoin(warehousesTable, eq(serialItemsTable.warehouse_id, warehousesTable.id))
      .leftJoin(intakeItemsTable, eq(serialItemsTable.intake_item_id, intakeItemsTable.id))
      .leftJoin(intakeOrdersTable, eq(intakeItemsTable.intake_order_id, intakeOrdersTable.id))
      .leftJoin(suppliersTable, eq(intakeOrdersTable.supplier_id, suppliersTable.id))
      .where(inArray(serialItemsTable.serial_number, cleanSerials));

    const serialRecordMap = new Map<string, any>();
    for (const r of serialRecords) {
      if (r && r.serial_number) {
        serialRecordMap.set(String(r.serial_number).trim().toLowerCase(), r);
      }
    }

    const resultData: any[] = [];
    let inStockCount = 0;
    let onTripCount = 0;
    let soldCount = 0;
    let activeInstallmentsCount = 0;

    for (const searchedSerial of cleanSerials) {
      const serialKey = String(searchedSerial || '').trim().toLowerCase();
      const rec = serialRecordMap.get(serialKey);

      if (!rec) {
        resultData.push({
          serial_number: searchedSerial,
          status: 'NOT_FOUND',
          product: null,
          intake: null,
          sale: null,
          installment: null,
        });
        continue;
      }

      if (rec.status === 'IN_STOCK') inStockCount++;
      else if (rec.status === 'ON_TRIP') onTripCount++;
      else if (rec.status === 'SOLD') soldCount++;

      // Check if sold
      const saleItemRecs = await db
        .select({
          sale_id: saleItemsTable.sale_id,
          unit_price: saleItemsTable.unit_price,
          line_total: saleItemsTable.line_total,
          sale_ref: salesTable.reference_number,
          offline_receipt: salesTable.offline_receipt_number,
          sale_type: salesTable.sale_type,
          payment_mode: salesTable.payment_mode,
          subtotal: salesTable.subtotal,
          downpayment: salesTable.downpayment,
          total: salesTable.total,
          sale_date: salesTable.created_at,
          sale_status: salesTable.status,
          rep_name: usersTable.name,
          rep_email: usersTable.email,
          rep_phone: usersTable.phone_number,
          customer_id: customersTable.id,
          customer_name: customersTable.full_name,
          customer_nic: customersTable.nic,
          customer_mobile: customersTable.mobile,
          customer_address: customersTable.address,
          trip_id: salesTable.trip_id,
        })
        .from(saleItemsTable)
        .innerJoin(salesTable, eq(saleItemsTable.sale_id, salesTable.id))
        .leftJoin(usersTable, eq(salesTable.created_by, usersTable.id))
        .leftJoin(customersTable, eq(salesTable.customer_id, customersTable.id))
        .where(eq(saleItemsTable.serial_item_id, rec.id))
        .limit(1);

      let saleData: any = null;
      let installmentData: any = null;

      if (saleItemRecs.length > 0) {
        const s = saleItemRecs[0];
        
        let tripDetails: any = null;
        if (s.trip_id) {
          const tripRecs = await db
            .select({
              trip_id: tripsTable.id,
              status: tripsTable.status,
              vehicle: fleetVehiclesTable.license_plate,
              driver: usersTable.name,
            })
            .from(tripsTable)
            .leftJoin(fleetVehiclesTable, eq(tripsTable.vehicle_id, fleetVehiclesTable.id))
            .leftJoin(usersTable, eq(tripsTable.incharge_id, usersTable.id))
            .where(eq(tripsTable.id, s.trip_id))
            .limit(1);
          if (tripRecs.length > 0) tripDetails = tripRecs[0];
        }

        saleData = {
          sale_id: s.sale_id,
          reference_number: s.sale_ref,
          offline_receipt_number: s.offline_receipt,
          sale_type: s.sale_type,
          payment_mode: s.payment_mode,
          sale_date: s.sale_date,
          status: s.sale_status,
          unit_price: Number(s.unit_price || 0),
          total: Number(s.total || 0),
          downpayment: Number(s.downpayment || 0),
          rep: {
            name: s.rep_name || 'System',
            email: s.rep_email || '',
            phone: s.rep_phone || '',
          },
          customer: s.customer_id ? {
            id: s.customer_id,
            name: s.customer_name || 'Walk-in',
            nic: s.customer_nic || '-',
            mobile: s.customer_mobile || '-',
            address: s.customer_address || '-',
          } : null,
          trip: tripDetails,
        };

        if (s.sale_type === 'INSTALLMENT') {
          const contracts = await db
            .select({
              contract_id: installmentContractsTable.id,
              status: installmentContractsTable.status,
              scheme_name: installmentSchemesTable.name,
              total_payable: installmentContractsTable.total_payable,
              created_at: installmentContractsTable.created_at,
            })
            .from(installmentContractsTable)
            .leftJoin(installmentSchemesTable, eq(installmentContractsTable.scheme_id, installmentSchemesTable.id))
            .where(eq(installmentContractsTable.sale_id, s.sale_id))
            .limit(1);

          if (contracts.length > 0) {
            const contract = contracts[0];
            if (contract.status === 'ACTIVE') activeInstallmentsCount++;

            const schedules = await db
              .select({
                status: installmentSchedulesTable.status,
                amount_due: installmentSchedulesTable.amount_due,
                amount_paid: installmentSchedulesTable.amount_paid,
              })
              .from(installmentSchedulesTable)
              .where(eq(installmentSchedulesTable.contract_id, contract.contract_id));

            const totalTerms = schedules.length;
            const paidTerms = schedules.filter(sch => sch.status === 'PAID').length;
            const overdueTerms = schedules.filter(sch => sch.status === 'OVERDUE').length;

            const receipts = await db
              .select({
                amount: collectionReceiptsTable.amount,
              })
              .from(collectionReceiptsTable)
              .where(eq(collectionReceiptsTable.contract_id, contract.contract_id));

            const totalReceiptsCollected = receipts.reduce((sum, r) => sum + Number(r.amount || 0), 0);
            const totalCollected = Number(s.downpayment || 0) + totalReceiptsCollected;
            const remainingBalance = Math.max(0, Number(s.total || 0) - totalCollected);

            installmentData = {
              contract_id: contract.contract_id,
              status: contract.status,
              scheme_name: contract.scheme_name || 'Standard',
              total_contract_value: Number(s.total || 0),
              downpayment_collected: Number(s.downpayment || 0),
              total_terms: totalTerms,
              paid_terms: paidTerms,
              overdue_terms: overdueTerms,
              receipts_collected_sum: totalReceiptsCollected,
              total_collected: totalCollected,
              remaining_balance: remainingBalance,
            };
          }
        }
      }

      let activeTripInfo: any = null;
      if (rec.status === 'ON_TRIP') {
        const tripStockRecs = await db
          .select({
            trip_id: tripsTable.id,
            status: tripsTable.status,
            rep_name: usersTable.name,
            license_plate: fleetVehiclesTable.license_plate,
          })
          .from(tripStockTable)
          .innerJoin(tripsTable, eq(tripStockTable.trip_id, tripsTable.id))
          .leftJoin(usersTable, eq(tripsTable.incharge_id, usersTable.id))
          .leftJoin(fleetVehiclesTable, eq(tripsTable.vehicle_id, fleetVehiclesTable.id))
          .where(and(eq(tripStockTable.serial_item_id, rec.id), inArray(tripsTable.status, ["LOADING", "DEPARTED", "IN_PROGRESS"])))
          .limit(1);

        if (tripStockRecs.length > 0) activeTripInfo = tripStockRecs[0];
      }

      resultData.push({
        serial_number: rec.serial_number,
        status: rec.status,
        created_at: rec.created_at,
        product: {
          id: rec.product_id,
          name: rec.product_name,
          sku: rec.product_sku,
          brand: rec.brand_name || '-',
          category: rec.category_name || '-',
        },
        intake: {
          supplier_name: rec.supplier_name || '-',
          intake_ref: rec.intake_ref || '-',
          intake_date: rec.intake_date || null,
          unit_cost: rec.unit_cost ? Number(rec.unit_cost) : null,
          warehouse_name: rec.warehouse_name || '-',
        },
        active_trip: activeTripInfo,
        sale: saleData,
        installment: installmentData,
      });
    }

    return {
      data: resultData,
      summary: {
        searched: cleanSerials.length,
        found: serialRecords.length,
        notFound: cleanSerials.length - serialRecords.length,
        inStock: inStockCount,
        onTrip: onTripCount,
        sold: soldCount,
        activeInstallments: activeInstallmentsCount,
      }
    };
  }

  // --- REFUNDS & RETURNS DETAILED REPORT ---

  static async getRefundsReport(filters: {
    branchId?: string;
    staffId?: string;
    channel?: 'ALL' | 'DIRECT' | 'INSTALLMENT';
    refundMode?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { start, end } = parseReportDateRange(filters.startDate, filters.endDate);

    // Fetch user and branch maps for fast lookup
    const allUsers = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable);
    const userMap: Record<string, string> = Object.fromEntries(allUsers.map(u => [u.id, u.name]));

    const allBranches = await db.select({ id: branchesTable.id, name: branchesTable.name }).from(branchesTable);
    const branchMap: Record<string, string> = Object.fromEntries(allBranches.map(b => [b.id, b.name]));

    const records: any[] = [];

    // 1. Direct Sales Returns (from returnsTable)
    if (!filters.channel || filters.channel === 'ALL' || filters.channel === 'DIRECT') {
      const returnsQuery = db.select({
        id: returnsTable.id,
        sale_id: returnsTable.sale_id,
        reference_number: salesTable.reference_number,
        offline_receipt_number: salesTable.offline_receipt_number,
        customer_id: salesTable.customer_id,
        customer_name: customersTable.full_name,
        customer_mobile: customersTable.mobile,
        sale_item_id: returnsTable.sale_item_id,
        product_name: productsTable.name,
        serial_number: serialItemsTable.serial_number,
        return_type: returnsTable.type,
        disposition: returnsTable.disposition,
        reason: returnsTable.reason,
        refund_amount: returnsTable.refund_amount,
        refund_mode: returnsTable.refund_mode,
        sold_by_id: salesTable.created_by,
        processed_by_id: returnsTable.processed_by,
        branch_id: salesTable.branch_id,
        created_at: returnsTable.created_at,
      })
      .from(returnsTable)
      .innerJoin(salesTable, eq(returnsTable.sale_id, salesTable.id))
      .leftJoin(customersTable, eq(salesTable.customer_id, customersTable.id))
      .leftJoin(saleItemsTable, eq(returnsTable.sale_item_id, saleItemsTable.id))
      .leftJoin(productsTable, eq(saleItemsTable.product_id, productsTable.id))
      .leftJoin(serialItemsTable, eq(returnsTable.serial_item_id, serialItemsTable.id));

      const rawReturns = await returnsQuery.execute();

      for (const r of rawReturns) {
        records.push({
          id: r.id,
          channel: 'DIRECT',
          reference_no: r.offline_receipt_number ? `REC-${r.offline_receipt_number}` : (r.reference_number || `SALE-${r.sale_id.substring(0, 8)}`),
          sale_id: r.sale_id,
          customer_id: r.customer_id,
          customer_name: r.customer_name || 'Walk-in Customer',
          customer_mobile: r.customer_mobile || '-',
          product_name: r.product_name || 'Product Item',
          serial_number: r.serial_number || '-',
          return_type: r.return_type || 'CUSTOMER_RETURN',
          disposition: r.disposition || 'RESTOCKED',
          reason: r.reason || 'Product Return',
          refund_amount: parseFloat(r.refund_amount || '0'),
          refund_mode: r.refund_mode || 'CASH',
          sold_by_id: r.sold_by_id,
          sold_by_name: userMap[r.sold_by_id] || 'Staff',
          processed_by_id: r.processed_by_id,
          processed_by_name: userMap[r.processed_by_id] || 'Staff',
          branch_id: r.branch_id,
          branch_name: branchMap[r.branch_id] || '-',
          created_at: r.created_at,
        });
      }
    }

    // 2. Installment Contract Refunds (from refundsTable)
    if (!filters.channel || filters.channel === 'ALL' || filters.channel === 'INSTALLMENT') {
      const refundsQuery = db.select({
        id: refundsTable.id,
        contract_id: refundsTable.contract_id,
        customer_id: refundsTable.customer_id,
        customer_name: customersTable.full_name,
        customer_mobile: customersTable.mobile,
        customer_branch_id: customersTable.branch_id,
        amount: refundsTable.amount,
        reason: refundsTable.reason,
        approved_by_id: refundsTable.approved_by,
        created_at: refundsTable.created_at,
        sale_id: installmentContractsTable.sale_id,
        sold_by_id: salesTable.created_by,
        sale_branch_id: salesTable.branch_id,
      })
      .from(refundsTable)
      .innerJoin(installmentContractsTable, eq(refundsTable.contract_id, installmentContractsTable.id))
      .leftJoin(salesTable, eq(installmentContractsTable.sale_id, salesTable.id))
      .leftJoin(customersTable, eq(refundsTable.customer_id, customersTable.id));

      const rawRefunds = await refundsQuery.execute();

      // Fetch products for these sales
      const saleIds = [...new Set(rawRefunds.map(r => r.sale_id).filter(Boolean))] as string[];
      const saleProductsMap: Record<string, string> = {};
      if (saleIds.length > 0) {
        const items = await db.select({
          saleId: saleItemsTable.sale_id,
          productName: productsTable.name
        })
        .from(saleItemsTable)
        .innerJoin(productsTable, eq(saleItemsTable.product_id, productsTable.id))
        .where(inArray(saleItemsTable.sale_id, saleIds));

        for (const it of items) {
          if (!saleProductsMap[it.saleId]) saleProductsMap[it.saleId] = it.productName;
          else saleProductsMap[it.saleId] += `, ${it.productName}`;
        }
      }

      for (const rf of rawRefunds) {
        const branchId = rf.sale_branch_id || rf.customer_branch_id;
        records.push({
          id: rf.id,
          channel: 'INSTALLMENT',
          reference_no: `CTR-${rf.contract_id.substring(0, 8)}`,
          sale_id: rf.sale_id,
          contract_id: rf.contract_id,
          customer_id: rf.customer_id,
          customer_name: rf.customer_name || 'Installment Customer',
          customer_mobile: rf.customer_mobile || '-',
          product_name: (rf.sale_id && saleProductsMap[rf.sale_id]) || 'Installment Contract',
          serial_number: '-',
          return_type: 'CONTRACT_REFUND',
          disposition: 'CANCELLED_CONTRACT',
          reason: rf.reason || 'Contract Refund / Surrender',
          refund_amount: parseFloat(rf.amount || '0'),
          refund_mode: 'CASH',
          sold_by_id: rf.sold_by_id,
          sold_by_name: rf.sold_by_id ? (userMap[rf.sold_by_id] || 'Staff') : 'Staff',
          processed_by_id: rf.approved_by_id,
          processed_by_name: userMap[rf.approved_by_id] || 'Staff',
          branch_id: branchId,
          branch_name: branchId ? (branchMap[branchId] || '-') : '-',
          created_at: rf.created_at,
        });
      }
    }

    // 3. Apply in-memory filters
    const lowerSearch = (filters.search || '').toLowerCase().trim();

    const filtered = records.filter(r => {
      // Date filter
      const rDate = new Date(r.created_at);
      if (start && rDate < start) return false;
      if (end && rDate > end) return false;

      // Branch filter
      if (filters.branchId && r.branch_id !== filters.branchId) return false;

      // Staff filter: check if this staff member sold the item OR processed the refund
      if (filters.staffId && r.sold_by_id !== filters.staffId && r.processed_by_id !== filters.staffId) {
        return false;
      }

      // Refund Mode filter
      if (filters.refundMode && filters.refundMode !== 'ALL' && r.refund_mode !== filters.refundMode) {
        return false;
      }

      // Search filter
      if (lowerSearch) {
        const matchesName = r.customer_name?.toLowerCase().includes(lowerSearch);
        const matchesMobile = r.customer_mobile?.toLowerCase().includes(lowerSearch);
        const matchesRef = r.reference_no?.toLowerCase().includes(lowerSearch);
        const matchesProd = r.product_name?.toLowerCase().includes(lowerSearch);
        const matchesSerial = r.serial_number?.toLowerCase().includes(lowerSearch);
        const matchesReason = r.reason?.toLowerCase().includes(lowerSearch);
        const matchesSoldBy = r.sold_by_name?.toLowerCase().includes(lowerSearch);
        const matchesProcBy = r.processed_by_name?.toLowerCase().includes(lowerSearch);

        if (!matchesName && !matchesMobile && !matchesRef && !matchesProd && !matchesSerial && !matchesReason && !matchesSoldBy && !matchesProcBy) {
          return false;
        }
      }

      return true;
    });

    // 4. Sort descending
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // 5. Calculate KPI Summary
    const totalCount = filtered.length;
    const directRecords = filtered.filter(r => r.channel === 'DIRECT');
    const installmentRecords = filtered.filter(r => r.channel === 'INSTALLMENT');

    const grandTotalRefunds = filtered.reduce((sum, r) => sum + r.refund_amount, 0);
    const directRefundsTotal = directRecords.reduce((sum, r) => sum + r.refund_amount, 0);
    const installmentRefundsTotal = installmentRecords.reduce((sum, r) => sum + r.refund_amount, 0);

    // 6. Pagination
    let paginated = filtered;
    if (filters.page && filters.limit) {
      const offset = (filters.page - 1) * filters.limit;
      paginated = filtered.slice(offset, offset + filters.limit);
    }

    return {
      data: paginated,
      total: totalCount,
      summary: {
        grandTotalRefunds,
        directRefundsTotal,
        installmentRefundsTotal,
        totalCount,
        directCount: directRecords.length,
        installmentCount: installmentRecords.length,
      }
    };
  }

  // --- EXCEL GENERATION UTILS ---

  static async generateExcel(sheetName: string, columns: Partial<ExcelJS.Column>[], data: any[]): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Master House System";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(sheetName);
    sheet.columns = columns;

    // Style the header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    
    // Freeze header
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    sheet.addRows(data);

    return workbook.xlsx.writeBuffer();
  }
}
