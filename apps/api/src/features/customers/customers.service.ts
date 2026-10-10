import { db } from "../../db";
import { customersTable, guarantorsTable } from "./customers.schema";
import { eq, or, like, and, sql, desc, exists, notExists, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import sharp from "sharp";
import { S3Util } from "../../utils/s3.util";
import { salesTable } from "../sale/sales.schema";
import { installmentContractsTable, installmentSchedulesTable, contractAdjustmentsTable } from "../collections/collections.schema";
import { routesTable, routeAreasTable } from "../routes/routes.schema";
import * as ExcelJS from "exceljs";

export class CustomersService {
  static async searchCustomers(query: string, branchId: string) {
    return await db.select()
      .from(customersTable)
      .where(
        and(
          eq(customersTable.branch_id, branchId),
          or(
            like(customersTable.full_name, `%${query}%`),
            like(customersTable.nic, `%${query}%`),
            like(customersTable.mobile, `%${query}%`)
          )
        )
      )
      .limit(20);
  }

  static async listCustomers(branchId: string, page: number = 1, limit: number = 100, search: string = '', routeId?: string, activeStatus: string = 'ALL', contractCount?: string) {
    const offset = (page - 1) * limit;
    
    const conditions = [eq(customersTable.branch_id, branchId)];
    
    if (search) {
      conditions.push(
        or(
          like(customersTable.full_name, `%${search}%`),
          like(customersTable.nic, `%${search}%`),
          like(customersTable.mobile, `%${search}%`)
        ) as any
      );
    }
    
    if (routeId) {
      conditions.push(eq(customersTable.route_id, routeId) as any);
    }

    if (activeStatus === 'ACTIVE') {
      conditions.push(
        exists(
          db.select().from(installmentContractsTable)
            .where(
              and(
                eq(installmentContractsTable.customer_id, customersTable.id),
                inArray(installmentContractsTable.status, ['ACTIVE', 'DEFAULTED', 'SUSPENDED'])
              )
            )
        ) as any
      );
    } else if (activeStatus === 'INACTIVE') {
      conditions.push(
        notExists(
          db.select().from(installmentContractsTable)
            .where(
              and(
                eq(installmentContractsTable.customer_id, customersTable.id),
                inArray(installmentContractsTable.status, ['ACTIVE', 'DEFAULTED', 'SUSPENDED'])
              )
            )
        ) as any
      );
    }

    if (contractCount && contractCount !== 'ALL') {
      if (contractCount === '10+') {
        conditions.push(
          sql`(SELECT COUNT(*) FROM ${installmentContractsTable} WHERE ${installmentContractsTable.customer_id} = ${customersTable.id} AND ${installmentContractsTable.status} = 'ACTIVE') >= 10` as any
        );
      } else {
        const countNum = parseInt(contractCount, 10);
        if (!isNaN(countNum)) {
          conditions.push(
            sql`(SELECT COUNT(*) FROM ${installmentContractsTable} WHERE ${installmentContractsTable.customer_id} = ${customersTable.id} AND ${installmentContractsTable.status} = 'ACTIVE') = ${countNum}` as any
          );
        }
      }
    }

    const whereClause = and(...conditions);

    const items = await db.select({
      id: customersTable.id,
      branch_id: customersTable.branch_id,
      route_id: customersTable.route_id,
      area_id: customersTable.area_id,
      full_name: customersTable.full_name,
      nic: customersTable.nic,
      mobile: customersTable.mobile,
      address: customersTable.address,
      gps_lat: customersTable.gps_lat,
      gps_lng: customersTable.gps_lng,
      nic_front_url: customersTable.nic_front_url,
      nic_back_url: customersTable.nic_back_url,
      is_walk_in: customersTable.is_walk_in,
      wallet_balance: customersTable.wallet_balance,
      rating: customersTable.rating,
      rating_override: customersTable.rating_override,
      active_contracts_count: sql<number>`CAST((SELECT COUNT(*) FROM ${installmentContractsTable} WHERE ${installmentContractsTable.customer_id} = ${customersTable.id} AND ${installmentContractsTable.status} = 'ACTIVE') AS SIGNED)`,
      created_at: customersTable.created_at,
      route_name: routesTable.name,
      area_name: routeAreasTable.name
    })
      .from(customersTable)
      .leftJoin(routesTable, eq(customersTable.route_id, routesTable.id))
      .leftJoin(routeAreasTable, eq(customersTable.area_id, routeAreasTable.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(customersTable.created_at));
      
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(customersTable)
      .where(whereClause);
      
    const count = Number(countResult[0].count);

    return { 
      data: items, 
      meta: { 
        total_records: count, 
        total_pages: Math.ceil(count / limit), 
        current_page: page, 
        page_size: limit 
      } 
    };
  }

  static async createCustomer(branchId: string, payload: any) {
    if (payload.id) {
      const existingById = await db.select({ id: customersTable.id })
        .from(customersTable)
        .where(eq(customersTable.id, payload.id))
        .limit(1);
      if (existingById.length > 0) {
        return payload.id;
      }
    }

    if (payload.nic && payload.route_id) {
      const existing = await db.select({ id: customersTable.id })
        .from(customersTable)
        .where(
          and(
            eq(customersTable.branch_id, branchId),
            eq(customersTable.route_id, payload.route_id),
            eq(customersTable.nic, payload.nic)
          )
        ).limit(1);
        
      if (existing.length > 0) {
        throw new Error(`A customer with this NIC already exists on this route.`);
      }
    }

    const id = payload.id || uuidv7();
    await db.insert(customersTable).values({
      id,
      branch_id: branchId,
      full_name: payload.full_name,
      nic: payload.nic,
      mobile: payload.mobile,
      address: payload.address,
      route_id: payload.route_id || null,
      area_id: payload.area_id || null,
      gps_lat: payload.gps_lat || null,
      gps_lng: payload.gps_lng || null,
      nic_front_url: payload.nic_front_url || null,
      nic_back_url: payload.nic_back_url || null,
    });
    return id;
  }

  static async updateCustomer(id: string, payload: any) {
    await db.update(customersTable)
      .set(payload)
      .where(eq(customersTable.id, id));
  }

  static async uploadNic(customerId: string, side: "front" | "back", fileBuffer: Buffer) {
    // Compress the image to JPEG, max width 1200, 80% quality
    const compressedBuffer = await sharp(fileBuffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 80 })
      .toBuffer();

    const key = `nic/${customerId}/${side}.jpg`;
    await S3Util.uploadBuffer(compressedBuffer, key, "image/jpeg");

    // Save URL reference in DB
    const updateData = side === "front" ? { nic_front_url: key } : { nic_back_url: key };
    await db.update(customersTable)
      .set(updateData)
      .where(eq(customersTable.id, customerId));

    return key;
  }

  static async getNicSignedUrl(customerId: string, side: "front" | "back") {
    const customer = await db.select().from(customersTable).where(eq(customersTable.id, customerId));
    if (customer.length === 0) throw new Error("Customer not found");

    const key = side === "front" ? customer[0].nic_front_url : customer[0].nic_back_url;
    if (!key) return null;

    // Generate signed URL valid for 15 minutes
    return await S3Util.getSignedDownloadUrl(key, 900);
  }

  static async getCustomerDetails(customerId: string, branchId: string) {
    const customerArr = await db
      .select({
        customer: customersTable,
        route_name: routesTable.name,
        area_name: routeAreasTable.name
      })
      .from(customersTable)
      .leftJoin(routesTable, eq(customersTable.route_id, routesTable.id))
      .leftJoin(routeAreasTable, eq(customersTable.area_id, routeAreasTable.id))
      .where(and(eq(customersTable.id, customerId), eq(customersTable.branch_id, branchId)));

    if (!customerArr.length) throw new Error("Customer not found");
    const customerInfo = customerArr[0];

    const sales = await db
      .select()
      .from(salesTable)
      .where(eq(salesTable.customer_id, customerId))
      .orderBy(salesTable.created_at);

    const contractsRaw = await db
      .select({
        contract: installmentContractsTable,
        guarantor: guarantorsTable
      })
      .from(installmentContractsTable)
      .leftJoin(guarantorsTable, eq(installmentContractsTable.guarantor_id, guarantorsTable.id))
      .where(eq(installmentContractsTable.customer_id, customerId))
      .orderBy(installmentContractsTable.created_at);

    const contractIds = contractsRaw.map(c => c.contract.id);
    let overdueSchedules: { contract_id: string; amount_due: string; amount_paid: string }[] = [];
    let penaltyAdjustments: { contract_id: string; amount: string }[] = [];

    if (contractIds.length > 0) {
      overdueSchedules = await db
        .select({
          contract_id: installmentSchedulesTable.contract_id,
          amount_due: installmentSchedulesTable.amount_due,
          amount_paid: installmentSchedulesTable.amount_paid,
        })
        .from(installmentSchedulesTable)
        .where(
          and(
            inArray(installmentSchedulesTable.contract_id, contractIds),
            sql`DATE(${installmentSchedulesTable.due_date}) < CURDATE()`,
            inArray(installmentSchedulesTable.status, ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'])
          )
        );

      penaltyAdjustments = await db
        .select({
          contract_id: contractAdjustmentsTable.contract_id,
          amount: contractAdjustmentsTable.amount,
        })
        .from(contractAdjustmentsTable)
        .where(
          and(
            inArray(contractAdjustmentsTable.contract_id, contractIds),
            eq(contractAdjustmentsTable.type, 'PENALTY')
          )
        );
    }

    const overdueByContract: Record<string, number> = {};
    for (const sched of overdueSchedules) {
      const pending = Math.max(0, parseFloat(sched.amount_due || '0') - parseFloat(sched.amount_paid || '0'));
      overdueByContract[sched.contract_id] = (overdueByContract[sched.contract_id] || 0) + pending;
    }

    const penaltyByContract: Record<string, number> = {};
    for (const adj of penaltyAdjustments) {
      penaltyByContract[adj.contract_id] = (penaltyByContract[adj.contract_id] || 0) + parseFloat(adj.amount || '0');
    }

    const contracts = await Promise.all(contractsRaw.map(async c => {
      const g = c.guarantor;
      const g_nic_front_signed_url = g?.nic_front_url ? await S3Util.getSignedDownloadUrl(g.nic_front_url, 900) : null;
      const g_nic_back_signed_url = g?.nic_back_url ? await S3Util.getSignedDownloadUrl(g.nic_back_url, 900) : null;
      const signature_signed_url = c.contract.signature_image_url ? await S3Util.getSignedDownloadUrl(c.contract.signature_image_url, 900) : null;
      const guarantor_signature_signed_url = c.contract.guarantor_signature_image_url ? await S3Util.getSignedDownloadUrl(c.contract.guarantor_signature_image_url, 900) : null;

      return {
        ...c.contract,
        overdue_amount: overdueByContract[c.contract.id] || 0,
        penalty_amount: penaltyByContract[c.contract.id] || 0,
        signature_signed_url,
        guarantor_signature_signed_url,
        guarantor: g ? {
          ...g,
          nic_front_signed_url: g_nic_front_signed_url,
          nic_back_signed_url: g_nic_back_signed_url,
        } : null
      };
    }));

    // Calculate KPIs
    const totalPurchases = sales.reduce((acc, sale) => acc + Number(sale.total), 0);
    const totalDownpayments = contracts.reduce((acc, contract) => acc + Number(contract.downpayment), 0);
    const totalBalances = contracts.reduce((acc, contract) => acc + Number(contract.balance), 0);
    const totalPayable = contracts.reduce((acc, contract) => acc + Number(contract.total_payable), 0);
    const totalOverdue = Object.values(overdueByContract).reduce((acc, v) => acc + v, 0);
    const totalPenalties = Object.values(penaltyByContract).reduce((acc, v) => acc + v, 0);
    
    const directSalesPaid = sales.filter(s => s.sale_type === 'DIRECT').reduce((acc, sale) => acc + Number(sale.total), 0);
    const installmentsPaid = Math.max(0, totalPayable - totalBalances);
    const totalPaid = directSalesPaid + installmentsPaid;
    
    const activeContracts = contracts.filter(c => c.status === 'ACTIVE').length;

    return {
      profile: {
        ...customerInfo.customer,
        route_name: customerInfo.route_name,
        area_name: customerInfo.area_name
      },
      sales,
      contracts,
      kpis: {
        totalPurchases,
        totalPaid,
        pendingBalance: totalBalances,
        totalOverdue,
        totalPenalties,
        totalDownpayments,
        activeContracts
      }
    };
  }

  static async exportCustomerDetails(customerId: string, branchId: string): Promise<ExcelJS.Buffer> {
    const data = await this.getCustomerDetails(customerId, branchId);
    const { profile, sales, contracts, kpis } = data;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Master House System";
    workbook.created = new Date();

    // Sheet 1: Profile & KPIs
    const profileSheet = workbook.addWorksheet("Customer Profile");
    profileSheet.columns = [
      { header: 'Attribute', key: 'attr', width: 25 },
      { header: 'Value', key: 'val', width: 50 }
    ];
    profileSheet.getRow(1).font = { bold: true };
    profileSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    
    profileSheet.addRows([
      { attr: 'Full Name', val: profile.full_name },
      { attr: 'NIC', val: profile.nic },
      { attr: 'Mobile', val: profile.mobile },
      { attr: 'Address', val: profile.address },
      { attr: 'Route', val: profile.route_name || '-' },
      { attr: 'Area', val: profile.area_name || '-' },
      { attr: 'Total Purchases', val: `Rs ${kpis.totalPurchases.toLocaleString('en-GB')}` },
      { attr: 'Total Paid', val: `Rs ${kpis.totalPaid.toLocaleString('en-GB')}` },
      { attr: 'Total Downpayments', val: `Rs ${(kpis.totalDownpayments || 0).toLocaleString('en-GB')}` },
      { attr: 'Pending Balance', val: `Rs ${kpis.pendingBalance.toLocaleString('en-GB')}` },
      { attr: 'Total Overdue', val: `Rs ${(kpis.totalOverdue || 0).toLocaleString('en-GB')}` },
      { attr: 'Total Penalties Included', val: `Rs ${(kpis.totalPenalties || 0).toLocaleString('en-GB')}` },
      { attr: 'Active Contracts', val: kpis.activeContracts }
    ]);

    // Sheet 2: Sales History
    const salesSheet = workbook.addWorksheet("Sales History");
    salesSheet.columns = [
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Sale Type', key: 'type', width: 20 },
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Total (Rs)', key: 'total', width: 20 }
    ];
    salesSheet.getRow(1).font = { bold: true };
    salesSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    
    salesSheet.addRows(sales.map(s => ({
      date: new Date(s.created_at).toLocaleDateString('en-GB'),
      type: s.sale_type,
      status: s.status,
      total: Number(s.total).toLocaleString('en-GB')
    })));

    // Sheet 3: Installment Contracts
    const contractsSheet = workbook.addWorksheet("Installment Contracts");
    contractsSheet.columns = [
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Guarantor Name', key: 'guarantorName', width: 25 },
      { header: 'Guarantor NIC', key: 'guarantorNic', width: 20 },
      { header: 'Downpayment (Rs)', key: 'downpayment', width: 20 },
      { header: 'Total Payable (Rs)', key: 'payable', width: 20 },
      { header: 'Collected (Rs)', key: 'collected', width: 20 },
      { header: 'Remaining Balance (Rs)', key: 'balance', width: 20 },
      { header: 'Overdue (Rs)', key: 'overdue', width: 20 },
      { header: 'Penalty Included (Rs)', key: 'penalty', width: 22 }
    ];
    contractsSheet.getRow(1).font = { bold: true };
    contractsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    
    contractsSheet.addRows(contracts.map(c => {
      const payable = Number(c.total_payable);
      const balance = Math.max(0, Number(c.balance));
      const collected = Math.max(0, payable - balance);
      return {
        date: new Date(c.created_at).toLocaleDateString('en-GB'),
        status: c.status,
        guarantorName: c.guarantor ? c.guarantor.full_name : '-',
        guarantorNic: c.guarantor ? c.guarantor.nic : '-',
        downpayment: Number(c.downpayment || 0).toLocaleString('en-GB'),
        payable: payable.toLocaleString('en-GB'),
        collected: collected.toLocaleString('en-GB'),
        balance: balance.toLocaleString('en-GB'),
        overdue: Number(c.overdue_amount || 0).toLocaleString('en-GB'),
        penalty: Number(c.penalty_amount || 0).toLocaleString('en-GB')
      };
    }));

    return workbook.xlsx.writeBuffer();
  }

  static async updateCustomerRating(
    id: string,
    rating: number,
    isOverride: boolean
  ) {
    const clampedRating = Math.max(1.0, Math.min(5.0, rating));
    await db
      .update(customersTable)
      .set({
        rating: clampedRating.toFixed(1),
        rating_override: isOverride,
        rating_calculated_at: new Date(),
      })
      .where(eq(customersTable.id, id));
  }

  static async resetCustomerRatingOverride(id: string) {
    await db
      .update(customersTable)
      .set({ rating_override: false })
      .where(eq(customersTable.id, id));
  }
}

