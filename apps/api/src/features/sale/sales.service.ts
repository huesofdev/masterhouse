import { db } from "../../db";
import { v7 as uuidv7 } from "uuid";
import { salesTable, saleItemsTable } from "./sales.schema";
import { productsTable } from "../products/products.schema";
import { serialItemsTable, inventoryBalancesTable } from "../inventory/inventory.schema";
import { intakeItemsTable } from "../inventory/intake.schema";
import { warehousesTable } from "../warehouses/warehouses.schema";
import { tripStockTable, discrepancyLogsTable, tripsTable } from "../operations/operations.schema";
import { categoriesTable, brandsTable } from "../catalog/catalog.schema";
import { installmentSchemesTable, installmentContractsTable, installmentSchedulesTable, collectionReceiptsTable, collectionAttemptsTable, contractAdjustmentsTable } from "../collections/collections.schema";
import { guarantorsTable, customersTable } from "../customers/customers.schema";
import { usersTable } from "../user/user.schema";
import { promotionsTable } from "../promotions/promotions.schema";
import { returnsTable } from "../service/service.schema";
import { eq, and, or, like, sum, desc, sql, inArray, asc, gte, lte, isNull, isNotNull } from "drizzle-orm";
import { CreateSalePayload } from "./sales.types";
import { NotificationsService } from "../notifications/notifications.service";
import { branchesTable, branchPhonesTable } from "../branches/branches.schema";
import { SettingsService } from "../settings/settings.service";
import { S3Util } from "../../utils/s3.util";
import { preOrdersTable } from "../orders/orders.schema";
import { roundMoney } from "../../utils/money.util";

export class SalesService {
  static async listSales(
    branchId: string, 
    page: number = 1, 
    limit: number = 100, 
    search: string = '',
    startDate?: string,
    endDate?: string,
    saleType?: string,
    paymentMode?: string,
    status?: string,
    source?: string,
    routeId?: string,
    userId?: string
  ) {
    const offset = (page - 1) * limit;

    let conditions = [eq(salesTable.branch_id, branchId)];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      const matchingCustomerIds = db
        .select({ id: customersTable.id })
        .from(customersTable)
        .where(
          or(
            like(customersTable.full_name, term),
            like(customersTable.mobile, term),
            like(customersTable.nic, term)
          )
        );

      const matchingItemSaleIds = db
        .select({ sale_id: saleItemsTable.sale_id })
        .from(saleItemsTable)
        .leftJoin(productsTable, eq(saleItemsTable.product_id, productsTable.id))
        .leftJoin(serialItemsTable, eq(saleItemsTable.serial_item_id, serialItemsTable.id))
        .where(
          or(
            like(productsTable.name, term),
            like(productsTable.sku, term),
            like(serialItemsTable.serial_number, term)
          )
        );

      conditions.push(
        or(
          like(salesTable.id, term),
          like(salesTable.reference_number, term),
          like(salesTable.offline_receipt_number, term),
          like(salesTable.sale_type, term),
          inArray(salesTable.customer_id, matchingCustomerIds),
          inArray(salesTable.id, matchingItemSaleIds)
        )!
      );
    }
    
    if (startDate) {
      conditions.push(gte(salesTable.created_at, new Date(startDate)));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(salesTable.created_at, end));
    }
    if (saleType && saleType !== "ALL") {
      conditions.push(eq(salesTable.sale_type, saleType as any));
    }
    if (paymentMode && paymentMode !== "ALL") {
      conditions.push(eq(salesTable.payment_mode, paymentMode as any));
    }
    if (status && status !== "ALL") {
      conditions.push(eq(salesTable.status, status as any));
    }
    
    if (source === "OFFICE") {
      conditions.push(isNull(salesTable.trip_id));
    } else if (source === "TRIP") {
      conditions.push(isNotNull(salesTable.trip_id));
    }

    if (userId && userId !== "ALL") {
      conditions.push(eq(salesTable.created_by, userId));
    }

    if (routeId && routeId !== "ALL") {
      conditions.push(
        inArray(
          salesTable.customer_id,
          db.select({ id: customersTable.id }).from(customersTable).where(eq(customersTable.route_id, routeId))
        )
      );
    }

    const whereClause = and(...conditions);

    const data = await db.query.salesTable.findMany({
      where: whereClause,
      orderBy: [desc(salesTable.created_at)],
      limit,
      offset,
      with: {
        customer: true,
        creator: true,
        items: {
          with: {
            product: true
          }
        }
      },
    });

    const saleIds = data.map(s => s.id);
    let returnsBySale: Record<string, { count: number; totalRefund: number; refundModes: string[] }> = {};
    if (saleIds.length > 0) {
      const returns = await db.select({
        id: returnsTable.id,
        sale_id: returnsTable.sale_id,
        refund_amount: returnsTable.refund_amount,
        refund_mode: returnsTable.refund_mode,
      }).from(returnsTable).where(inArray(returnsTable.sale_id, saleIds));

      for (const r of returns) {
        if (!returnsBySale[r.sale_id]) {
          returnsBySale[r.sale_id] = { count: 0, totalRefund: 0, refundModes: [] };
        }
        returnsBySale[r.sale_id].count += 1;
        returnsBySale[r.sale_id].totalRefund += parseFloat(r.refund_amount || "0");
        if (r.refund_mode && !returnsBySale[r.sale_id].refundModes.includes(r.refund_mode)) {
          returnsBySale[r.sale_id].refundModes.push(r.refund_mode);
        }
      }
    }

    const mappedData = data.map(sale => {
      const retInfo = returnsBySale[sale.id];
      const isFullyReturned = sale.status === 'RETURNED' || (retInfo && retInfo.count >= sale.items.length && sale.items.length > 0);
      const isPartiallyReturned = !isFullyReturned && Boolean(retInfo && retInfo.count > 0);

      let effectiveStatus = sale.status;
      if (isFullyReturned) effectiveStatus = 'RETURNED';

      return {
        ...sale,
        status: effectiveStatus,
        product_name: sale.items.map(item => `${item.quantity}x ${item.product?.name || 'Unknown'}`).join(", "),
        has_returns: Boolean(retInfo && retInfo.count > 0),
        returns_count: retInfo?.count || 0,
        total_refunded: retInfo?.totalRefund || 0,
        refund_modes: retInfo?.refundModes || [],
        is_fully_returned: isFullyReturned,
        is_partially_returned: isPartiallyReturned,
      };
    });

    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(salesTable)
      .where(whereClause);
      
    const count = Number(countResult[0].count);

    return {
      data: mappedData,
      meta: {
        total_records: count,
        total_pages: Math.ceil(count / limit),
        current_page: page,
        page_size: limit
      }
    };
  }

  static async getSaleDetails(saleId: string) {
    const sale = await db.query.salesTable.findFirst({
      where: eq(salesTable.id, saleId),
      with: {
        customer: true,
        creator: true,
        branch: {
          with: {
            phones: true,
          }
        },
        items: {
          with: {
            product: true,
            serialItem: true,
          }
        }
      }
    });

    if (!sale) return null;

    let contract = null;
    if (sale.sale_type === 'INSTALLMENT') {
       const contractRecord = await db.query.installmentContractsTable.findFirst({
         where: eq(installmentContractsTable.sale_id, saleId),
         with: {
           guarantor: true,
           scheme: true,
           schedules: true,
         }
       });

       if (contractRecord) {
         const g = contractRecord.guarantor;
         const g_nic_front_signed_url = g?.nic_front_url ? await S3Util.getSignedDownloadUrl(g.nic_front_url, 900) : null;
         const g_nic_back_signed_url = g?.nic_back_url ? await S3Util.getSignedDownloadUrl(g.nic_back_url, 900) : null;
         const signature_signed_url = contractRecord.signature_image_url ? await S3Util.getSignedDownloadUrl(contractRecord.signature_image_url, 900) : null;
         const guarantor_signature_signed_url = contractRecord.guarantor_signature_image_url ? await S3Util.getSignedDownloadUrl(contractRecord.guarantor_signature_image_url, 900) : null;

         contract = {
           ...contractRecord,
           signature_signed_url,
           guarantor_signature_signed_url,
           guarantor: g ? {
             ...g,
             nic_front_signed_url: g_nic_front_signed_url,
             nic_back_signed_url: g_nic_back_signed_url,
           } : null
         };
       }
    }

    let taxes = [];
    if (sale.tax_details) {
      try {
        taxes = JSON.parse(sale.tax_details);
      } catch (e) {}
    }

    const saleReturns = await db.select({
      id: returnsTable.id,
      sale_item_id: returnsTable.sale_item_id,
      type: returnsTable.type,
      disposition: returnsTable.disposition,
      reason: returnsTable.reason,
      refund_amount: returnsTable.refund_amount,
      refund_mode: returnsTable.refund_mode,
      created_at: returnsTable.created_at,
    }).from(returnsTable).where(eq(returnsTable.sale_id, saleId));

    const totalRefunded = saleReturns.reduce((acc, r) => acc + parseFloat(r.refund_amount || "0"), 0);
    const isFullyReturned = sale.status === 'RETURNED' || (saleReturns.length >= sale.items.length && sale.items.length > 0);
    const isPartiallyReturned = !isFullyReturned && saleReturns.length > 0;

    let effectiveStatus = sale.status;
    if (isFullyReturned) effectiveStatus = 'RETURNED';

    return {
       ...sale,
       status: effectiveStatus,
       taxes,
       contract,
       returns: saleReturns,
       total_refunded: totalRefunded,
       is_fully_returned: isFullyReturned,
       is_partially_returned: isPartiallyReturned,
    };
  }

  static async posSearch(query: string, branchId: string) {
    // 1. Try to find a matching serial number in a warehouse belonging to this branch
    const serialMatches = await db.select({
      serialItem: serialItemsTable,
      product: productsTable,
      brand: brandsTable,
      unit_cost: intakeItemsTable.unit_cost,
    })
    .from(serialItemsTable)
    .innerJoin(productsTable, eq(serialItemsTable.product_id, productsTable.id))
    .leftJoin(brandsTable, eq(productsTable.brand_id, brandsTable.id))
    .innerJoin(warehousesTable, eq(serialItemsTable.warehouse_id, warehousesTable.id))
    .leftJoin(intakeItemsTable, eq(serialItemsTable.intake_item_id, intakeItemsTable.id))
    .where(
      and(
        eq(warehousesTable.branch_id, branchId),
        eq(serialItemsTable.serial_number, query),
        eq(serialItemsTable.status, "IN_STOCK")
      )
    );

    if (serialMatches.length > 0) {
      const match = serialMatches[0];
      if (match.brand) {
        (match.product as any).brand = match.brand;
      }
      if (match.product.image_url) {
        (match.product as any).image_signed_url = await S3Util.getSignedDownloadUrl(match.product.image_url, 604800);
      }
      (match.product as any).last_purchase_price = match.unit_cost || match.product.last_purchase_price;
      return { type: "SERIAL_MATCH", data: match };
    }

    // 2. Search products by SKU or Name
    const productMatchesRaw = await db.select({
      product: productsTable,
      brand: brandsTable,
      available_quantity: inventoryBalancesTable.quantity,
      warehouse_id: warehousesTable.id,
      warehouse_name: warehousesTable.name,
    })
    .from(productsTable)
    .leftJoin(brandsTable, eq(productsTable.brand_id, brandsTable.id))
    .leftJoin(inventoryBalancesTable, eq(productsTable.id, inventoryBalancesTable.product_id))
    .leftJoin(warehousesTable, eq(inventoryBalancesTable.warehouse_id, warehousesTable.id))
    .where(
      and(
        or(
          like(productsTable.sku, `%${query}%`),
          like(productsTable.name, `%${query}%`)
        ),
        eq(warehousesTable.branch_id, branchId)
      )
    );

    // Aggregate quantities across all warehouses in the branch
    const productMap = new Map();
    for (const row of productMatchesRaw) {
      const qty = Number(row.available_quantity || 0);
      if (productMap.has(row.product.id)) {
        const p = productMap.get(row.product.id);
        p.available_quantity += qty;
        if (row.warehouse_id) {
          p.warehouse_breakdown.push({
            warehouse_id: row.warehouse_id,
            warehouse_name: row.warehouse_name,
            quantity: qty
          });
        }
      } else {
        const breakdown = [];
        if (row.warehouse_id) {
          breakdown.push({
            warehouse_id: row.warehouse_id,
            warehouse_name: row.warehouse_name,
            quantity: qty
          });
        }
        
        const pCopy = { ...row.product } as any;
        if (row.brand) {
          pCopy.brand = row.brand;
        }

        productMap.set(row.product.id, {
          product: pCopy,
          available_quantity: qty,
          warehouse_breakdown: breakdown
        });
      }
    }

    // Fetch active trip stock for these products and append to breakdown
    const productIds = Array.from(productMap.keys());
    if (productIds.length > 0) {
      const { tripsTable, tripStockTable } = await import("../operations/operations.schema");
      const { usersTable } = await import("../user/user.schema");
      const { fleetVehiclesTable } = await import("../vehicles/vehicles.schema");

      const tripStocks = await db.select({
        productId: tripStockTable.product_id,
        tripId: tripsTable.id,
        repName: usersTable.name,
        licensePlate: fleetVehiclesTable.license_plate,
        loadedQty: tripStockTable.loaded_qty,
        returnedQty: tripStockTable.returned_qty,
        soldQty: tripStockTable.sold_qty,
      })
      .from(tripStockTable)
      .innerJoin(tripsTable, eq(tripStockTable.trip_id, tripsTable.id))
      .innerJoin(usersTable, eq(tripsTable.incharge_id, usersTable.id))
      .innerJoin(fleetVehiclesTable, eq(tripsTable.vehicle_id, fleetVehiclesTable.id))
      .where(
        and(
          inArray(tripStockTable.product_id, productIds),
          eq(tripsTable.branch_id, branchId),
          inArray(tripsTable.status, ["LOADING", "DEPARTED", "IN_PROGRESS"])
        )
      );

      const tripAggregates = new Map<string, {
        productId: string;
        tripId: string;
        repName: string;
        licensePlate: string;
        quantity: number;
      }>();

      for (const row of tripStocks) {
        const availableQty = row.loadedQty - row.returnedQty - row.soldQty;
        if (availableQty > 0) {
          const key = `${row.productId}-${row.tripId}`;
          const existing = tripAggregates.get(key);
          if (existing) {
            existing.quantity += availableQty;
          } else {
            tripAggregates.set(key, {
              productId: row.productId,
              tripId: row.tripId,
              repName: row.repName || 'Rep',
              licensePlate: row.licensePlate,
              quantity: availableQty
            });
          }
        }
      }

      for (const agg of tripAggregates.values()) {
        const p = productMap.get(agg.productId);
        if (p) {
          p.warehouse_breakdown.push({
            warehouse_id: `trip-${agg.tripId}`,
            warehouse_name: `Trip (${agg.repName} - ${agg.licensePlate})`,
            quantity: agg.quantity
          });
        }
      }
    }
    
    const productMatches = Array.from(productMap.values()).slice(0, 100);

    const matchesWithUrl = await Promise.all(productMatches.map(async (m: any) => {
      if (m.product.image_url) {
        m.product.image_signed_url = await S3Util.getSignedDownloadUrl(m.product.image_url, 604800);
      }
      return m;
    }));

    return { type: "PRODUCT_MATCH", data: matchesWithUrl };
  }

  static async createSale(payload: CreateSalePayload, branchId: string, userId: string) {
    const saleId = payload.id || uuidv7();

    return await db.transaction(async (tx) => {
      // 0. Idempotency Check
      if (payload.idempotencyKey) {
        const existing = await tx.select({ id: salesTable.id }).from(salesTable).where(eq(salesTable.idempotency_key, payload.idempotencyKey)).limit(1);
        if (existing.length > 0) return existing[0].id;
      }
      if (payload.id) {
        const existing = await tx.select({ id: salesTable.id }).from(salesTable).where(eq(salesTable.id, payload.id)).limit(1);
        if (existing.length > 0) return payload.id;
      }

      // 0.5 Validations for Discounts
      if (payload.promotion_id) {
        const promo = await tx.select().from(promotionsTable).where(eq(promotionsTable.id, payload.promotion_id)).limit(1);
        if (promo.length === 0 || !promo[0].is_active || promo[0].start_date > new Date() || promo[0].end_date < new Date()) {
           throw new Error("Invalid or expired promotion");
        }
      }

      if (payload.manual_discount > 0) {
        const userRec = await tx.select({ max_discount: usersTable.max_discount_percentage }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
        if (userRec.length > 0) {
          const maxAllowed = Number(userRec[0].max_discount);
          const requestedPercentage = (payload.manual_discount / payload.subtotal) * 100;
          if (requestedPercentage > maxAllowed) {
            throw new Error(`Manual discount exceeds your authorized limit of ${maxAllowed}%`);
          }
        }
      }

      // We skip the strict expectedTotal check here because tax could be INCLUSIVE or EXCLUSIVE, 
      // which is computed accurately by the POS frontend.
      if (payload.total < 0) {
         throw new Error(`Total amount cannot be negative`);
      }

      let referenceNumber = payload.reference_number;
      if (!referenceNumber) {
        const { getNextSequence } = await import("../../lib/sequence-generator");
        referenceNumber = await getNextSequence(tx, branchId, "INVOICE");
      }

      // --- BACKWARD COMPATIBILITY PATCH FOR OLD MOBILE APP BUG ---
      // The old mobile app incorrectly subtracted the booking deposit from the total sent to the backend.
      // We detect this by checking if payload.total == payload.subtotal - bookingDeposit (minus discounts).
      if (payload.pre_order_id) {
        const { preOrdersTable } = await import("../orders/orders.schema");
        const po = await tx.select().from(preOrdersTable).where(eq(preOrdersTable.id, payload.pre_order_id)).limit(1);
        if (po.length > 0) {
          const bookingDeposit = Number(po[0].advance_payment || 0);
          const computedGross = payload.subtotal - payload.promotion_discount - payload.manual_discount;
          // If the total sent by mobile exactly matches computedGross - bookingDeposit, it's the old bug!
          if (Math.abs(payload.total - (computedGross - bookingDeposit)) < 0.1) {
             console.log(`[SyncSale] Fixing buggy mobile payload for sale ${saleId}: Changing total from ${payload.total} to ${computedGross}`);
             payload.total = computedGross;
          }
        }
      }
      // --- END PATCH ---

      // 1. Create the Sale record
      await tx.insert(salesTable).values({
        id: saleId,
        reference_number: referenceNumber,
        offline_receipt_number: payload.offline_receipt_number || null,
        branch_id: branchId,
        customer_id: payload.customer_id,
        trip_id: payload.trip_id,
        pre_order_id: payload.pre_order_id || null,
        created_by: userId,
        sale_type: payload.sale_type,
        payment_mode: payload.payment_mode,
        subtotal: payload.subtotal.toString(),
        promotion_id: payload.promotion_id || null,
        promotion_discount: (payload.promotion_discount ?? 0).toString(),
        manual_discount: (payload.manual_discount ?? 0).toString(),
        downpayment: (payload.downpayment ?? 0).toString(),
        tax_amount: payload.tax_amount?.toString() || "0.00",
        tax_details: payload.tax_details || null,
        total: payload.total.toString(),
        gps_lat: payload.gps_lat ? payload.gps_lat.toString() : null,
        gps_lng: payload.gps_lng ? payload.gps_lng.toString() : null,
        status: "COMPLETED",
        idempotency_key: payload.idempotencyKey || null,
        notes: payload.notes || null,
      });

      // 2. Process items
      for (const item of payload.items) {
        const saleItemId = uuidv7();

        // Fetch Cost of Goods Sold for this item
        let itemUnitCost = "0.00";
        if (item.serial_item_id) {
          const { intakeItemsTable } = await import("../inventory/intake.schema");
          const serialCostRec = await tx.select({ unit_cost: intakeItemsTable.unit_cost })
            .from(serialItemsTable)
            .innerJoin(intakeItemsTable, eq(serialItemsTable.intake_item_id, intakeItemsTable.id))
            .where(eq(serialItemsTable.id, item.serial_item_id));
            
          if (serialCostRec.length > 0 && serialCostRec[0].unit_cost) {
            itemUnitCost = serialCostRec[0].unit_cost.toString();
          }
        } else {
          const avgCostRec = await tx.select({ 
            avg_cost: inventoryBalancesTable.avg_cost, 
            qty: inventoryBalancesTable.quantity 
          })
          .from(inventoryBalancesTable)
          .innerJoin(warehousesTable, eq(inventoryBalancesTable.warehouse_id, warehousesTable.id))
          .where(and(
             eq(inventoryBalancesTable.product_id, item.product_id),
             eq(warehousesTable.branch_id, branchId)
          ));
          
          if (avgCostRec.length > 0) {
            let totalCost = 0;
            let totalQty = 0;
            for (const r of avgCostRec) {
               totalCost += (parseFloat(r.avg_cost as string) * r.qty);
               totalQty += r.qty;
            }
            if (totalQty > 0) {
               itemUnitCost = (totalCost / totalQty).toFixed(2);
            } else if (avgCostRec[0].avg_cost) {
               itemUnitCost = avgCostRec[0].avg_cost as string;
            }
          }
        }

        // Insert Sale Item
        await tx.insert(saleItemsTable).values({
          id: saleItemId,
          sale_id: saleId,
          product_id: item.product_id,
          serial_item_id: item.serial_item_id || null,
          quantity: item.quantity,
          unit_cost: itemUnitCost,
          unit_price: item.unit_price.toString(),
          discount_amount: (item.discount_amount || 0).toString(),
          discount_type: item.discount_type || null,
          line_total: item.line_total.toString(),
        });

        // 3. Deduct Inventory smartly
        if (payload.trip_id) {
          // --- TRIP SALE LOGIC ---
          if (item.serial_item_id) {
            // Serialized on Trip
            const serialRecord = await tx.select({ status: serialItemsTable.status })
              .from(serialItemsTable)
              .where(eq(serialItemsTable.id, item.serial_item_id));

            if (serialRecord.length === 0) {
               throw new Error(`Serialized item ${item.serial_item_id} not found.`);
            }

            const currentStatus = serialRecord[0].status;

            if (currentStatus === "ON_TRIP" || currentStatus === "IN_STOCK") {
              await tx.update(serialItemsTable)
                .set({ status: "SOLD" })
                .where(eq(serialItemsTable.id, item.serial_item_id));

              if (currentStatus === "IN_STOCK") {
                // It wasn't officially on the trip. Create a discrepancy!
                await tx.insert(discrepancyLogsTable).values({
                  id: uuidv7(),
                  trip_id: payload.trip_id,
                  type: "STOCK_EXCESS",
                  description: `Serialized item ${item.serial_item_id} was sold on trip but was marked as IN_STOCK.`,
                  expected_value: "ON_TRIP",
                  actual_value: "IN_STOCK"
                });
              } else {
                // Update trip_stock sold_qty for valid on_trip serials
                const tripStocks = await tx.select().from(tripStockTable)
                  .where(and(eq(tripStockTable.trip_id, payload.trip_id), eq(tripStockTable.serial_item_id, item.serial_item_id)));
                
                if (tripStocks.length > 0) {
                  await tx.update(tripStockTable)
                    .set({ sold_qty: tripStocks[0].sold_qty + 1 })
                    .where(eq(tripStockTable.id, tripStocks[0].id));
                }
              }
            } else if (currentStatus === "SOLD") {
              // The serial is already SOLD. This can happen legitimately when:
              // 1. A previous sync attempt succeeded but the mobile didn't get the ACK
              //    (due to the old 202 bug), so the mobile retried with a new sale id.
              // 2. The trip was closed and reconciled before this sale could sync,
              //    and the serial was already marked SOLD during reconciliation.
              // 
              // Check if this serial is already in a sale_items record from this trip.
              // If yes → this is a safe duplicate, skip the serial update and continue.
              // If no → it's a true conflict (sold on a different trip/context).
              const existingSaleItem = await tx.select({ id: saleItemsTable.id })
                .from(saleItemsTable)
                .innerJoin(salesTable, eq(saleItemsTable.sale_id, salesTable.id))
                .where(
                  and(
                    eq(saleItemsTable.serial_item_id, item.serial_item_id!),
                    eq(salesTable.trip_id, payload.trip_id!),
                    eq(salesTable.status, "COMPLETED")
                  )
                )
                .limit(1);

              if (existingSaleItem.length > 0) {
                // Already recorded — safe to skip. The sale record itself will be
                // caught by the idempotency check or inserted as a duplicate entry.
                console.log(`[SyncSale] Serial ${item.serial_item_id} already SOLD in this trip — treating as duplicate, skipping.`);
              } else {
                // Genuine conflict — serial sold on a different trip or context
                throw new Error(`Serialized item ${item.serial_item_id} is already sold or unavailable (Status: ${currentStatus}).`);
              }
            } else {
              // RETURNED, LOST, DEFECTIVE, UNDER_WARRANTY — genuine conflict
              throw new Error(`Serialized item ${item.serial_item_id} is already sold or unavailable (Status: ${currentStatus}).`);

            }
          } else {
            // Bulk on Trip
            const tripStocks = await tx.select().from(tripStockTable)
              .where(and(
                eq(tripStockTable.trip_id, payload.trip_id), 
                eq(tripStockTable.product_id, item.product_id)
              ));
            
            const stockRecord = tripStocks.find(s => !s.serial_item_id);
            if (!stockRecord) {
              // Not loaded at all!
              await tx.insert(discrepancyLogsTable).values({
                id: uuidv7(),
                trip_id: payload.trip_id,
                type: "STOCK_EXCESS",
                description: `Sold ${item.quantity} units of unassigned bulk product ${item.product_id}`,
                expected_value: "0",
                actual_value: item.quantity.toString()
              });
            } else {
              const available = stockRecord.loaded_qty - stockRecord.returned_qty - stockRecord.sold_qty;
              if (available < item.quantity) {
                // PHANTOM STOCK!
                const excess = item.quantity - available;
                await tx.insert(discrepancyLogsTable).values({
                  id: uuidv7(),
                  trip_id: payload.trip_id,
                  type: "STOCK_EXCESS",
                  description: `Sold ${item.quantity} units but only had ${available} available for product ${item.product_id}`,
                  expected_value: available.toString(),
                  actual_value: item.quantity.toString()
                });
              }

              await tx.update(tripStockTable)
                .set({ sold_qty: stockRecord.sold_qty + item.quantity })
                .where(eq(tripStockTable.id, stockRecord.id));
            }
          }
        } else {
          // --- STOREFRONT (NON-TRIP) SALE LOGIC ---
          if (item.serial_item_id) {
            // Serialized: Find the exact warehouse it is in
            const serialRecord = await tx.select({ warehouse_id: serialItemsTable.warehouse_id })
              .from(serialItemsTable)
              .where(and(eq(serialItemsTable.id, item.serial_item_id), eq(serialItemsTable.status, "IN_STOCK")));

            if (serialRecord.length === 0) {
              throw new Error(`Serialized item ${item.serial_item_id} is not in stock.`);
            }

            const serialWarehouseId = serialRecord[0].warehouse_id;

            // Update serial status
            await tx.update(serialItemsTable)
              .set({ status: "SOLD" })
              .where(eq(serialItemsTable.id, item.serial_item_id));

            // Decrement bulk tracking from that exact warehouse
            if (serialWarehouseId) {
              const balances = await tx.select().from(inventoryBalancesTable)
                .where(and(eq(inventoryBalancesTable.product_id, item.product_id), eq(inventoryBalancesTable.warehouse_id, serialWarehouseId)));
              
              if (balances.length > 0 && balances[0].quantity > 0) {
                await tx.update(inventoryBalancesTable)
                  .set({ quantity: balances[0].quantity - 1 })
                  .where(and(eq(inventoryBalancesTable.product_id, item.product_id), eq(inventoryBalancesTable.warehouse_id, serialWarehouseId)));
              }
            }
          } else {
            // Bulk: Waterfall Deduction across all branch warehouses
            const availableBalances = await tx.select({
                warehouse_id: inventoryBalancesTable.warehouse_id,
                quantity: inventoryBalancesTable.quantity,
                is_default: warehousesTable.is_default
              })
              .from(inventoryBalancesTable)
              .innerJoin(warehousesTable, eq(inventoryBalancesTable.warehouse_id, warehousesTable.id))
              .where(and(
                eq(inventoryBalancesTable.product_id, item.product_id),
                eq(warehousesTable.branch_id, branchId)
              ));

            // Only use warehouses with stock, and sort by default first
            const validBalances = availableBalances.filter(b => b.quantity > 0);
            validBalances.sort((a, b) => (a.is_default === b.is_default) ? 0 : a.is_default ? -1 : 1);

            let qtyToDeduct = item.quantity;
            for (const balance of validBalances) {
              if (qtyToDeduct <= 0) break;

              const deductAmount = Math.min(balance.quantity, qtyToDeduct);
              
              await tx.update(inventoryBalancesTable)
                .set({ quantity: balance.quantity - deductAmount })
                .where(and(
                   eq(inventoryBalancesTable.product_id, item.product_id), 
                   eq(inventoryBalancesTable.warehouse_id, balance.warehouse_id)
                ));

              qtyToDeduct -= deductAmount;
            }

            if (qtyToDeduct > 0) {
              throw new Error(`Insufficient total branch stock for product ${item.product_id}. Missing ${qtyToDeduct} units.`);
            }
          }
        }
      }

      // 4. Installment Logic
      if (payload.sale_type === "INSTALLMENT") {
        if (!payload.scheme_id || !payload.customer_id) {
          throw new Error("Installment sales require scheme_id and customer_id.");
        }

        if (!payload.guarantor_id && !payload.new_guarantor) {
          throw new Error("Installment sales require a guarantor.");
        }

        // Fetch Scheme
        const schemes = await tx.select().from(installmentSchemesTable).where(eq(installmentSchemesTable.id, payload.scheme_id));
        if (schemes.length === 0) throw new Error("Invalid installment scheme.");
        const scheme = schemes[0];

        // Fetch products for downpayment calculation
        const productIds = payload.items.map(i => i.product_id);
        const products = await tx.select({
          id: productsTable.id,
          min_downpayment_amount: productsTable.min_downpayment_amount
        }).from(productsTable).where(inArray(productsTable.id, productIds));

        // Check Downpayment
        const schemePercent = Number(scheme.min_downpayment_percent) / 100;
        let requiredDownpayment = 0;

        for (const item of payload.items) {
          const product = products.find(p => p.id === item.product_id);
          const flatDp = Number(product?.min_downpayment_amount || 0) * item.quantity;
          const schemeDp = item.line_total * schemePercent;
          requiredDownpayment += Math.max(flatDp, schemeDp);
        }

        let recoveryAmount = 0;
        let effectiveDownpaymentForPrincipal = payload.downpayment;

        if (payload.downpayment < requiredDownpayment) {
          if (!payload.partial_downpayment_recovery_date) {
            throw new Error(`Downpayment must be at least Rs. ${requiredDownpayment.toFixed(2)} (${scheme.min_downpayment_percent}%). Provide a recovery date for partial downpayment.`);
          }

          const { SettingsService } = await import("../settings/settings.service");
          const maxDaysStr = await SettingsService.getSetting("downpayment_partial_recovery_days_max") || "14";
          const maxDays = parseInt(maxDaysStr, 10);

          const recoveryDate = new Date(payload.partial_downpayment_recovery_date);
          const maxDate = new Date();
          maxDate.setDate(maxDate.getDate() + maxDays);

          if (recoveryDate > maxDate) {
            throw new Error(`Recovery date cannot exceed ${maxDays} days from today.`);
          }
          if (recoveryDate < new Date(new Date().setHours(0,0,0,0))) {
            throw new Error(`Recovery date cannot be in the past.`);
          }

          recoveryAmount = requiredDownpayment - payload.downpayment;
          effectiveDownpaymentForPrincipal = requiredDownpayment; // Gap is paid via Schedule 0, so remove it from financed principal
        }

        // Resolve Guarantor
        let finalGuarantorId = payload.guarantor_id;
        if (payload.new_guarantor) {
          finalGuarantorId = uuidv7();
          await tx.insert(guarantorsTable).values({
            id: finalGuarantorId,
            full_name: payload.new_guarantor.full_name,
            nic: payload.new_guarantor.nic,
            mobile: payload.new_guarantor.mobile,
            address: payload.new_guarantor.address,
            nic_front_url: payload.new_guarantor.nic_front_url,
            nic_back_url: payload.new_guarantor.nic_back_url,
          });
        }

        // Create Contract
        const contractId = uuidv7();
        const principal = roundMoney(payload.total - effectiveDownpaymentForPrincipal);
        const interestAmount = roundMoney(principal * (Number(scheme.interest_rate) / 100));
        const totalPayable = roundMoney(principal + interestAmount + roundMoney(recoveryAmount));

        let finalSignatureUrl: string | null = null;
        if (payload.signature_image_url) {
          finalSignatureUrl = payload.signature_image_url;
        }
        
        let finalGuarantorSignatureUrl: string | null = null;
        if (payload.guarantor_signature_image_url) {
          finalGuarantorSignatureUrl = payload.guarantor_signature_image_url;
        }
        
        await tx.insert(installmentContractsTable).values({
          id: contractId,
          sale_id: saleId,
          customer_id: payload.customer_id,
          scheme_id: payload.scheme_id,
          guarantor_id: finalGuarantorId!,
          principal: principal.toFixed(2),
          interest_rate: scheme.interest_rate.toString(),
          interest_amount: interestAmount.toFixed(2),
          total_payable: totalPayable.toFixed(2),
          downpayment: payload.downpayment.toFixed(2),
          balance: totalPayable.toFixed(2),
          schedule_frequency: scheme.frequency as any,
          status: "ACTIVE",
          signature_image_url: finalSignatureUrl,
          guarantor_signature_image_url: finalGuarantorSignatureUrl,
        });

        // Generate Schedules
        const roundedRecovery = roundMoney(recoveryAmount);
        if (roundedRecovery > 0 && payload.partial_downpayment_recovery_date) {
          await tx.insert(installmentSchedulesTable).values({
            id: uuidv7(),
            contract_id: contractId,
            installment_number: 0,
            due_date: new Date(payload.partial_downpayment_recovery_date),
            amount_due: roundedRecovery.toFixed(2),
            status: "PENDING"
          });
        }

        const baseInstallmentTotal = roundMoney(principal + interestAmount);
        const perTermAmount = roundMoney(baseInstallmentTotal / scheme.terms);
        const now = new Date();
        
        let allocatedTotal = 0;
        for (let i = 1; i <= scheme.terms; i++) {
          const dueDate = new Date(now);
          if (scheme.frequency === "MONTHLY") {
            dueDate.setMonth(dueDate.getMonth() + i);
          } else if (scheme.frequency === "WEEKLY") {
            dueDate.setDate(dueDate.getDate() + (i * 7));
          } else if (scheme.frequency === "DAILY") {
            dueDate.setDate(dueDate.getDate() + i);
          }

          const thisAmount = (i === scheme.terms)
            ? roundMoney(baseInstallmentTotal - allocatedTotal)
            : perTermAmount;
          
          allocatedTotal = roundMoney(allocatedTotal + thisAmount);

          await tx.insert(installmentSchedulesTable).values({
            id: uuidv7(),
            contract_id: contractId,
            installment_number: i,
            due_date: dueDate,
            amount_due: thisAmount.toFixed(2),
            status: "PENDING"
          });
        }
        
        // SMS Logic
        try {
          const customerRecords = await tx.select().from(customersTable).where(eq(customersTable.id, payload.customer_id)).limit(1);
          if (customerRecords.length > 0) {
            const customer = customerRecords[0];
            
            const productIds = payload.items.map(i => i.product_id);
            const products = await tx.select({ id: productsTable.id, name: productsTable.name }).from(productsTable).where(inArray(productsTable.id, productIds));
            const productNames = payload.items.map(item => {
              const prod = products.find(p => p.id === item.product_id);
              return `${item.quantity}x ${prod?.name || 'Item'}`;
            }).join(", ");

            const branchRecords = await tx.select().from(branchesTable).where(eq(branchesTable.id, branchId)).limit(1);
            const branchAddress = branchRecords[0]?.address || "Our Branch";
            const branchPhoneRecords = await tx.select().from(branchPhonesTable).where(eq(branchPhonesTable.branch_id, branchId));
            const branchPhone = branchPhoneRecords.length > 0 ? branchPhoneRecords.map(p => p.phone_number).join(' | ') : "Support";
            
            const companyName = await SettingsService.getSetting("company_name") || "Our Company";

            const firstTwoSchedules = await tx.select().from(installmentSchedulesTable)
              .where(eq(installmentSchedulesTable.contract_id, contractId))
              .orderBy(asc(installmentSchedulesTable.installment_number))
              .limit(2);

            let upcomingDuesMessage = "";
            if (firstTwoSchedules.length > 0) {
              const s1 = firstTwoSchedules[0];
              const s1Date = new Date(s1.due_date).toLocaleDateString('en-GB');
              const s1Amount = parseFloat(s1.amount_due).toFixed(2);
              
              if (s1.installment_number === 0 && firstTwoSchedules.length > 1) {
                // Downpayment recovery exists
                const s2 = firstTwoSchedules[1];
                const s2Date = new Date(s2.due_date).toLocaleDateString('en-GB');
                const s2Amount = parseFloat(s2.amount_due).toFixed(2);
                upcomingDuesMessage = `Your downpayment recovery of Rs.${s1Amount} is due on ${s1Date}. Your first regular installment of Rs.${s2Amount} is due on ${s2Date}.`;
              } else {
                // No downpayment recovery, just regular schedule
                upcomingDuesMessage = `Your next installment of Rs.${s1Amount} is due on ${s1Date}.`;
              }
            }

            const billTotal = payload.downpayment + totalPayable;
            const remainingBalance = totalPayable;

            NotificationsService.queueSms("SALE_CREATED", customer.id, customer.mobile, {
               company_name: companyName,
               branch_phone: branchPhone,
               branch_address: branchAddress,
               name: customer.full_name,
               product_name: productNames,
               downpayment: payload.downpayment.toFixed(2),
               upcoming_dues_message: upcomingDuesMessage,
               terms: scheme.terms.toString(),
               frequency: scheme.frequency,
               bill_total: billTotal.toFixed(2),
               remaining_balance: remainingBalance.toFixed(2),
            }, saleId);
          }
        } catch (smsError) {
          console.error("Failed to queue SALE_CREATED SMS:", smsError);
        }
      } else if (payload.payment_type === "DIRECT_SALE") {
        try {
          const customerRecords = await tx.select().from(customersTable).where(eq(customersTable.id, payload.customer_id)).limit(1);
          if (customerRecords.length > 0) {
            const customer = customerRecords[0];
            const productIds = payload.items.map(i => i.product_id);
            const products = await tx.select({ id: productsTable.id, name: productsTable.name }).from(productsTable).where(inArray(productsTable.id, productIds));
            const productNames = payload.items.map(item => {
              const prod = products.find(p => p.id === item.product_id);
              return `${item.quantity}x ${prod?.name || 'Item'}`;
            }).join(", ");

            const companyName = await SettingsService.getSetting("company_name") || "Our Company";

            const billTotal = payload.total;
            const remainingBalance = 0;

            const branchRecords = await tx.select().from(branchesTable).where(eq(branchesTable.id, payload.branch_id)).limit(1);
            const branchAddress = branchRecords[0]?.address || "Our Branch";
            const branchPhoneRecords = await tx.select().from(branchPhonesTable).where(eq(branchPhonesTable.branch_id, payload.branch_id));
            const branchPhone = branchPhoneRecords.length > 0 ? branchPhoneRecords.map(p => p.phone_number).join(' | ') : "Support";

            NotificationsService.queueSms("DIRECT_SALE_CREATED", customer.id, customer.mobile, {
               company_name: companyName,
               branch_phone: branchPhone,
               branch_address: branchAddress,
               name: customer.full_name,
               product_name: productNames,
               paid_amount: billTotal.toFixed(2),
               bill_total: billTotal.toFixed(2),
               remaining_balance: remainingBalance.toFixed(2),
            }, saleId);
          }
        } catch (smsError) {
          console.error("Failed to queue DIRECT_SALE_CREATED SMS:", smsError);
        }
      }

      if (payload.pre_order_id) {
        await tx.update(preOrdersTable).set({ status: "FULFILLED" }).where(eq(preOrdersTable.id, payload.pre_order_id));
      }

      return { id: saleId, reference_number: referenceNumber };
    });
  }

  static async voidSale(saleId: string, userId: string, branchId: string) {
    return await db.transaction(async (tx) => {
      // 1. Fetch Sale
      const saleRec = await tx.select().from(salesTable).where(eq(salesTable.id, saleId));
      if (saleRec.length === 0) throw new Error("Sale not found");
      const sale = saleRec[0];

      if (sale.status === "CANCELLED") {
        throw new Error("Sale is already cancelled");
      }

      // 2. Check Trip Boundary Rule
      if (sale.trip_id) {
        const tripRec = await tx.select({ status: tripsTable.status }).from(tripsTable).where(eq(tripsTable.id, sale.trip_id));
        if (tripRec.length > 0) {
          const tStatus = tripRec[0].status;
          if (tStatus !== "CLOSED" && tStatus !== "CLOSED_WITH_DISCREPANCIES" && tStatus !== "CANCELLED") {
            throw new Error(`Cannot void a sale that was made on an active trip (Status: ${tStatus}). Please wait for the driver to end the trip and reconcile before voiding.`);
          }
        }
      }

      // 3. Mark Sale as CANCELLED
      await tx.update(salesTable).set({ status: "CANCELLED" }).where(eq(salesTable.id, saleId));

      // 4. Revert Pre-order if fulfilled
      if (sale.pre_order_id) {
        await tx.update(preOrdersTable).set({ status: "PENDING" }).where(eq(preOrdersTable.id, sale.pre_order_id));
      }

      // 5. Revert Inventory
      const saleItems = await tx.select().from(saleItemsTable).where(eq(saleItemsTable.sale_id, saleId));
      for (const item of saleItems) {
        if (item.serial_item_id) {
          // Serialized: Must return IN_STOCK to the branch's default warehouse
          const defWh = await tx.select({ id: warehousesTable.id }).from(warehousesTable).where(and(eq(warehousesTable.branch_id, branchId), eq(warehousesTable.is_default, true)));
          let targetWhId = defWh.length > 0 ? defWh[0].id : null;

          if (!targetWhId) {
             const anyWh = await tx.select({ id: warehousesTable.id }).from(warehousesTable).where(eq(warehousesTable.branch_id, branchId));
             if (anyWh.length > 0) targetWhId = anyWh[0].id;
          }

          if (targetWhId) {
            await tx.update(serialItemsTable).set({ status: "IN_STOCK", warehouse_id: targetWhId }).where(eq(serialItemsTable.id, item.serial_item_id));
            
            // Increment bulk balance
            const balances = await tx.select().from(inventoryBalancesTable).where(and(eq(inventoryBalancesTable.product_id, item.product_id), eq(inventoryBalancesTable.warehouse_id, targetWhId)));
            if (balances.length > 0) {
              await tx.update(inventoryBalancesTable).set({ quantity: balances[0].quantity + 1 }).where(and(eq(inventoryBalancesTable.product_id, item.product_id), eq(inventoryBalancesTable.warehouse_id, targetWhId)));
            } else {
              await tx.insert(inventoryBalancesTable).values({ product_id: item.product_id, warehouse_id: targetWhId, quantity: 1 });
            }
          }
        } else {
          // Bulk: Return to Default Warehouse
          const defWh = await tx.select({ id: warehousesTable.id }).from(warehousesTable).where(and(eq(warehousesTable.branch_id, branchId), eq(warehousesTable.is_default, true)));
          let targetWhId = defWh.length > 0 ? defWh[0].id : null;

          if (!targetWhId) {
             const anyWh = await tx.select({ id: warehousesTable.id }).from(warehousesTable).where(eq(warehousesTable.branch_id, branchId));
             if (anyWh.length > 0) targetWhId = anyWh[0].id;
          }

          if (targetWhId) {
            const balances = await tx.select().from(inventoryBalancesTable).where(and(eq(inventoryBalancesTable.product_id, item.product_id), eq(inventoryBalancesTable.warehouse_id, targetWhId)));
            if (balances.length > 0) {
              await tx.update(inventoryBalancesTable).set({ quantity: balances[0].quantity + item.quantity }).where(and(eq(inventoryBalancesTable.product_id, item.product_id), eq(inventoryBalancesTable.warehouse_id, targetWhId)));
            } else {
              await tx.insert(inventoryBalancesTable).values({ product_id: item.product_id, warehouse_id: targetWhId, quantity: item.quantity });
            }
          }
        }
      }

      // 6. Installment Reversion
      if (sale.sale_type === "INSTALLMENT") {
        const contracts = await tx.select().from(installmentContractsTable).where(eq(installmentContractsTable.sale_id, saleId));
        if (contracts.length > 0) {
          const contract = contracts[0];
          await tx.update(installmentContractsTable).set({ status: "CANCELLED" }).where(eq(installmentContractsTable.id, contract.id));
          
          await tx.delete(installmentSchedulesTable).where(eq(installmentSchedulesTable.contract_id, contract.id));
          await tx.delete(collectionReceiptsTable).where(eq(collectionReceiptsTable.contract_id, contract.id));
          await tx.delete(collectionAttemptsTable).where(eq(collectionAttemptsTable.contract_id, contract.id));
          await tx.delete(contractAdjustmentsTable).where(eq(contractAdjustmentsTable.contract_id, contract.id));
        }
      }
      
      return { success: true };
    });
  }

  static async getAvailableSerials(productId: string, branchId: string, warehouseId?: string) {
    let condition = and(
      eq(serialItemsTable.product_id, productId),
      eq(serialItemsTable.status, "IN_STOCK")
    );
    
    if (warehouseId) {
      condition = and(condition, eq(serialItemsTable.warehouse_id, warehouseId))!;
    } else {
      condition = and(condition, eq(warehousesTable.branch_id, branchId))!;
    }

    return await db.select({
      id: serialItemsTable.id,
      serial_number: serialItemsTable.serial_number,
      warehouse_id: serialItemsTable.warehouse_id,
      warehouse_name: warehousesTable.name,
      unit_cost: intakeItemsTable.unit_cost,
      fallback_cost: productsTable.last_purchase_price,
    })
    .from(serialItemsTable)
    .innerJoin(warehousesTable, eq(serialItemsTable.warehouse_id, warehousesTable.id))
    .innerJoin(productsTable, eq(serialItemsTable.product_id, productsTable.id))
    .leftJoin(intakeItemsTable, eq(serialItemsTable.intake_item_id, intakeItemsTable.id))
    .where(condition)
    .limit(50); // limit to avoid massive payloads, usually cashier just picks one
  }

  static async updateSaleNotes(saleId: string, notes: string | null) {
    const sale = await db.select().from(salesTable).where(eq(salesTable.id, saleId)).limit(1);
    if (sale.length === 0) throw new Error("Sale not found");

    await db.update(salesTable)
      .set({ notes })
      .where(eq(salesTable.id, saleId));

    return { success: true };
  }
}
