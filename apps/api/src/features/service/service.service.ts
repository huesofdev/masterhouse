import { eq, and, desc, sql, like, or } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "../../db";
import { returnsTable, warrantyClaimsTable } from "./service.schema";
import { saleItemsTable, salesTable } from "../sale/sales.schema";
import { serialItemsTable, inventoryBalancesTable } from "../inventory/inventory.schema";
import { installmentContractsTable, installmentSchedulesTable, collectionReceiptsTable, refundsTable } from "../collections/collections.schema";
import { customersTable } from "../customers/customers.schema";
import { warehousesTable } from "../warehouses/warehouses.schema";
import { ProcessReturnPayload, CreateWarrantyClaimPayload, UpdateWarrantyStatusPayload, CloseWarrantyClaimPayload } from "./service.types";

export class ServiceEngine {

  // ─── Fetch sale + items for the return form ───────────────────────────────
  static async getSaleWithItems(saleId: string) {
    const sale = await db.query.salesTable.findFirst({
      where: eq(salesTable.id, saleId),
      with: {
        customer: true,
        items: {
          with: {
            product: true,
            serialItem: true,
          }
        }
      }
    });
    if (!sale) return null;

    // Fetch existing returns for this sale
    const existingReturns = await db.select().from(returnsTable).where(eq(returnsTable.sale_id, saleId));
    const returnedSaleItemIds = new Set(existingReturns.map(r => r.sale_item_id));

    let financialSummary: any = null;

    if (sale.sale_type === "INSTALLMENT") {
      const contracts = await db.select().from(installmentContractsTable).where(eq(installmentContractsTable.sale_id, saleId)).limit(1);
      if (contracts.length > 0) {
        const contract = contracts[0];
        const receipts = await db.select().from(collectionReceiptsTable).where(eq(collectionReceiptsTable.contract_id, contract.id));
        const refunds = await db.select().from(refundsTable).where(eq(refundsTable.contract_id, contract.id));
        const schedules = await db.select().from(installmentSchedulesTable).where(eq(installmentSchedulesTable.contract_id, contract.id));

        const totalDownpayment = parseFloat(contract.downpayment || "0");
        const totalCollectionsPaid = receipts.reduce((sum, r) => sum + parseFloat(r.amount || "0"), 0);
        const totalCashPaid = totalDownpayment + totalCollectionsPaid;
        const totalRefundsIssued = refunds.reduce((sum, r) => sum + parseFloat(r.amount || "0"), 0);
        const netCashPaid = Math.max(0, totalCashPaid - totalRefundsIssued);
        const currentBalance = parseFloat(contract.balance || "0");

        const pendingSchedulesCount = schedules.filter(s => s.status === "PENDING" || s.status === "OVERDUE" || s.status === "PARTIALLY_PAID").length;

        financialSummary = {
          contract_id: contract.id,
          contract_status: contract.status,
          principal: parseFloat(contract.principal || "0"),
          interest_rate: parseFloat(contract.interest_rate || "0"),
          interest_amount: parseFloat(contract.interest_amount || "0"),
          total_payable: parseFloat(contract.total_payable || "0"),
          downpayment: totalDownpayment,
          total_collections_paid: totalCollectionsPaid,
          total_cash_paid: totalCashPaid,
          total_refunds_issued: totalRefundsIssued,
          net_cash_paid: netCashPaid,
          current_balance: currentBalance,
          pending_schedules_count: pendingSchedulesCount,
        };
      }
    } else {
      // CASH / DIRECT sale
      const refunds = await db.select().from(returnsTable).where(eq(returnsTable.sale_id, saleId));
      const totalRefundsIssued = refunds.reduce((sum, r) => sum + parseFloat(r.refund_amount || "0"), 0);
      const totalPaid = parseFloat(sale.total || "0");
      const netCashPaid = Math.max(0, totalPaid - totalRefundsIssued);

      financialSummary = {
        total_cash_paid: totalPaid,
        total_refunds_issued: totalRefundsIssued,
        net_cash_paid: netCashPaid,
        current_balance: 0,
      };
    }

    const enrichedItems = sale.items.map(item => {
      const isReturned = returnedSaleItemIds.has(item.id);
      const itemLineTotal = parseFloat(item.line_total || "0");
      const netCash = financialSummary?.net_cash_paid ?? itemLineTotal;
      const maxRefundable = isReturned ? 0 : Math.min(itemLineTotal, netCash);

      return {
        ...item,
        is_returned: isReturned,
        max_refundable_amount: maxRefundable,
      };
    });

    const activeItemsCount = enrichedItems.filter(i => !i.is_returned).length;

    return {
      ...sale,
      items: enrichedItems,
      financial_summary: financialSummary,
      active_items_count: activeItemsCount,
    };
  }

  // ─── List all returns for a branch ─────────────────────────────────────────
  static async listReturns(branchId: string, page: number = 1, limit: number = 30, search: string = '') {
    const offset = (page - 1) * limit;
    
    let whereClause: any = eq(salesTable.branch_id, branchId);
    if (search) {
      whereClause = and(
        whereClause,
        or(
          like(returnsTable.reason, `%${search}%`),
          like(returnsTable.type, `%${search}%`)
        )
      );
    }

    const data = await db.select({
      id: returnsTable.id,
      sale_id: returnsTable.sale_id,
      type: returnsTable.type,
      disposition: returnsTable.disposition,
      reason: returnsTable.reason,
      refund_amount: returnsTable.refund_amount,
      refund_mode: returnsTable.refund_mode,
      created_at: returnsTable.created_at,
      sale_item_id: returnsTable.sale_item_id,
    })
    .from(returnsTable)
    .innerJoin(salesTable, eq(returnsTable.sale_id, salesTable.id))
    .where(whereClause)
    .orderBy(desc(returnsTable.created_at))
    .limit(limit)
    .offset(offset);

    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(returnsTable)
      .innerJoin(salesTable, eq(returnsTable.sale_id, salesTable.id))
      .where(whereClause);

    const count = Number(countResult[0].count);

    return {
      data,
      meta: {
        total_records: count,
        total_pages: Math.ceil(count / limit),
        current_page: page,
        page_size: limit,
      },
    };
  }

  // ─── Process a return ──────────────────────────────────────────────────────
  static async processReturn(payload: ProcessReturnPayload, processedBy: string, branchId: string): Promise<string> {
    return await db.transaction(async (tx) => {
      // 1. Fetch sale item & parent sale
      const saleItems = await tx.select().from(saleItemsTable).where(eq(saleItemsTable.id, payload.sale_item_id)).limit(1);
      if (saleItems.length === 0) throw new Error("Sale item not found");
      const saleItem = saleItems[0];

      // Check if already returned
      const prevReturn = await tx.select().from(returnsTable).where(eq(returnsTable.sale_item_id, saleItem.id)).limit(1);
      if (prevReturn.length > 0) {
        throw new Error("This item has already been returned.");
      }

      const sales = await tx.select().from(salesTable).where(eq(salesTable.id, saleItem.sale_id)).limit(1);
      if (sales.length === 0) throw new Error("Sale not found");
      const sale = sales[0];

      // Fetch all items on this sale to determine if this is a single-item contract or multi-item partial return
      const allSaleItems = await tx.select().from(saleItemsTable).where(eq(saleItemsTable.sale_id, sale.id));
      const allReturns = await tx.select().from(returnsTable).where(eq(returnsTable.sale_id, sale.id));
      const returnedItemIds = new Set(allReturns.map(r => r.sale_item_id));
      returnedItemIds.add(saleItem.id); // Add current item

      const isFinalItemReturn = allSaleItems.every(i => returnedItemIds.has(i.id));

      // 2. Validate refund amount
      const refundAmt = Math.max(0, payload.refund_amount || 0);

      // 3. Insert return record
      const returnId = uuidv7();
      await tx.insert(returnsTable).values({
        id: returnId,
        sale_id: saleItem.sale_id,
        sale_item_id: saleItem.id,
        serial_item_id: saleItem.serial_item_id || null,
        type: payload.type,
        disposition: payload.disposition,
        reason: payload.reason,
        refund_amount: refundAmt.toFixed(2),
        refund_mode: payload.refund_mode,
        processed_by: processedBy,
      });

      // 4. Update serial item status based on disposition
      // Find the target warehouse in the branch (default warehouse or first branch warehouse)
      const defWh = await tx.select().from(warehousesTable)
        .where(and(eq(warehousesTable.branch_id, branchId), eq(warehousesTable.is_default, true)))
        .limit(1);
      let targetWhId = defWh.length > 0 ? defWh[0].id : null;
      if (!targetWhId) {
        const anyWh = await tx.select().from(warehousesTable)
          .where(eq(warehousesTable.branch_id, branchId))
          .limit(1);
        if (anyWh.length > 0) targetWhId = anyWh[0].id;
      }

      if (saleItem.serial_item_id) {
        let newSerialStatus: "IN_STOCK" | "DEFECTIVE" | "RETURNED" = "RETURNED";
        if (payload.disposition === "RESTOCKED") newSerialStatus = "IN_STOCK";
        if (payload.disposition === "DEFECTIVE_DEPOT" || payload.disposition === "WRITTEN_OFF") newSerialStatus = "DEFECTIVE";

        await tx.update(serialItemsTable)
          .set({ 
            status: newSerialStatus,
            warehouse_id: targetWhId || undefined
          })
          .where(eq(serialItemsTable.id, saleItem.serial_item_id));

        // If RESTOCKED, increment inventory_balances for that target warehouse so POS reflects the count
        if (payload.disposition === "RESTOCKED" && targetWhId) {
          const existing = await tx.select().from(inventoryBalancesTable)
            .where(and(eq(inventoryBalancesTable.warehouse_id, targetWhId), eq(inventoryBalancesTable.product_id, saleItem.product_id)));
          
          if (existing.length > 0) {
            await tx.update(inventoryBalancesTable)
              .set({ quantity: existing[0].quantity + 1 })
              .where(and(eq(inventoryBalancesTable.warehouse_id, targetWhId), eq(inventoryBalancesTable.product_id, saleItem.product_id)));
          } else {
            await tx.insert(inventoryBalancesTable).values({
              warehouse_id: targetWhId,
              product_id: saleItem.product_id,
              quantity: 1,
            });
          }
        }
      } else {
        // Bulk item: restock qty to default warehouse
        if (payload.disposition === "RESTOCKED" && targetWhId) {
          const existing = await tx.select().from(inventoryBalancesTable)
            .where(and(eq(inventoryBalancesTable.warehouse_id, targetWhId), eq(inventoryBalancesTable.product_id, saleItem.product_id)));
          
          if (existing.length > 0) {
            await tx.update(inventoryBalancesTable)
              .set({ quantity: existing[0].quantity + saleItem.quantity })
              .where(and(eq(inventoryBalancesTable.warehouse_id, targetWhId), eq(inventoryBalancesTable.product_id, saleItem.product_id)));
          } else {
            await tx.insert(inventoryBalancesTable).values({
              warehouse_id: targetWhId,
              product_id: saleItem.product_id,
              quantity: saleItem.quantity,
            });
          }
        }
      }

      // 5. Financial settlement for Installment Sales
      if (sale.sale_type === "INSTALLMENT") {
        const contracts = await tx.select().from(installmentContractsTable)
          .where(eq(installmentContractsTable.sale_id, sale.id)).limit(1);
        
        if (contracts.length > 0) {
          const contract = contracts[0];

          // Compute total cash received and previous refunds
          const receipts = await tx.select().from(collectionReceiptsTable)
            .where(eq(collectionReceiptsTable.contract_id, contract.id));
          const sumPaid = receipts.reduce((acc, r) => acc + parseFloat(r.amount || "0"), 0);
          const totalPaid = parseFloat(contract.downpayment || "0") + sumPaid;

          const existingRefunds = await tx.select().from(refundsTable)
            .where(eq(refundsTable.contract_id, contract.id));
          const prevRefundsTotal = existingRefunds.reduce((acc, r) => acc + parseFloat(r.amount || "0"), 0);
          const netCashAvailable = Math.max(0, totalPaid - prevRefundsTotal);

          // Validation
          const itemPrice = parseFloat(saleItem.line_total || "0");
          const safeMaxRefund = Math.min(itemPrice, netCashAvailable);

          if (refundAmt > safeMaxRefund) {
            throw new Error(`Refund amount (Rs. ${refundAmt.toFixed(2)}) exceeds the maximum safe refund limit (Rs. ${safeMaxRefund.toFixed(2)}).`);
          }

          if (isFinalItemReturn) {
            // FULL CONTRACT RETURN: Cancel contract and waive all pending schedules
            await tx.update(installmentContractsTable)
              .set({ status: "CANCELLED", balance: "0.00" })
              .where(eq(installmentContractsTable.id, contract.id));

            await tx.update(installmentSchedulesTable)
              .set({ status: "WAIVED" })
              .where(and(
                eq(installmentSchedulesTable.contract_id, contract.id),
                or(
                  eq(installmentSchedulesTable.status, "PENDING"),
                  eq(installmentSchedulesTable.status, "OVERDUE"),
                  eq(installmentSchedulesTable.status, "PARTIALLY_PAID")
                )
              ));
          } else {
            // PARTIAL ITEM RETURN: Contract remains ACTIVE! Deduct returned item's share from balance.
            const totalInvoice = parseFloat(sale.total || "0");
            const itemPriceRatio = totalInvoice > 0 ? (itemPrice / totalInvoice) : 0;
            const originalPrincipal = parseFloat(contract.principal || "0");
            const interestRate = parseFloat(contract.interest_rate || "0");

            // Item share of principal & total payable with interest
            const itemPrincipalShare = originalPrincipal * itemPriceRatio;
            const itemTotalPayableShare = itemPrincipalShare * (1 + interestRate / 100);

            const newPrincipal = Math.max(0, originalPrincipal - itemPrincipalShare);
            const currentBalance = parseFloat(contract.balance || "0");
            const balanceDeduction = itemTotalPayableShare;
            const newBalance = Math.max(0, currentBalance - balanceDeduction);

            await tx.update(installmentContractsTable)
              .set({ 
                principal: newPrincipal.toFixed(2),
                balance: newBalance.toFixed(2)
              })
              .where(eq(installmentContractsTable.id, contract.id));

            // Downsize remaining pending schedules from last to first
            const pendingSchedules = await tx.select().from(installmentSchedulesTable)
              .where(and(
                eq(installmentSchedulesTable.contract_id, contract.id),
                or(
                  eq(installmentSchedulesTable.status, "PENDING"),
                  eq(installmentSchedulesTable.status, "OVERDUE"),
                  eq(installmentSchedulesTable.status, "PARTIALLY_PAID")
                )
              ))
              .orderBy(desc(installmentSchedulesTable.installment_number));

            let amountToDeduct = balanceDeduction;
            for (const sched of pendingSchedules) {
              if (amountToDeduct <= 0) break;
              const schedDue = parseFloat(sched.amount_due || "0");
              const schedPaid = parseFloat(sched.amount_paid || "0");
              const remainingOnSched = Math.max(0, schedDue - schedPaid);

              if (amountToDeduct >= remainingOnSched) {
                // Waive this schedule
                await tx.update(installmentSchedulesTable)
                  .set({ status: "WAIVED" })
                  .where(eq(installmentSchedulesTable.id, sched.id));
                amountToDeduct -= remainingOnSched;
              } else {
                // Partially reduce schedule amount
                const newDue = Math.max(0, schedDue - amountToDeduct);
                await tx.update(installmentSchedulesTable)
                  .set({ amount_due: newDue.toFixed(2) })
                  .where(eq(installmentSchedulesTable.id, sched.id));
                amountToDeduct = 0;
              }
            }
          }

          // Insert refund record if cash refund was given
          if (refundAmt > 0) {
            await tx.insert(refundsTable).values({
              id: uuidv7(),
              contract_id: contract.id,
              customer_id: contract.customer_id,
              amount: refundAmt.toFixed(2),
              reason: payload.reason,
              approved_by: processedBy,
            });
          }
        }
      } else if (refundAmt > 0) {
        // Direct cash sale refund
        const prevReturns = await tx.select().from(returnsTable).where(eq(returnsTable.sale_id, sale.id));
        const prevRefundsTotal = prevReturns.reduce((acc, r) => acc + parseFloat(r.refund_amount || "0"), 0);
        const totalSaleCash = parseFloat(sale.total || "0");
        const maxCashRefund = Math.max(0, totalSaleCash - prevRefundsTotal);

        if (refundAmt > maxCashRefund) {
          throw new Error(`Refund amount (Rs. ${refundAmt.toFixed(2)}) exceeds original cash paid (Rs. ${maxCashRefund.toFixed(2)}).`);
        }
      }

      if (isFinalItemReturn) {
        await tx.update(salesTable)
          .set({ status: "RETURNED" })
          .where(eq(salesTable.id, sale.id));
      }

      // If store credit refund, add to customer wallet
      if (payload.refund_mode === "STORE_CREDIT" && refundAmt > 0 && sale.customer_id) {
        const custArr = await tx.select().from(customersTable).where(eq(customersTable.id, sale.customer_id)).limit(1);
        if (custArr.length > 0) {
          const currentBal = parseFloat(custArr[0].wallet_balance || "0");
          await tx.update(customersTable)
            .set({ wallet_balance: (currentBal + refundAmt).toFixed(2) })
            .where(eq(customersTable.id, sale.customer_id));
        }
      }

      return returnId;
    });
  }

  // ─── Warranty Claims ───────────────────────────────────────────────────────
  static async listWarrantyClaims(branchId: string, status?: string, page: number = 1, limit: number = 30, search: string = '') {
    const offset = (page - 1) * limit;

    let whereClause: any = eq(salesTable.branch_id, branchId);
    if (status) {
      whereClause = and(whereClause, eq(warrantyClaimsTable.status, status));
    }
    if (search) {
      whereClause = and(
        whereClause,
        or(
          like(customersTable.full_name, `%${search}%`),
          like(warrantyClaimsTable.issue_description, `%${search}%`),
          like(serialItemsTable.serial_number, `%${search}%`)
        )
      );
    }

    const data = await db.select({
      id: warrantyClaimsTable.id,
      sale_item_id: warrantyClaimsTable.sale_item_id,
      customer_id: warrantyClaimsTable.customer_id,
      serial_item_id: warrantyClaimsTable.serial_item_id,
      issue_description: warrantyClaimsTable.issue_description,
      status: warrantyClaimsTable.status,
      resolution: warrantyClaimsTable.resolution,
      collected_at: warrantyClaimsTable.collected_at,
      sent_to_supplier_at: warrantyClaimsTable.sent_to_supplier_at,
      received_from_supplier_at: warrantyClaimsTable.received_from_supplier_at,
      resolved_at: warrantyClaimsTable.resolved_at,
      created_at: warrantyClaimsTable.created_at,
      customer_name: customersTable.full_name,
      customer_mobile: customersTable.mobile,
      serial_number: serialItemsTable.serial_number,
      sale_id: salesTable.id,
    })
    .from(warrantyClaimsTable)
    .innerJoin(customersTable, eq(warrantyClaimsTable.customer_id, customersTable.id))
    .innerJoin(saleItemsTable, eq(warrantyClaimsTable.sale_item_id, saleItemsTable.id))
    .innerJoin(salesTable, eq(saleItemsTable.sale_id, salesTable.id))
    .leftJoin(serialItemsTable, eq(warrantyClaimsTable.serial_item_id, serialItemsTable.id))
    .where(whereClause)
    .orderBy(desc(warrantyClaimsTable.created_at))
    .limit(limit)
    .offset(offset);

    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(warrantyClaimsTable)
      .innerJoin(customersTable, eq(warrantyClaimsTable.customer_id, customersTable.id))
      .innerJoin(saleItemsTable, eq(warrantyClaimsTable.sale_item_id, saleItemsTable.id))
      .innerJoin(salesTable, eq(saleItemsTable.sale_id, salesTable.id))
      .leftJoin(serialItemsTable, eq(warrantyClaimsTable.serial_item_id, serialItemsTable.id))
      .where(whereClause);

    const count = Number(countResult[0].count);

    return {
      data,
      meta: {
        total_records: count,
        total_pages: Math.ceil(count / limit),
        current_page: page,
        page_size: limit,
      },
    };
  }

  static async getWarrantyClaim(claimId: string) {
    const results = await db.select().from(warrantyClaimsTable).where(eq(warrantyClaimsTable.id, claimId)).limit(1);
    return results[0] || null;
  }

  static async createWarrantyClaim(payload: CreateWarrantyClaimPayload, processedBy: string): Promise<string> {
    // Check the sale item exists and get its serial
    const saleItems = await db.select().from(saleItemsTable).where(eq(saleItemsTable.id, payload.sale_item_id)).limit(1);
    if (saleItems.length === 0) throw new Error("Sale item not found");
    const saleItem = saleItems[0];

    const claimId = uuidv7();
    await db.insert(warrantyClaimsTable).values({
      id: claimId,
      sale_item_id: payload.sale_item_id,
      customer_id: payload.customer_id,
      serial_item_id: saleItem.serial_item_id || null,
      issue_description: payload.issue_description,
      status: "OPEN",
      processed_by: processedBy,
    });

    return claimId;
  }

  static async updateWarrantyStatus(claimId: string, payload: UpdateWarrantyStatusPayload): Promise<void> {
    const now = new Date();
    const setClause: any = { status: payload.status };

    if (payload.status === "ITEM_COLLECTED") {
      setClause.collected_at = now;
      // Mark serial as UNDER_WARRANTY
      const claim = await db.select().from(warrantyClaimsTable).where(eq(warrantyClaimsTable.id, claimId)).limit(1);
      if (claim[0]?.serial_item_id) {
        await db.update(serialItemsTable).set({ status: "UNDER_WARRANTY" }).where(eq(serialItemsTable.id, claim[0].serial_item_id));
      }
    }
    if (payload.status === "SENT_TO_SUPPLIER") setClause.sent_to_supplier_at = now;
    if (payload.status === "REPAIRED") setClause.received_from_supplier_at = now;

    await db.update(warrantyClaimsTable).set(setClause).where(eq(warrantyClaimsTable.id, claimId));
  }

  static async closeWarrantyClaim(claimId: string, payload: CloseWarrantyClaimPayload): Promise<void> {
    const claims = await db.select().from(warrantyClaimsTable).where(eq(warrantyClaimsTable.id, claimId)).limit(1);
    if (claims.length === 0) throw new Error("Warranty claim not found");
    const claim = claims[0];

    await db.transaction(async (tx) => {
      const setClause: any = {
        status: "CLOSED",
        resolution: payload.resolution,
        resolved_at: new Date(),
      };

      if (payload.resolution === "REPAIRED" && claim.serial_item_id) {
        // Item is repaired: mark as SOLD again (back with customer)
        await tx.update(serialItemsTable).set({ status: "SOLD" }).where(eq(serialItemsTable.id, claim.serial_item_id));
      }

      if (payload.resolution === "REPLACED") {
        if (!payload.replacement_serial_id) throw new Error("replacement_serial_id is required for REPLACED resolution");
        setClause.replacement_serial_id = payload.replacement_serial_id;

        // Old unit → DEFECTIVE
        if (claim.serial_item_id) {
          await tx.update(serialItemsTable).set({ status: "DEFECTIVE" }).where(eq(serialItemsTable.id, claim.serial_item_id));
        }
        // New unit → SOLD
        await tx.update(serialItemsTable).set({ status: "SOLD" }).where(eq(serialItemsTable.id, payload.replacement_serial_id));
      }

      if (payload.resolution === "REJECTED" && claim.serial_item_id) {
        // Item returned to customer as-is
        await tx.update(serialItemsTable).set({ status: "SOLD" }).where(eq(serialItemsTable.id, claim.serial_item_id));
      }

      await tx.update(warrantyClaimsTable).set(setClause).where(eq(warrantyClaimsTable.id, claimId));
    });
  }
}
