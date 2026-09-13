import { eq, and, asc, isNull, or, isNotNull, gte, lte } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "../../db";
import { installmentContractsTable, installmentSchedulesTable, contractAdjustmentsTable, installmentSchemesTable, collectionReceiptsTable, collectionAttemptsTable } from "./collections.schema";
import { tripsTable } from "../operations/operations.schema";
import { CreateAdjustmentPayload, CreateSchemePayload, UpdateSchemePayload, CreateReceiptPayload, CreateAttemptPayload } from "./collections.types";
import { customersTable } from "../customers/customers.schema";
import { routesTable } from "../routes/routes.schema";
import { warrantyClaimsTable } from "../service/service.schema";
import { saleItemsTable } from "../sale/sales.schema";
import { NotificationsService } from "../notifications/notifications.service";
import { branchesTable, branchPhonesTable } from "../branches/branches.schema";
import { SettingsService } from "../settings/settings.service";
import { getTodayStr, formatDateStr } from "../../utils/date.util";
import { roundMoney, isZeroMoney, moneyEquals } from "../../utils/money.util";

export class CollectionsService {
  
  static async processCollectionReceipt(payload: CreateReceiptPayload, collectedBy: string, branchId: string): Promise<string> {
    const receiptId = payload.id || uuidv7();

    const finalReceiptId = await db.transaction(async (tx) => {
      // 0. Idempotency Check
      if (payload.idempotencyKey) {
        const existing = await tx.select({ id: collectionReceiptsTable.id }).from(collectionReceiptsTable).where(eq(collectionReceiptsTable.idempotency_key, payload.idempotencyKey)).limit(1);
        if (existing.length > 0) return existing[0].id;
      }
      if (payload.id) {
        const existing = await tx.select({ id: collectionReceiptsTable.id }).from(collectionReceiptsTable).where(eq(collectionReceiptsTable.id, payload.id)).limit(1);
        if (existing.length > 0) return payload.id;
      }

      // 1. Fetch Contract
      const contracts = await tx.select().from(installmentContractsTable).where(eq(installmentContractsTable.id, payload.contract_id)).limit(1);
      if (contracts.length === 0) throw new Error("Contract not found");
      const contract = contracts[0];

      if (contract.status !== "ACTIVE" && contract.status !== "DEFAULTED") {
        throw new Error("Cannot process receipt for this contract status.");
      }

      // 1b. Block collection if any sale item is under an active warranty claim
      const saleItems = await tx.select().from(saleItemsTable).where(eq(saleItemsTable.sale_id, contract.sale_id));
      for (const item of saleItems) {
        const activeClaims = await tx.select().from(warrantyClaimsTable)
          .where(and(
            eq(warrantyClaimsTable.sale_item_id, item.id),
            eq(warrantyClaimsTable.status, "ITEM_COLLECTED")
          ));
        const inProgressClaims = await tx.select().from(warrantyClaimsTable)
          .where(and(
            eq(warrantyClaimsTable.sale_item_id, item.id),
            eq(warrantyClaimsTable.status, "SENT_TO_SUPPLIER")
          ));
        if (activeClaims.length > 0 || inProgressClaims.length > 0) {
          throw new Error("Collection is blocked: this customer has an active warranty claim in progress. Resolve the warranty claim first.");
        }
      }

      // 2. Generate Receipt Number
      let receiptNo = payload.receipt_no;
      if (!receiptNo) {
        const { getNextSequence } = await import("../../lib/sequence-generator");
        receiptNo = await getNextSequence(tx, branchId, "RECEIPT");
      }

      // Calculate the new balance for historical snapshot (with 2-decimal rounding)
      const currentContractBal = roundMoney(parseFloat(contract.balance));
      const receiptAmount = roundMoney(payload.amount);
      let newBalance = roundMoney(currentContractBal - receiptAmount);
      if (newBalance < 0) newBalance = 0; // Overpayment goes to balance 0 for now

      // 3. Create Receipt Record
      await tx.insert(collectionReceiptsTable).values({
        id: receiptId,
        receipt_no: receiptNo,
        offline_receipt_number: payload.offline_receipt_number || null,
        contract_id: payload.contract_id,
        customer_id: contract.customer_id,
        trip_id: payload.trip_id || null,
        collected_by: collectedBy,
        amount: receiptAmount.toFixed(2),
        balance_after_receipt: newBalance.toFixed(2),
        payment_mode: payload.payment_mode === "BANK_TRANSFER" ? "TRANSFER" : payload.payment_mode as any,
        sms_status: "PENDING",
        idempotency_key: payload.idempotencyKey || null,
        gps_lat: payload.gps_lat ? payload.gps_lat.toString() : null,
        gps_lng: payload.gps_lng ? payload.gps_lng.toString() : null,
      });

      // 3b. Log Collection Attempt if part of a trip
      if (payload.trip_id) {
        await tx.insert(collectionAttemptsTable).values({
          id: uuidv7(),
          trip_id: payload.trip_id,
          contract_id: payload.contract_id,
          customer_id: contract.customer_id,
          status: "COLLECTED",
          remarks: "Successfully collected",
          gps_lat: payload.gps_lat ? payload.gps_lat.toString() : null,
          gps_lng: payload.gps_lng ? payload.gps_lng.toString() : null,
          attempted_by: collectedBy,
        });
      }

      // 4. Waterfall Logic for Schedules
      const schedules = await tx.select().from(installmentSchedulesTable)
        .where(eq(installmentSchedulesTable.contract_id, payload.contract_id))
        .orderBy(asc(installmentSchedulesTable.due_date));
      
      const unpaidSchedules = schedules.filter(s => s.status === "PENDING" || s.status === "PARTIALLY_PAID" || s.status === "OVERDUE");

      let remainingAmount = receiptAmount;

      for (const schedule of unpaidSchedules) {
        if (remainingAmount <= 0) break;

        const schedDue = roundMoney(parseFloat(schedule.amount_due));
        const schedPaid = roundMoney(parseFloat(schedule.amount_paid));
        const due = roundMoney(schedDue - schedPaid);
        if (due <= 0.005) continue;

        if (remainingAmount >= due - 0.005) {
          // Fully pay this schedule
          await tx.update(installmentSchedulesTable)
            .set({ 
              amount_paid: schedDue.toFixed(2), 
              status: "PAID" 
            })
            .where(eq(installmentSchedulesTable.id, schedule.id));
          remainingAmount = roundMoney(remainingAmount - due);
        } else {
          // Partially pay this schedule
          const newPaid = roundMoney(schedPaid + remainingAmount);
          const isFullyPaid = isZeroMoney(schedDue - newPaid);
          const newStatus = isFullyPaid 
            ? "PAID" 
            : (schedule.status === "OVERDUE" ? "OVERDUE" : "PARTIALLY_PAID");
          
          await tx.update(installmentSchedulesTable)
            .set({ 
              amount_paid: newPaid.toFixed(2), 
              status: newStatus 
            })
            .where(eq(installmentSchedulesTable.id, schedule.id));
          remainingAmount = 0;
        }
      }

      // 5. Update Contract Balance
      const newStatus = isZeroMoney(newBalance) ? "PAID_OFF" : contract.status;

      await tx.update(installmentContractsTable)
        .set({ balance: newBalance.toFixed(2), status: newStatus })
        .where(eq(installmentContractsTable.id, contract.id));

      // Handle Over-Collection Automatically
      if (remainingAmount > 0 && newBalance === 0) {
        const customerResult = await tx.select().from(customersTable).where(eq(customersTable.id, contract.customer_id)).limit(1);
        if (customerResult.length > 0) {
          const customer = customerResult[0];
          const newWalletBalance = parseFloat(customer.wallet_balance || "0") + remainingAmount;
          await tx.update(customersTable)
            .set({ wallet_balance: newWalletBalance.toString() })
            .where(eq(customersTable.id, customer.id));
        }
      }

      // 6. Update Trip Actual Cash (if applicable)
      if (payload.trip_id) {
        const trips = await tx.select().from(tripsTable).where(eq(tripsTable.id, payload.trip_id)).limit(1);
        if (trips.length > 0) {
          const trip = trips[0];
          const newActualCash = parseFloat(trip.actual_cash || "0") + payload.amount;
          await tx.update(tripsTable)
            .set({ actual_cash: newActualCash.toString() })
            .where(eq(tripsTable.id, trip.id));
        }
      }

      // 7. SMS Trigger
      try {
        const customerRecords = await tx.select().from(customersTable).where(eq(customersTable.id, contract.customer_id)).limit(1);
        if (customerRecords.length > 0) {
          const customer = customerRecords[0];

          const branchRecords = await tx.select().from(branchesTable).where(eq(branchesTable.id, customer.branch_id)).limit(1);
          const branchAddress = branchRecords[0]?.address || "Our Branch";
          const branchPhoneRecords = await tx.select().from(branchPhonesTable).where(eq(branchPhonesTable.branch_id, customer.branch_id));
          const branchPhone = branchPhoneRecords.length > 0 ? branchPhoneRecords.map(p => p.phone_number).join(' | ') : "Support";
          
          const companyName = await SettingsService.getSetting("company_name") || "Our Company";

          const nextSchedule = await tx.select().from(installmentSchedulesTable)
            .where(and(
              eq(installmentSchedulesTable.contract_id, contract.id),
              or(eq(installmentSchedulesTable.status, "PENDING"), eq(installmentSchedulesTable.status, "PARTIALLY_PAID"))
            ))
            .orderBy(asc(installmentSchedulesTable.due_date))
            .limit(1);

          let nextDueDate = "N/A";
          let nextDueAmount = "0.00";
          if (nextSchedule.length > 0) {
            nextDueDate = new Date(nextSchedule[0].due_date).toLocaleDateString('en-GB');
            nextDueAmount = (parseFloat(nextSchedule[0].amount_due) - parseFloat(nextSchedule[0].amount_paid)).toFixed(2);
          }

          NotificationsService.queueSms("COLLECTION_RECEIPT", customer.id, customer.mobile, {
             company_name: companyName,
             branch_phone: branchPhone,
             branch_address: branchAddress,
             name: customer.full_name,
             amount_paid: payload.amount.toFixed(2),
             new_balance: newBalance.toFixed(2),
             next_due_date: nextDueDate,
             next_due_amount: nextDueAmount,
             receipt_no: receiptNo,
          }, receiptId);
        }
      } catch (smsError) {
        console.error("Failed to queue COLLECTION_RECEIPT SMS:", smsError);
      }

      return receiptId;
    });

    return finalReceiptId;
  }

  static async getSchedulesToCollect(
    filter: 'overdue' | 'today' | 'upcoming' | 'custom' | 'paid', 
    branchId?: string, 
    page: number = 1, 
    limit: number = 100, 
    search: string = '',
    routeId?: string,
    areaId?: string,
    startDate?: string,
    endDate?: string,
    statusFilter?: string
  ) {
    const todayStr = getTodayStr();
    
    let schedulesQuery = db.select({
      schedule_id: installmentSchedulesTable.id,
      installment_number: installmentSchedulesTable.installment_number,
      due_date: installmentSchedulesTable.due_date,
      amount_due: installmentSchedulesTable.amount_due,
      amount_paid: installmentSchedulesTable.amount_paid,
      status: installmentSchedulesTable.status,
      contract_id: installmentContractsTable.id,
      sale_id: installmentContractsTable.sale_id,
      contract_balance: installmentContractsTable.balance,
      contract_status: installmentContractsTable.status,
      customer_id: customersTable.id,
      customer_name: customersTable.full_name,
      customer_mobile: customersTable.mobile,
      customer_route: routesTable.name,
      route_id: customersTable.route_id,
      area_id: customersTable.area_id,
      gps_lat: customersTable.gps_lat,
      gps_lng: customersTable.gps_lng
    })
    .from(installmentSchedulesTable)
    .innerJoin(installmentContractsTable, eq(installmentSchedulesTable.contract_id, installmentContractsTable.id))
    .innerJoin(customersTable, eq(installmentContractsTable.customer_id, customersTable.id))
    .leftJoin(routesTable, eq(customersTable.route_id, routesTable.id))
    .where(
      and(
        eq(installmentContractsTable.status, "ACTIVE"),
        branchId ? eq(customersTable.branch_id, branchId) : undefined,
        routeId ? eq(customersTable.route_id, routeId) : undefined,
        areaId ? eq(customersTable.area_id, areaId) : undefined
      )
    )
    .orderBy(asc(installmentSchedulesTable.due_date));

    let allSchedules = await schedulesQuery.execute();
    
    // Fetch product names for the sales associated with these schedules
    const saleIds = [...new Set(allSchedules.map(s => s.sale_id))];
    const saleProductsMap: Record<string, string> = {};
    
    if (saleIds.length > 0) {
      const { saleItemsTable } = require("../sale/sales.schema");
      const { productsTable } = require("../products/products.schema");
      
      // We will batch fetch items for all active saleIds
      // To avoid massive IN clauses, we can just fetch items for these specific sales
      // But Drizzle 'inArray' needs import. We can dynamically fetch or use a loop for now since it's filtered later.
      // A safe way without 'inArray' import is to fetch all active sale items or loop
      // Given typical list limit is small (e.g., 30 pages), this is fine.
      for (const sId of saleIds) {
        const items = await db.select({ name: productsTable.name })
          .from(saleItemsTable)
          .innerJoin(productsTable, eq(saleItemsTable.product_id, productsTable.id))
          .where(eq(saleItemsTable.sale_id, sId));
        saleProductsMap[sId] = items.map(i => i.name).join(", ");
      }
    }

    const lowerSearch = search.toLowerCase();

    const filtered = allSchedules.filter(s => {
      // Status Filter Logic based on Tab
      if (filter === 'paid') {
        if (s.status !== 'PAID' && s.status !== 'WAIVED') return false;
      } else if (filter === 'custom') {
        if (statusFilter === 'PAID') {
          if (s.status !== 'PAID' && s.status !== 'WAIVED') return false;
        } else if (statusFilter === 'ALL') {
          // Show everything
        } else {
          // Default: Pending & Overdue
          if (s.status === "PAID" || s.status === "WAIVED") return false;
        }
      } else {
        // overdue, today, upcoming tabs MUST only show PENDING / OVERDUE / PARTIALLY_PAID
        if (s.status === "PAID" || s.status === "WAIVED") return false;
      }
      
      const sDate = typeof s.due_date === 'string' ? s.due_date : formatDateStr(s.due_date);
      
      // Date Filter Logic based on Tab
      let dateMatch = true;
      if (filter === 'custom') {
        if (startDate && endDate) {
          dateMatch = sDate >= startDate && sDate <= endDate;
        }
      } else if (filter === 'today') {
        dateMatch = sDate === todayStr;
      } else if (filter === 'overdue') {
        dateMatch = sDate < todayStr;
      } else if (filter === 'upcoming') {
        dateMatch = sDate > todayStr;
      } else if (filter === 'paid') {
        // Paid tab usually shows all paid ones, or we can leave dateMatch = true.
        dateMatch = true;
      }
      
      if (!dateMatch) return false;
      
      // Search Filter Logic
      if (search) {
        const productName = saleProductsMap[s.sale_id] || "";
        const nameMatch = s.customer_name?.toLowerCase().includes(lowerSearch) || false;
        const mobileMatch = s.customer_mobile?.toLowerCase().includes(lowerSearch) || false;
        const routeMatch = s.customer_route?.toLowerCase().includes(lowerSearch) || false;
        const productMatch = productName.toLowerCase().includes(lowerSearch) || false;
        
        if (!nameMatch && !mobileMatch && !routeMatch && !productMatch) return false;
      }

      return true;
    }).map(s => ({
      ...s,
      product_name: saleProductsMap[s.sale_id] || "Unknown Product"
    }));

    const count = filtered.length;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    const totalPendingAmount = filtered.reduce((acc, s) => {
      const pending = Math.max(0, parseFloat(s.amount_due || '0') - parseFloat(s.amount_paid || '0'));
      return acc + pending;
    }, 0);
    const totalDueAmount = filtered.reduce((acc, s) => acc + parseFloat(s.amount_due || '0'), 0);
    const totalPaidAmount = filtered.reduce((acc, s) => acc + parseFloat(s.amount_paid || '0'), 0);
    const uniqueCustomersCount = new Set(filtered.map(s => s.customer_id)).size;

    return {
      data: paginated,
      meta: {
        total_records: count,
        total_pages: Math.ceil(count / limit),
        current_page: page,
        page_size: limit,
        total_pending_amount: totalPendingAmount,
        total_due_amount: totalDueAmount,
        total_paid_amount: totalPaidAmount,
        unique_customers_count: uniqueCustomersCount,
      }
    };
  }
  
  static async createAdjustment(contractId: string, payload: CreateAdjustmentPayload, createdBy: string): Promise<boolean> {
    const success = await db.transaction(async (tx) => {
      // 1. Fetch contract
      const contractResults = await tx.select().from(installmentContractsTable).where(eq(installmentContractsTable.id, contractId)).limit(1);
      const contract = contractResults[0];
      if (!contract || contract.status !== "ACTIVE") throw new Error("Contract not found or not active");

      // 2. Insert Adjustment
      const adjustmentId = uuidv7();
      await tx.insert(contractAdjustmentsTable).values({
        id: adjustmentId,
        contract_id: contractId,
        type: payload.type,
        amount: payload.amount.toString(),
        reason: payload.reason,
        created_by: createdBy,
      });

      // 3. Update Balance
      let newBalance = parseFloat(contract.balance);
      if (payload.type === "PENALTY") {
        newBalance += payload.amount;
      } else {
        newBalance -= payload.amount;
      }
      
      if (newBalance < 0) throw new Error("Adjustment causes negative balance");

      const newStatus = newBalance === 0 ? "PAID_OFF" : "ACTIVE";
      await tx.update(installmentContractsTable)
        .set({ balance: newBalance.toString(), status: newStatus })
        .where(eq(installmentContractsTable.id, contractId));

      // 4. Handle Schedules Based on Adjustment Type
      if (payload.type === "PENALTY") {
        // Inject penalty directly into the next immediate unpaid schedule
        const nextSchedules = await tx.select().from(installmentSchedulesTable)
          .where(
            and(
              eq(installmentSchedulesTable.contract_id, contractId),
              or(eq(installmentSchedulesTable.status, "PENDING"), eq(installmentSchedulesTable.status, "PARTIALLY_PAID"), eq(installmentSchedulesTable.status, "OVERDUE"))
            )
          )
          .orderBy(asc(installmentSchedulesTable.due_date))
          .limit(1);

        if (nextSchedules.length > 0) {
          const target = nextSchedules[0];
          const newAmountDue = parseFloat(target.amount_due) + payload.amount;
          await tx.update(installmentSchedulesTable)
            .set({ amount_due: newAmountDue.toString() })
            .where(eq(installmentSchedulesTable.id, target.id));
        } else {
           // Create a new schedule since none exist to attach the penalty to
           await tx.insert(installmentSchedulesTable).values({
             id: uuidv7(),
             contract_id: contractId,
             installment_number: 999,
             due_date: new Date().toISOString().split('T')[0],
             amount_due: payload.amount.toString(),
             amount_paid: "0.00",
             status: "PENDING"
           });
        }
      } else {
        // DISCOUNT / WRITE_OFF / REBATE
        if (newStatus === "PAID_OFF") {
          // Keep existing 0 logic
          await tx.update(installmentSchedulesTable)
            .set({ status: "WAIVED" })
            .where(
              and(
                eq(installmentSchedulesTable.contract_id, contractId),
                or(eq(installmentSchedulesTable.status, "PENDING"), eq(installmentSchedulesTable.status, "PARTIALLY_PAID"), eq(installmentSchedulesTable.status, "OVERDUE"))
              )
            );
        } else {
          // Evenly Distribute the remaining balance
          const remainingSchedules = await tx.select().from(installmentSchedulesTable)
            .where(
              and(
                eq(installmentSchedulesTable.contract_id, contractId),
                or(eq(installmentSchedulesTable.status, "PENDING"), eq(installmentSchedulesTable.status, "PARTIALLY_PAID"), eq(installmentSchedulesTable.status, "OVERDUE"))
              )
            )
            .orderBy(asc(installmentSchedulesTable.due_date));
          
          if (remainingSchedules.length > 0) {
            const basePortion = Math.floor((newBalance / remainingSchedules.length) * 100) / 100;
            let distributedTotal = 0;

            for (let i = 0; i < remainingSchedules.length; i++) {
              const schedule = remainingSchedules[i];
              let portion = basePortion;
              
              // If it's the last schedule, give it the remainder to ensure perfect rounding
              if (i === remainingSchedules.length - 1) {
                portion = Math.round((newBalance - distributedTotal) * 100) / 100;
              }
              
              distributedTotal += portion;
              
              const newAmountDue = parseFloat(schedule.amount_paid) + portion;
              
              await tx.update(installmentSchedulesTable)
                .set({ amount_due: newAmountDue.toString() })
                .where(eq(installmentSchedulesTable.id, schedule.id));
            }
          }
        }
      }

      return true;
    });

    return success;
  }

  static async freezeContract(contractId: string): Promise<boolean> {
    const result = await db.update(installmentContractsTable)
      .set({ status: "SUSPENDED", suspended_at: new Date() })
      .where(and(
        eq(installmentContractsTable.id, contractId),
        eq(installmentContractsTable.status, "ACTIVE")
      ));
    return result[0].affectedRows > 0;
  }

  static async resumeContract(contractId: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const contractResults = await tx.select().from(installmentContractsTable).where(eq(installmentContractsTable.id, contractId)).limit(1);
      const contract = contractResults[0];
      
      if (!contract || contract.status !== "SUSPENDED" || !contract.suspended_at) {
        throw new Error("Contract is not suspended");
      }

      // Calculate days suspended
      const now = new Date();
      const suspendedTime = contract.suspended_at.getTime();
      const daysSuspended = Math.floor((now.getTime() - suspendedTime) / (1000 * 60 * 60 * 24));

      // Unsuspend
      await tx.update(installmentContractsTable)
        .set({ status: "ACTIVE", suspended_at: null })
        .where(eq(installmentContractsTable.id, contractId));

      // Push dates forward for unpaid schedules
      if (daysSuspended > 0) {
        const schedules = await tx.select().from(installmentSchedulesTable).where(
          eq(installmentSchedulesTable.contract_id, contractId)
        );

        for (const schedule of schedules) {
          if (["PENDING", "PARTIALLY_PAID", "OVERDUE"].includes(schedule.status)) {
            // Note: schedule.due_date is returned as a string in format YYYY-MM-DD from MySQL driver usually, or Date obj
            const newDate = new Date(schedule.due_date);
            newDate.setDate(newDate.getDate() + daysSuspended);
            
            await tx.update(installmentSchedulesTable)
              .set({ due_date: newDate })
              .where(eq(installmentSchedulesTable.id, schedule.id));
          }
        }
      }

      return true;
    });
  }

  static async createScheme(payload: CreateSchemePayload): Promise<string> {
    const schemeId = uuidv7();
    await db.insert(installmentSchemesTable).values({
      id: schemeId,
      branch_id: payload.branch_id || null,
      name: payload.name,
      terms: payload.terms,
      frequency: payload.frequency,
      interest_rate: payload.interest_rate.toString(),
      min_downpayment_percent: payload.min_downpayment_percent.toString(),
      late_fee_percentage: payload.late_fee_percentage.toString(),
      grace_period_days: payload.grace_period_days ?? 5,
      is_active: true,
    });
    return schemeId;
  }

  static async listSchemes(branchId?: string, page: number = 1, limit: number = 30, search: string = '') {
    const query = db.select().from(installmentSchemesTable);
    
    // If branchId is provided, fetch global schemes (branch_id IS NULL) + this branch's schemes
    // Without Drizzle dynamic query builder easily available, we'll just pull and filter or use OR
    const allSchemes = await query.execute();
    
    let filtered = allSchemes;
    if (branchId) {
      filtered = filtered.filter(s => !s.branch_id || s.branch_id === branchId);
    }
    
    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(s => s.name?.toLowerCase().includes(lowerSearch));
    }
    
    const count = filtered.length;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      data: paginated,
      meta: {
        total_records: count,
        total_pages: Math.ceil(count / limit),
        current_page: page,
        page_size: limit
      }
    };
  }

  static async updateScheme(schemeId: string, payload: UpdateSchemePayload): Promise<boolean> {
    const updateData: any = {};
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.terms !== undefined) updateData.terms = payload.terms;
    if (payload.frequency !== undefined) updateData.frequency = payload.frequency;
    if (payload.interest_rate !== undefined) updateData.interest_rate = payload.interest_rate.toString();
    if (payload.min_downpayment_percent !== undefined) updateData.min_downpayment_percent = payload.min_downpayment_percent.toString();
    if (payload.late_fee_percentage !== undefined) updateData.late_fee_percentage = payload.late_fee_percentage.toString();
    if (payload.grace_period_days !== undefined) updateData.grace_period_days = payload.grace_period_days;
    if (payload.is_active !== undefined) updateData.is_active = payload.is_active;

    if (Object.keys(updateData).length === 0) return true;

    const result = await db.update(installmentSchemesTable)
      .set(updateData)
      .where(eq(installmentSchemesTable.id, schemeId));
      
    return result[0].affectedRows > 0;
  }

  static async getReceiptPrintDetails(receiptId: string) {
    const receipt = await db.query.collectionReceiptsTable.findFirst({
      where: eq(collectionReceiptsTable.id, receiptId),
      with: {
        customer: true,
        contract: true,
        collector: true,
      }
    });

    if (!receipt) throw new Error("Receipt not found");

    const companyName = await SettingsService.getSetting("company_name") || "Company Name";
    const companyLogo = await SettingsService.getSetting("company_logo_url") || "";

    let branchAddress = "";
    let branchPhone = "";
    if (receipt.customer?.branch_id) {
      const bRecords = await db.select().from(branchesTable).where(eq(branchesTable.id, receipt.customer.branch_id)).limit(1);
      if (bRecords.length > 0) branchAddress = bRecords[0].address || "";
      const pRecords = await db.select().from(branchPhonesTable).where(eq(branchPhonesTable.branch_id, receipt.customer.branch_id));
      if (pRecords.length > 0) branchPhone = pRecords.map(p => p.phone_number).join(' | ');
    }

    const nextSchedule = await db.select().from(installmentSchedulesTable)
      .where(and(
        eq(installmentSchedulesTable.contract_id, receipt.contract_id),
        or(eq(installmentSchedulesTable.status, "PENDING"), eq(installmentSchedulesTable.status, "PARTIALLY_PAID"))
      ))
      .orderBy(asc(installmentSchedulesTable.due_date))
      .limit(1);

    let nextDueDate = "N/A";
    let nextDueAmount = "0.00";
    if (nextSchedule.length > 0) {
      nextDueDate = new Date(nextSchedule[0].due_date).toLocaleDateString('en-GB');
      nextDueAmount = (parseFloat(nextSchedule[0].amount_due) - parseFloat(nextSchedule[0].amount_paid)).toFixed(2);
    }

    const { saleItemsTable } = require("../sale/sales.schema");
    const { productsTable } = require("../products/products.schema");
    const items = await db.select({ name: productsTable.name })
      .from(saleItemsTable)
      .innerJoin(productsTable, eq(saleItemsTable.product_id, productsTable.id))
      .where(eq(saleItemsTable.sale_id, receipt.contract.sale_id));
    const productName = items.map((i: any) => i.name).join(", ") || "Product";

    return {
      receipt_no: receipt.receipt_no,
      created_at: receipt.created_at,
      amount: receipt.amount,
      payment_mode: receipt.payment_mode,
      customer_name: receipt.customer.full_name,
      customer_mobile: receipt.customer.mobile,
      contract_balance: receipt.contract.balance,
      collected_by_name: receipt.collector?.name || "System",
      company_name: companyName,
      company_logo: companyLogo,
      branch_address: branchAddress,
      branch_phone: branchPhone,
      next_due_date: nextDueDate,
      next_due_amount: nextDueAmount,
      product_name: productName,
    };
  }

  static async processCollectionAttempt(payload: CreateAttemptPayload, attemptedBy: string): Promise<string> {
    const attemptId = uuidv7();
    await db.insert(collectionAttemptsTable).values({
      id: attemptId,
      trip_id: payload.trip_id,
      contract_id: payload.contract_id,
      customer_id: payload.customer_id,
      status: payload.status,
      remarks: payload.remarks || "",
      gps_lat: payload.gps_lat ? payload.gps_lat.toString() : null,
      gps_lng: payload.gps_lng ? payload.gps_lng.toString() : null,
      attempted_by: attemptedBy,
    });
    return attemptId;
  }

  static async getContractHistory(contractId: string) {
    const receipts = await db.query.collectionReceiptsTable.findMany({
      where: eq(collectionReceiptsTable.contract_id, contractId),
      with: { collector: true },
      orderBy: [asc(collectionReceiptsTable.created_at)]
    });

    const attempts = await db.query.collectionAttemptsTable.findMany({
      where: eq(collectionAttemptsTable.contract_id, contractId),
      with: { attempter: true },
      orderBy: [asc(collectionAttemptsTable.created_at)]
    });

    const combined: any[] = [];
    
    for (const r of receipts) {
      combined.push({
        id: r.id,
        type: 'RECEIPT',
        date: r.created_at,
        amount: r.amount,
        status: 'SUCCESS',
        remarks: `Receipt #${r.receipt_no} - Paid via ${r.payment_mode}`,
        offline_receipt_number: r.offline_receipt_number,
        user: r.collector?.name || 'System',
        gps_lat: r.gps_lat,
        gps_lng: r.gps_lng
      });
    }

    for (const a of attempts) {
      // Don't show COLLECTED attempts in the timeline if we already show the receipt
      if (a.status === 'COLLECTED') continue;
      combined.push({
        id: a.id,
        type: 'ATTEMPT',
        date: a.created_at,
        amount: null,
        status: a.status,
        remarks: a.remarks,
        user: a.attempter?.name || 'System',
        gps_lat: a.gps_lat,
        gps_lng: a.gps_lng
      });
    }

    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Descending
    return combined;
  }

  static async getScheduleCounts(branchId?: string, routeId?: string, areaId?: string) {
    const todayStr = getTodayStr();
    
    const allSchedules = await db.select({
      due_date: installmentSchedulesTable.due_date,
      status: installmentSchedulesTable.status,
      amount_due: installmentSchedulesTable.amount_due,
      amount_paid: installmentSchedulesTable.amount_paid,
      customer_id: customersTable.id,
    })
    .from(installmentSchedulesTable)
    .innerJoin(installmentContractsTable, eq(installmentSchedulesTable.contract_id, installmentContractsTable.id))
    .innerJoin(customersTable, eq(installmentContractsTable.customer_id, customersTable.id))
    .where(
      and(
        eq(installmentContractsTable.status, "ACTIVE"),
        branchId ? eq(customersTable.branch_id, branchId) : undefined,
        routeId ? eq(customersTable.route_id, routeId) : undefined,
        areaId ? eq(customersTable.area_id, areaId) : undefined
      )
    );

    let overdue = 0, today = 0, upcoming = 0;
    let overdueAmount = 0, todayAmount = 0, upcomingAmount = 0;
    const overdueCustomers = new Set<string>();
    const todayCustomers = new Set<string>();
    const upcomingCustomers = new Set<string>();

    for (const s of allSchedules) {
      if (s.status === 'PAID' || s.status === 'WAIVED') continue;
      const sDate = typeof s.due_date === 'string' ? s.due_date : formatDateStr(s.due_date);
      const pendingAmount = Math.max(0, parseFloat(s.amount_due || '0') - parseFloat(s.amount_paid || '0'));

      if (sDate < todayStr) {
        overdue++;
        overdueAmount += pendingAmount;
        if (s.customer_id) overdueCustomers.add(s.customer_id);
      } else if (sDate === todayStr) {
        today++;
        todayAmount += pendingAmount;
        if (s.customer_id) todayCustomers.add(s.customer_id);
      } else {
        upcoming++;
        upcomingAmount += pendingAmount;
        if (s.customer_id) upcomingCustomers.add(s.customer_id);
      }
    }

    return { 
      overdue, 
      today, 
      upcoming,
      overdueAmount,
      todayAmount,
      upcomingAmount,
      overdueCustomersCount: overdueCustomers.size,
      todayCustomersCount: todayCustomers.size,
      upcomingCustomersCount: upcomingCustomers.size,
    };
  }

  static async getMapData(branchId: string, filters: { from?: string; to?: string; trip_id?: string }) {
    // 1. Fetch Customers with GPS (only within branch)
    const customers = await db.query.customersTable.findMany({
      where: and(
        eq(customersTable.branch_id, branchId),
        isNotNull(customersTable.gps_lat),
        isNotNull(customersTable.gps_lng)
      ),
      columns: { id: true, full_name: true, mobile: true, address: true, gps_lat: true, gps_lng: true }
    });

    // We'll figure out their status on the frontend based on active contracts or just show them as basic pins.

    // 2. Fetch Receipts with GPS
    const receiptConditions: any[] = [
      isNotNull(collectionReceiptsTable.gps_lat),
      isNotNull(collectionReceiptsTable.gps_lng)
    ];
    if (filters.trip_id) receiptConditions.push(eq(collectionReceiptsTable.trip_id, filters.trip_id));
    if (filters.from) receiptConditions.push(gte(collectionReceiptsTable.created_at, new Date(filters.from)));
    if (filters.to) receiptConditions.push(lte(collectionReceiptsTable.created_at, new Date(filters.to)));

    const receipts = await db.query.collectionReceiptsTable.findMany({
      where: and(...receiptConditions),
      with: {
        customer: { columns: { id: true, full_name: true, address: true, gps_lat: true, gps_lng: true } }
      }
    });

    // 3. Fetch Attempts with GPS (exclude COLLECTED attempts since they are already shown as receipts)
    const { ne } = await import("drizzle-orm");
    const attemptConditions: any[] = [
      isNotNull(collectionAttemptsTable.gps_lat),
      isNotNull(collectionAttemptsTable.gps_lng),
      ne(collectionAttemptsTable.status, "COLLECTED" as any)
    ];
    if (filters.trip_id) attemptConditions.push(eq(collectionAttemptsTable.trip_id, filters.trip_id));
    if (filters.from) attemptConditions.push(gte(collectionAttemptsTable.created_at, new Date(filters.from)));
    if (filters.to) attemptConditions.push(lte(collectionAttemptsTable.created_at, new Date(filters.to)));

    const attempts = await db.query.collectionAttemptsTable.findMany({
      where: and(...attemptConditions),
      with: {
        customer: { columns: { id: true, full_name: true, address: true, gps_lat: true, gps_lng: true } }
      }
    });

    // 4. Fetch Sales with GPS
    const { salesTable } = await import("../sale/sales.schema");
    const salesConditions: any[] = [
      isNotNull(salesTable.gps_lat),
      isNotNull(salesTable.gps_lng)
    ];
    if (filters.trip_id) salesConditions.push(eq(salesTable.trip_id, filters.trip_id));
    if (filters.from) salesConditions.push(gte(salesTable.created_at, new Date(filters.from)));
    if (filters.to) salesConditions.push(lte(salesTable.created_at, new Date(filters.to)));

    const { inArray } = await import("drizzle-orm");

    const salesRaw = await db
      .select({
        id: salesTable.id,
        reference_number: salesTable.reference_number,
        offline_receipt_number: salesTable.offline_receipt_number,
        branch_id: salesTable.branch_id,
        customer_id: salesTable.customer_id,
        trip_id: salesTable.trip_id,
        pre_order_id: salesTable.pre_order_id,
        created_by: salesTable.created_by,
        sale_type: salesTable.sale_type,
        payment_mode: salesTable.payment_mode,
        subtotal: salesTable.subtotal,
        promotion_id: salesTable.promotion_id,
        promotion_discount: salesTable.promotion_discount,
        manual_discount: salesTable.manual_discount,
        downpayment: salesTable.downpayment,
        tax_amount: salesTable.tax_amount,
        tax_details: salesTable.tax_details,
        total: salesTable.total,
        gps_lat: salesTable.gps_lat,
        gps_lng: salesTable.gps_lng,
        status: salesTable.status,
        notes: salesTable.notes,
        created_at: salesTable.created_at,
        customer_name: customersTable.full_name,
        customer_address: customersTable.address,
        customer_gps_lat: customersTable.gps_lat,
        customer_gps_lng: customersTable.gps_lng,
        contract_id: installmentContractsTable.id,
        contract_downpayment: installmentContractsTable.downpayment,
        scheme_interest_rate: installmentSchemesTable.interest_rate,
      })
      .from(salesTable)
      .leftJoin(customersTable, eq(salesTable.customer_id, customersTable.id))
      .leftJoin(installmentContractsTable, eq(salesTable.id, installmentContractsTable.sale_id))
      .leftJoin(installmentSchemesTable, eq(installmentContractsTable.scheme_id, installmentSchemesTable.id))
      .where(and(...salesConditions));

    const contractIds = salesRaw
      .map(s => s.contract_id)
      .filter(Boolean) as string[];

    const schedules = contractIds.length > 0
      ? await db
          .select()
          .from(installmentSchedulesTable)
          .where(and(
            inArray(installmentSchedulesTable.contract_id, contractIds),
            eq(installmentSchedulesTable.installment_number, 0)
          ))
      : [];

    const sales = salesRaw.map(s => {
      const contractSchedules = schedules.filter(sch => sch.contract_id === s.contract_id);
      return {
        id: s.id,
        reference_number: s.reference_number,
        offline_receipt_number: s.offline_receipt_number,
        branch_id: s.branch_id,
        customer_id: s.customer_id,
        trip_id: s.trip_id,
        pre_order_id: s.pre_order_id,
        created_by: s.created_by,
        sale_type: s.sale_type,
        payment_mode: s.payment_mode,
        subtotal: s.subtotal,
        promotion_id: s.promotion_id,
        promotion_discount: s.promotion_discount,
        manual_discount: s.manual_discount,
        downpayment: s.downpayment,
        tax_amount: s.tax_amount,
        tax_details: s.tax_details,
        total: s.total,
        gps_lat: s.gps_lat,
        gps_lng: s.gps_lng,
        status: s.status,
        notes: s.notes,
        created_at: s.created_at,
        customer: s.customer_name ? {
          id: s.customer_id,
          full_name: s.customer_name,
          address: s.customer_address,
          gps_lat: s.customer_gps_lat,
          gps_lng: s.customer_gps_lng,
        } : null,
        contract: s.contract_id ? {
          id: s.contract_id,
          downpayment: s.contract_downpayment,
          scheme: s.scheme_interest_rate ? {
            interest_rate: s.scheme_interest_rate
          } : null,
          schedules: contractSchedules
        } : null
      };
    });

    // 5. Fetch Route Breadcrumbs (Trip Routes)
    const { tripRoutesTable, tripsTable } = await import("../operations/operations.schema");
    const routeConditions: any[] = [eq(tripsTable.branch_id, branchId)];
    if (filters.trip_id) routeConditions.push(eq(tripRoutesTable.trip_id, filters.trip_id));
    if (filters.from) routeConditions.push(gte(tripRoutesTable.timestamp, new Date(filters.from)));
    if (filters.to) routeConditions.push(lte(tripRoutesTable.timestamp, new Date(filters.to)));

    const routes = await db.select({
      id: tripRoutesTable.id,
      trip_id: tripRoutesTable.trip_id,
      gps_lat: tripRoutesTable.gps_lat,
      gps_lng: tripRoutesTable.gps_lng,
      timestamp: tripRoutesTable.timestamp
    })
    .from(tripRoutesTable)
    .innerJoin(tripsTable, eq(tripRoutesTable.trip_id, tripsTable.id))
    .where(and(...routeConditions))
    .orderBy(asc(tripRoutesTable.timestamp));

    return { customers, receipts, attempts, sales, routes };
  }
}
