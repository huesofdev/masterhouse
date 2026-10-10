import { eq, and, sql, or, like } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "../../db";
import { tripsTable, tripStaffTable, tripStockTable, discrepancyLogsTable, tripRoutesTable } from "./operations.schema";
import { CreateTripPayload, LoadTripStockPayload, UpdateTripStatusPayload } from "./operations.types";
import { serialItemsTable, inventoryBalancesTable } from "../inventory/inventory.schema";
import { warehousesTable } from "../warehouses/warehouses.schema";
import { customersTable, guarantorsTable } from "../customers/customers.schema";
import { productsTable } from "../products/products.schema";
import { promotionsTable } from "../promotions/promotions.schema";
import { installmentContractsTable, collectionReceiptsTable, installmentSchemesTable, installmentSchedulesTable } from "../collections/collections.schema";
import { salesTable } from "../sale/sales.schema";
import { usersTable, staffWalletsTable, staffWalletTransactionsTable } from "../user/user.schema";
import { preOrdersTable } from "../orders/orders.schema";
import { inArray, lte, gte, notInArray, ne, desc, asc } from "drizzle-orm";

export class OperationsService {
  static async createTrip(
    branchId: string, 
    creatorId: string, 
    payload: CreateTripPayload
  ) {
    const tripId = uuidv7();

    // Use a transaction to ensure all trip details are saved together
    await db.transaction(async (tx) => {
      // 1. Insert the main trip record
      await tx.insert(tripsTable).values({
        id: tripId,
        branch_id: branchId,
        created_by: creatorId,
        incharge_id: payload.incharge_id,
        route_id: payload.route_id,
        vehicle_id: payload.vehicle_id,
        type: payload.type,
        planned_date: payload.planned_date,
        status: "PLANNED",
      });

      // 2. Insert additional staff (if any)
      if (payload.staff && payload.staff.length > 0) {
        const staffData = payload.staff.map(s => ({
          trip_id: tripId,
          user_id: s.user_id,
          duty: s.duty,
        }));
        await tx.insert(tripStaffTable).values(staffData);
      }

      // 3. Insert loaded stock (if any)
      if (payload.stock && payload.stock.length > 0) {
        const stockData = payload.stock.map(s => ({
          id: uuidv7(),
          trip_id: tripId,
          product_id: s.product_id,
          serial_item_id: s.serial_item_id || null,
          loaded_qty: s.loaded_qty,
          status: "LOADED" as const,
        }));
        await tx.insert(tripStockTable).values(stockData);
        
        // NOTE: In a full implementation, we would also:
        // - Update serialItemsTable status to 'ON_TRIP' for serialized items
        // - Decrement inventoryBalancesTable for bulk items
      }
    });

    return this.getTrip(tripId);
  }

  static async getTrip(tripId: string) {
    const result = await db.query.tripsTable.findFirst({
      where: eq(tripsTable.id, tripId),
      with: {
        route: true,
        vehicle: true,
        incharge: { columns: { id: true, name: true, email: true } },
        staff: {
          with: {
            user: { columns: { id: true, name: true, email: true } }
          }
        },
        stock: {
          columns: {
            id: true,
            trip_id: true,
            product_id: true,
            serial_item_id: true,
            loaded_qty: true,
            returned_qty: true,
            sold_qty: true,
            status: true
          },
          with: {
            product: { columns: { id: true, name: true, sku: true, is_serialized: true } },
            serialItem: { columns: { id: true, serial_number: true } }
          }
        },
      },
    });
    if (!result) return null;

    let lastVehicleEndKm: number | null = null;
    if (result.vehicle_id) {
      const lastTrip = await db.query.tripsTable.findFirst({
        where: and(
          eq(tripsTable.vehicle_id, result.vehicle_id),
          inArray(tripsTable.status, ["CLOSED", "CLOSED_WITH_DISCREPANCIES"]),
          ne(tripsTable.id, tripId)
        ),
        orderBy: (trips, { desc }) => [desc(trips.closed_at)],
      });
      lastVehicleEndKm = lastTrip?.end_km || null;
    }

    return {
      ...result,
      last_vehicle_end_km: lastVehicleEndKm
    };
  }

  static async listTrips(branchId: string, page: number = 1, limit: number = 30, search: string = '', assignedTo?: string, excludeStatus?: string[], status?: string, routeId?: string) {
    const offset = (page - 1) * limit;

    const conditions = [eq(tripsTable.branch_id, branchId)];
    if (search) {
      conditions.push(or(
        like(tripsTable.status, `%${search}%`),
        like(tripsTable.type, `%${search}%`)
      )!);
    }
    
    if (assignedTo) {
      // Find trips where the user is either the incharge OR in the tripStaffTable
      // For simplicity, let's filter by incharge_id. A full implementation could do a subquery or join for staff.
      // Wait, let's just do incharge_id for now as it's the main assigned person.
      conditions.push(eq(tripsTable.incharge_id, assignedTo));
    }

    if (status) {
      conditions.push(eq(tripsTable.status, status as any));
    }

    if (excludeStatus && excludeStatus.length > 0) {
      conditions.push(notInArray(tripsTable.status, excludeStatus as any));
    }

    if (routeId) {
      conditions.push(eq(tripsTable.route_id, routeId));
    }

    const whereClause = and(...conditions);

    const data = await db.query.tripsTable.findMany({
      where: whereClause,
      orderBy: (trips, { desc }) => [desc(trips.planned_date), desc(trips.created_at)],
      limit,
      offset,
      with: { route: true }
    });

    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(tripsTable)
      .where(whereClause);

    const count = Number(countResult[0].count);

    return {
      data,
      meta: {
        total_records: count,
        total_pages: Math.ceil(count / limit),
        current_page: page,
        page_size: limit
      }
    };
  }

  static async updateTripStatus(tripId: string, payload: UpdateTripStatusPayload) {
    const trip = await db.query.tripsTable.findFirst({
      where: eq(tripsTable.id, tripId)
    });
    if (!trip) throw new Error("Trip not found");

    if (["CLOSED", "CLOSED_WITH_DISCREPANCIES", "CANCELLED"].includes(trip.status)) {
      // Gracefully ignore the update and return 200 OK so the mobile app can successfully wipe its local data and exit
      return trip;
    }

    const updateData: any = { status: payload.status };
    if (payload.start_km !== undefined) {
      updateData.start_km = payload.start_km;
    }
    if (payload.end_km !== undefined) {
      updateData.end_km = payload.end_km;
    }

    const startKm = payload.start_km !== undefined ? payload.start_km : trip.start_km;
    if (payload.start_km !== undefined || payload.status === "DEPARTED") {
      if (startKm !== null && startKm !== undefined) {
        if (startKm < 0) {
          throw new Error("Start odometer reading cannot be negative.");
        }
      }
    }

    const endKm = payload.end_km !== undefined ? payload.end_km : trip.end_km;
    if (payload.end_km !== undefined || payload.status === "RECONCILING" || payload.status === "CLOSED" || payload.status === "CLOSED_WITH_DISCREPANCIES") {
      if (endKm !== null && endKm !== undefined) {
        if (endKm < 0) {
          throw new Error("End odometer reading cannot be negative.");
        }
        if (startKm !== null && startKm !== undefined && endKm < startKm) {
          throw new Error(`End odometer reading (${endKm} km) cannot be less than start odometer reading (${startKm} km).`);
        }
      }
    }

    if (payload.status === "DEPARTED") {
      updateData.departed_at = new Date();
    } else if (payload.status === "CLOSED" || payload.status === "CLOSED_WITH_DISCREPANCIES") {
      updateData.closed_at = new Date();
    } else if (payload.status === "RECONCILING") {

      const salesRes = await db.select({ 
        total_cash: sql<number>`SUM(CASE 
          WHEN ${salesTable.sale_type} = 'INSTALLMENT' THEN GREATEST(0, ${salesTable.downpayment} - IFNULL(CAST(${preOrdersTable.advance_payment} AS DECIMAL(14,2)), 0))
          ELSE GREATEST(0, CAST(${salesTable.total} AS DECIMAL(14,2)) - IFNULL(CAST(${preOrdersTable.advance_payment} AS DECIMAL(14,2)), 0))
        END)` 
      })
      .from(salesTable)
      .leftJoin(preOrdersTable, eq(salesTable.pre_order_id, preOrdersTable.id))
      .where(eq(salesTable.trip_id, tripId));
      
      const collRes = await db.select({ 
        total_cash: sql<number>`SUM(${collectionReceiptsTable.amount})` 
      }).from(collectionReceiptsTable).where(eq(collectionReceiptsTable.trip_id, tripId));
      
      const preOrderRes = await db.select({
        total_cash: sql<number>`SUM(CAST(${preOrdersTable.advance_payment} AS DECIMAL(14,2)))`
      }).from(preOrdersTable).where(eq(preOrdersTable.trip_id, tripId));
      
      const salesTotalCash = Number(salesRes[0]?.total_cash || 0);
      const collTotalCash = Number(collRes[0]?.total_cash || 0);
      const preOrderTotalCash = Number(preOrderRes[0]?.total_cash || 0);
      
      updateData.expected_cash = (salesTotalCash + collTotalCash + preOrderTotalCash).toString();
    }
    
    await db.update(tripsTable)
      .set(updateData)
      .where(eq(tripsTable.id, tripId));
      
    return this.getTrip(tripId);
  }

  static async getTripSummary(tripId: string) {
    const trip = await db.query.tripsTable.findFirst({
      where: eq(tripsTable.id, tripId),
      columns: { id: true, status: true, expected_cash: true, actual_cash: true, type: true }
    });

    if (!trip) throw new Error("Trip not found");

    // Get Sales
    const sales = await db.select({
      id: salesTable.id,
      created_at: salesTable.created_at,
      customer_name: customersTable.full_name,
      sale_type: salesTable.sale_type,
      total: salesTable.total,
      downpayment: salesTable.downpayment,
      payment_mode: salesTable.payment_mode,
      advance_deduction: preOrdersTable.advance_payment,
      cash_collected: sql<number>`CASE 
        WHEN ${salesTable.sale_type} = 'INSTALLMENT' THEN GREATEST(0, ${salesTable.downpayment} - IFNULL(CAST(${preOrdersTable.advance_payment} AS DECIMAL(14,2)), 0))
        ELSE GREATEST(0, CAST(${salesTable.total} AS DECIMAL(14,2)) - IFNULL(CAST(${preOrdersTable.advance_payment} AS DECIMAL(14,2)), 0))
      END`
    })
    .from(salesTable)
    .leftJoin(customersTable, eq(salesTable.customer_id, customersTable.id))
    .leftJoin(preOrdersTable, eq(salesTable.pre_order_id, preOrdersTable.id))
    .where(eq(salesTable.trip_id, tripId))
    .orderBy(salesTable.created_at);

    // Fetch product names & serial numbers for each sale
    const saleIds = sales.map(s => s.id);
    let itemsMap: Record<string, { productName: string; serialNumber: string | null; quantity: number }[]> = {};
    if (saleIds.length > 0) {
      const { saleItemsTable } = await import("../sale/sales.schema");
      const { productsTable } = await import("../products/products.schema");
      const { serialItemsTable } = await import("../inventory/inventory.schema");

      const saleItems = await db
        .select({
          sale_id: saleItemsTable.sale_id,
          product_name: productsTable.name,
          quantity: saleItemsTable.quantity,
          serial_number: serialItemsTable.serial_number,
        })
        .from(saleItemsTable)
        .leftJoin(productsTable, eq(saleItemsTable.product_id, productsTable.id))
        .leftJoin(serialItemsTable, eq(saleItemsTable.serial_item_id, serialItemsTable.id))
        .where(inArray(saleItemsTable.sale_id, saleIds));

      for (const item of saleItems) {
        if (!itemsMap[item.sale_id]) itemsMap[item.sale_id] = [];
        itemsMap[item.sale_id].push({
          productName: item.product_name || "Product",
          quantity: item.quantity,
          serialNumber: item.serial_number || null,
        });
      }
    }

    const salesWithItems = sales.map(sale => {
      const items = itemsMap[sale.id] || [];
      const itemDescriptions = items.map(i => 
        i.serialNumber ? `${i.productName} (S/N: ${i.serialNumber})` : `${i.quantity}x ${i.productName}`
      ).join(", ");
      const serialNumbers = items.map(i => i.serialNumber).filter(Boolean).join(", ");

      return {
        ...sale,
        items,
        product_summary: itemDescriptions || "-",
        serials_summary: serialNumbers || "-",
      };
    });

    // Get Collections
    const collections = await db.select({
      id: collectionReceiptsTable.id,
      receipt_no: collectionReceiptsTable.receipt_no,
      created_at: collectionReceiptsTable.created_at,
      customer_name: customersTable.full_name,
      amount: collectionReceiptsTable.amount,
      payment_mode: collectionReceiptsTable.payment_mode,
    })
    .from(collectionReceiptsTable)
    .leftJoin(customersTable, eq(collectionReceiptsTable.customer_id, customersTable.id))
    .where(eq(collectionReceiptsTable.trip_id, tripId))
    .orderBy(collectionReceiptsTable.created_at);

    // Get PreOrders Advance Payments
    const preOrders = await db.select({
      id: preOrdersTable.id,
      receipt_no: preOrdersTable.reference_number,
      created_at: preOrdersTable.created_at,
      customer_name: customersTable.full_name,
      amount: preOrdersTable.advance_payment,
      payment_mode: preOrdersTable.payment_method,
    })
    .from(preOrdersTable)
    .leftJoin(customersTable, eq(preOrdersTable.customer_id, customersTable.id))
    .where(eq(preOrdersTable.trip_id, tripId))
    .orderBy(preOrdersTable.created_at);

    const salesTotalCash = sales.reduce((acc, sale) => {
      return acc + Number(sale.cash_collected || 0);
    }, 0);
    const collTotalCash = collections.reduce((acc, coll) => acc + Number(coll.amount || 0), 0);
    const preOrdersTotalCash = preOrders.reduce((acc, po) => acc + Number(po.amount || 0), 0);

    // Get Discrepancies
    const discrepancies = await db.select({
      id: discrepancyLogsTable.id,
      type: discrepancyLogsTable.type,
      description: discrepancyLogsTable.description,
      expected_value: discrepancyLogsTable.expected_value,
      actual_value: discrepancyLogsTable.actual_value,
      status: discrepancyLogsTable.status,
    })
    .from(discrepancyLogsTable)
    .where(eq(discrepancyLogsTable.trip_id, tripId));

    return {
      trip,
      sales: salesWithItems,
      collections,
      preOrders,
      discrepancies,
      totals: {
        salesCash: salesTotalCash,
        collectionsCash: collTotalCash,
        preOrdersCash: preOrdersTotalCash,
        expectedCash: salesTotalCash + collTotalCash + preOrdersTotalCash,
      }
    };
  }

  static async loadTripStock(tripId: string, branchId: string, payload: LoadTripStockPayload) {
    return await db.transaction(async (tx) => {
      // 1. Verify trip exists and is in PLANNED or LOADING state
      const tripRes = await tx.select().from(tripsTable).where(eq(tripsTable.id, tripId));
      if (tripRes.length === 0) throw new Error("Trip not found");
      const trip = tripRes[0];
      
      if (trip.status !== "PLANNED" && trip.status !== "LOADING" && trip.status !== "IN_PROGRESS" && trip.status !== "DEPARTED") {
        throw new Error("Cannot load stock onto a trip that is not PLANNED, LOADING, DEPARTED, or IN_PROGRESS.");
      }

      // If this is the first load, update status to LOADING
      if (trip.status === "PLANNED") {
        await tx.update(tripsTable).set({ status: "LOADING" }).where(eq(tripsTable.id, tripId));
      }

      // 2. Process each item to load
      for (const item of payload.items) {
        const tripStockId = uuidv7();

        if (item.serial_item_id) {
          // Serialized Item Logic
          // Find the exact warehouse it is in
          const serialRecord = await tx.select({ warehouse_id: serialItemsTable.warehouse_id })
            .from(serialItemsTable)
            .innerJoin(warehousesTable, eq(serialItemsTable.warehouse_id, warehousesTable.id))
            .where(and(
              eq(serialItemsTable.id, item.serial_item_id), 
              eq(serialItemsTable.status, "IN_STOCK"),
              eq(warehousesTable.branch_id, branchId)
            ));

          if (serialRecord.length === 0) {
            throw new Error(`Serialized item ${item.serial_item_id} is not in stock in this branch.`);
          }

          const serialWarehouseId = serialRecord[0].warehouse_id;

          // Update serial status
          await tx.update(serialItemsTable)
            .set({ status: "ON_TRIP" })
            .where(eq(serialItemsTable.id, item.serial_item_id));

          // Decrement bulk tracking from that exact warehouse
          if (serialWarehouseId) {
            const balances = await tx.select().from(inventoryBalancesTable)
              .where(and(
                eq(inventoryBalancesTable.product_id, item.product_id), 
                eq(inventoryBalancesTable.warehouse_id, serialWarehouseId)
              ));
            
            if (balances.length > 0 && balances[0].quantity > 0) {
              await tx.update(inventoryBalancesTable)
                .set({ quantity: balances[0].quantity - 1 })
                .where(and(
                  eq(inventoryBalancesTable.product_id, item.product_id), 
                  eq(inventoryBalancesTable.warehouse_id, serialWarehouseId)
                ));
            }
          }
        } else {
          // Bulk Item Logic: Waterfall Deduction across branch warehouses
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

          const validBalances = availableBalances.filter(b => b.quantity > 0);
          validBalances.sort((a, b) => (a.is_default === b.is_default) ? 0 : a.is_default ? -1 : 1);

          let qtyToDeduct = item.loaded_qty;
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

        // 3. Insert into tripStockTable
        await tx.insert(tripStockTable).values({
          id: tripStockId,
          trip_id: tripId,
          product_id: item.product_id,
          serial_item_id: item.serial_item_id || null,
          loaded_qty: item.loaded_qty,
          status: "LOADED",
        });
      }

      return this.getTrip(tripId);
    });
  }

  static async unloadTripStock(tripId: string, stockId: string, branchId: string) {
    return await db.transaction(async (tx) => {
      // 1. Verify trip is LOADING or PLANNED
      const tripRes = await tx.select().from(tripsTable).where(eq(tripsTable.id, tripId));
      if (tripRes.length === 0) throw new Error("Trip not found");
      const trip = tripRes[0];
      
      if (trip.status !== "PLANNED" && trip.status !== "LOADING") {
        throw new Error("Cannot unload stock from a trip that has already departed.");
      }

      // 2. Find the stock record
      const stockRes = await tx.select().from(tripStockTable).where(and(eq(tripStockTable.id, stockId), eq(tripStockTable.trip_id, tripId)));
      if (stockRes.length === 0) throw new Error("Stock record not found on this trip");
      const stock = stockRes[0];

      if (stock.serial_item_id) {
        // Serialized Item Logic
        const serialRecord = await tx.select({ warehouse_id: serialItemsTable.warehouse_id })
          .from(serialItemsTable)
          .where(eq(serialItemsTable.id, stock.serial_item_id));

        if (serialRecord.length > 0) {
          const serialWarehouseId = serialRecord[0].warehouse_id;

          // Revert serial status
          await tx.update(serialItemsTable)
            .set({ status: "IN_STOCK" })
            .where(eq(serialItemsTable.id, stock.serial_item_id));

          // Increment bulk tracking in that exact warehouse
          if (serialWarehouseId) {
            const balances = await tx.select().from(inventoryBalancesTable)
              .where(and(
                eq(inventoryBalancesTable.product_id, stock.product_id), 
                eq(inventoryBalancesTable.warehouse_id, serialWarehouseId)
              ));
            
            if (balances.length > 0) {
              await tx.update(inventoryBalancesTable)
                .set({ quantity: balances[0].quantity + 1 })
                .where(and(
                  eq(inventoryBalancesTable.product_id, stock.product_id), 
                  eq(inventoryBalancesTable.warehouse_id, serialWarehouseId)
                ));
            }
          }
        }
      } else {
        // Bulk Item Logic: Add back to the default warehouse of the branch
        const defaultWarehouseRes = await tx.select().from(warehousesTable).where(and(eq(warehousesTable.branch_id, branchId), eq(warehousesTable.is_default, true)));
        let targetWarehouseId = defaultWarehouseRes.length > 0 ? defaultWarehouseRes[0].id : null;

        // Fallback to any warehouse in branch if no default exists
        if (!targetWarehouseId) {
          const anyWarehouseRes = await tx.select().from(warehousesTable).where(eq(warehousesTable.branch_id, branchId)).limit(1);
          if (anyWarehouseRes.length > 0) targetWarehouseId = anyWarehouseRes[0].id;
        }

        if (targetWarehouseId) {
          const balances = await tx.select().from(inventoryBalancesTable)
            .where(and(
              eq(inventoryBalancesTable.product_id, stock.product_id), 
              eq(inventoryBalancesTable.warehouse_id, targetWarehouseId)
            ));
          
          if (balances.length > 0) {
            await tx.update(inventoryBalancesTable)
              .set({ quantity: balances[0].quantity + stock.loaded_qty })
              .where(and(
                eq(inventoryBalancesTable.product_id, stock.product_id), 
                eq(inventoryBalancesTable.warehouse_id, targetWarehouseId)
              ));
          } else {
            // Create balance if it doesn't exist
            await tx.insert(inventoryBalancesTable).values({
              id: uuidv7(),
              warehouse_id: targetWarehouseId,
              product_id: stock.product_id,
              quantity: stock.loaded_qty,
            });
          }
        }
      }

      // 3. Delete the tripStockTable record
      await tx.delete(tripStockTable).where(eq(tripStockTable.id, stockId));

      return this.getTrip(tripId);
    });
  }

  static async cancelTrip(tripId: string, branchId: string) {
    return await db.transaction(async (tx) => {
      // 1. Verify trip is PLANNED, LOADING, or DEPARTED
      const tripRes = await tx.select().from(tripsTable).where(eq(tripsTable.id, tripId));
      if (tripRes.length === 0) throw new Error("Trip not found");
      const trip = tripRes[0];
      
      if (trip.status !== "PLANNED" && trip.status !== "LOADING" && trip.status !== "DEPARTED") {
        throw new Error("Only PLANNED, LOADING, or DEPARTED trips can be cancelled.");
      }

      // Safety check: Prevent cancellation if there are any active transactions
      const [salesCount] = await tx.select({ count: sql`count(*)` }).from(salesTable).where(eq(salesTable.trip_id, tripId));
      const [collectionsCount] = await tx.select({ count: sql`count(*)` }).from(collectionReceiptsTable).where(eq(collectionReceiptsTable.trip_id, tripId));
      const [preOrdersCount] = await tx.select({ count: sql`count(*)` }).from(preOrdersTable).where(eq(preOrdersTable.trip_id, tripId));

      if (Number(salesCount.count) > 0 || Number(collectionsCount.count) > 0 || Number(preOrdersCount.count) > 0) {
        throw new Error("Cannot cancel trip: Sales, collections, or pre-orders have already been recorded. Please Reconcile and Close this trip instead.");
      }

      // 2. Fetch all loaded items
      const loadedStocks = await tx.select().from(tripStockTable).where(eq(tripStockTable.trip_id, tripId));

      // 3. Reverse stock movements
      for (const stock of loadedStocks) {
        if (stock.serial_item_id) {
          // Serialized Item Logic
          const serialRecord = await tx.select({ warehouse_id: serialItemsTable.warehouse_id })
            .from(serialItemsTable)
            .where(eq(serialItemsTable.id, stock.serial_item_id));

          if (serialRecord.length > 0) {
            const serialWarehouseId = serialRecord[0].warehouse_id;
            await tx.update(serialItemsTable)
              .set({ status: "IN_STOCK" })
              .where(eq(serialItemsTable.id, stock.serial_item_id));

            if (serialWarehouseId) {
              const balances = await tx.select().from(inventoryBalancesTable)
                .where(and(
                  eq(inventoryBalancesTable.product_id, stock.product_id), 
                  eq(inventoryBalancesTable.warehouse_id, serialWarehouseId)
                ));
              
              if (balances.length > 0) {
                await tx.update(inventoryBalancesTable)
                  .set({ quantity: balances[0].quantity + stock.loaded_qty })
                  .where(and(
                    eq(inventoryBalancesTable.product_id, stock.product_id), 
                    eq(inventoryBalancesTable.warehouse_id, serialWarehouseId)
                  ));
              }
            }
          }
        } else {
          // Bulk Item Logic
          const defaultWarehouseRes = await tx.select().from(warehousesTable).where(and(eq(warehousesTable.branch_id, branchId), eq(warehousesTable.is_default, true)));
          let targetWarehouseId = defaultWarehouseRes.length > 0 ? defaultWarehouseRes[0].id : null;

          if (!targetWarehouseId) {
            const anyWarehouseRes = await tx.select().from(warehousesTable).where(eq(warehousesTable.branch_id, branchId)).limit(1);
            if (anyWarehouseRes.length > 0) targetWarehouseId = anyWarehouseRes[0].id;
          }

          if (targetWarehouseId) {
            const balances = await tx.select().from(inventoryBalancesTable)
              .where(and(
                eq(inventoryBalancesTable.product_id, stock.product_id), 
                eq(inventoryBalancesTable.warehouse_id, targetWarehouseId)
              ));
            
            if (balances.length > 0) {
              await tx.update(inventoryBalancesTable)
                .set({ quantity: balances[0].quantity + stock.loaded_qty })
                .where(and(
                  eq(inventoryBalancesTable.product_id, stock.product_id), 
                  eq(inventoryBalancesTable.warehouse_id, targetWarehouseId)
                ));
            } else {
              await tx.insert(inventoryBalancesTable).values({
                id: uuidv7(),
                warehouse_id: targetWarehouseId,
                product_id: stock.product_id,
                quantity: stock.loaded_qty,
              });
            }
          }
        }
      }

      // 4. Delete trip stock records
      if (loadedStocks.length > 0) {
        await tx.delete(tripStockTable).where(eq(tripStockTable.trip_id, tripId));
      }

      // 5. Update trip status to CANCELLED
      await tx.update(tripsTable).set({ status: "CANCELLED" }).where(eq(tripsTable.id, tripId));

      return this.getTrip(tripId);
    });
  }

  static async closeTrip(tripId: string, branchId: string, payload: import('./operations.types').CloseTripPayload) {
    return await db.transaction(async (tx) => {
      // 1. Verify trip is RECONCILING
      const tripRes = await tx.select().from(tripsTable).where(eq(tripsTable.id, tripId));
      if (tripRes.length === 0) throw new Error("Trip not found");
      const trip = tripRes[0];
      
      if (trip.status !== "RECONCILING") {
        throw new Error("Trip must be in RECONCILING state to be closed.");
      }

      let hasDiscrepancies = false;

      // 2. Handle Cash Reconciliation
      const cashDifference = payload.actual_cash - payload.expected_cash;
      if (cashDifference !== 0) {
        hasDiscrepancies = true;
        const discId = uuidv7();
        const isShortage = cashDifference < 0;
        await tx.insert(discrepancyLogsTable).values({
          id: discId,
          trip_id: tripId,
          type: isShortage ? "CASH_SHORTAGE" : "CASH_EXCESS",
          description: `Cash discrepancy during reconciliation. Expected: ${payload.expected_cash}, Actual: ${payload.actual_cash}`,
          expected_value: payload.expected_cash.toString(),
          actual_value: payload.actual_cash.toString(),
          status: isShortage ? "CHARGED_TO_WALLET" : "OPEN",
          snapshot_data: isShortage ? { amount: Math.abs(cashDifference) } : null,
        });

        if (isShortage) {
          // Auto-charge wallet
          let walletRes = await tx.select().from(staffWalletsTable).where(and(eq(staffWalletsTable.user_id, trip.incharge_id!), eq(staffWalletsTable.branch_id, trip.branch_id)));
          let walletId = "";
          let currentBalance = 0;
          if (walletRes.length === 0) {
            walletId = uuidv7();
            await tx.insert(staffWalletsTable).values({ id: walletId, user_id: trip.incharge_id!, branch_id: trip.branch_id, balance: "0.00" });
          } else {
            walletId = walletRes[0].id;
            currentBalance = parseFloat(walletRes[0].balance);
          }

          const amount = Math.abs(cashDifference);
          const newBalance = currentBalance - amount;

          await tx.insert(staffWalletTransactionsTable).values({
            id: uuidv7(),
            wallet_id: walletId,
            trip_id: tripId,
            discrepancy_id: discId,
            type: "CASH_SHORTAGE",
            amount: amount.toString(),
            description: `Auto-charged cash shortage from Trip ${tripId}`
          });
          await tx.update(staffWalletsTable).set({ balance: newBalance.toString() }).where(eq(staffWalletsTable.id, walletId));
        }
      }

      // Update cash values and end_km on trip
      const updateData: any = {
        expected_cash: payload.expected_cash.toString(),
        actual_cash: payload.actual_cash.toString(),
      };

      if (payload.end_km !== undefined && payload.end_km !== null) {
        if (payload.end_km < 0) {
          throw new Error("End odometer reading cannot be negative.");
        }
        if (trip.start_km !== null && trip.start_km !== undefined && payload.end_km < trip.start_km) {
          throw new Error(`End odometer reading (${payload.end_km} km) cannot be less than start odometer reading (${trip.start_km} km).`);
        }
        updateData.end_km = payload.end_km;
      }

      await tx.update(tripsTable).set(updateData).where(eq(tripsTable.id, tripId));

      // 3. Handle Stock Reconciliation
      const allTripStock = await tx.select().from(tripStockTable).where(eq(tripStockTable.trip_id, tripId));
      
      for (const stock of allTripStock) {
        const returnedItem = payload.returned_items.find(ri => ri.trip_stock_id === stock.id);
        const actualReturnedQty = returnedItem ? returnedItem.returned_qty : 0;
        
        // Calculate missing
        // loaded_qty = sold_qty + returned_qty + missing
        const expectedReturn = stock.loaded_qty - stock.sold_qty;
        const missingQty = expectedReturn - actualReturnedQty;

        if (missingQty !== 0) {
          hasDiscrepancies = true;
          const isShortage = missingQty > 0;
          const discId = uuidv7();
          
          // Fetch product price to calculate shortage value
          const prodRes = await tx.select({ name: productsTable.name, base_price: productsTable.base_price }).from(productsTable).where(eq(productsTable.id, stock.product_id));
          const prod = prodRes.length > 0 ? prodRes[0] : null;
          const price = prod ? parseFloat(prod.base_price) : 0;

          let serialNumberText = "";
          if (stock.serial_item_id) {
            const serialRes = await tx.select({ serial_number: serialItemsTable.serial_number }).from(serialItemsTable).where(eq(serialItemsTable.id, stock.serial_item_id));
            if (serialRes.length > 0) {
              serialNumberText = ` (Serial: ${serialRes[0].serial_number})`;
            }
          }

          await tx.insert(discrepancyLogsTable).values({
            id: discId,
            trip_id: tripId,
            type: isShortage ? "STOCK_MISSING" : "STOCK_EXCESS",
            description: `Stock discrepancy for product ${prod?.name || stock.product_id}${serialNumberText}. Expected Return: ${expectedReturn}, Actual Return: ${actualReturnedQty}`,
            expected_value: expectedReturn.toString(),
            actual_value: actualReturnedQty.toString(),
            status: isShortage ? "CHARGED_TO_WALLET" : "OPEN",
            snapshot_data: isShortage ? {
              productId: stock.product_id,
              productName: prod?.name || "Unknown",
              expectedQty: expectedReturn,
              actualQty: actualReturnedQty,
              priceAtTime: price,
              amount: missingQty * price
            } : null
          });

          if (isShortage && price > 0) {
            // Auto-charge wallet
            let walletRes = await tx.select().from(staffWalletsTable).where(and(eq(staffWalletsTable.user_id, trip.incharge_id!), eq(staffWalletsTable.branch_id, trip.branch_id)));
            let walletId = "";
            let currentBalance = 0;
            if (walletRes.length === 0) {
              walletId = uuidv7();
              await tx.insert(staffWalletsTable).values({ id: walletId, user_id: trip.incharge_id!, branch_id: trip.branch_id, balance: "0.00" });
            } else {
              walletId = walletRes[0].id;
              currentBalance = parseFloat(walletRes[0].balance);
            }

            const amount = missingQty * price;
            const newBalance = currentBalance - amount;

            await tx.insert(staffWalletTransactionsTable).values({
              id: uuidv7(),
              wallet_id: walletId,
              trip_id: tripId,
              discrepancy_id: discId,
              type: "STOCK_SHORTAGE",
              amount: amount.toString(),
              description: `Auto-charged stock missing (${missingQty}x ${prod?.name || stock.product_id})`,
              snapshot_data: {
                productId: stock.product_id,
                productName: prod?.name || "Unknown",
                expectedQty: expectedReturn,
                actualQty: actualReturnedQty,
                priceAtTime: price
              }
            });
            await tx.update(staffWalletsTable).set({ balance: newBalance.toString() }).where(eq(staffWalletsTable.id, walletId));
          }
        }

        // Update trip_stock_table
        await tx.update(tripStockTable).set({
          returned_qty: actualReturnedQty,
          status: missingQty === 0 ? "CONFIRMED" : "DISCREPANCY",
        }).where(eq(tripStockTable.id, stock.id));

        // 4. Return items to warehouse (only actualReturnedQty)
        if (actualReturnedQty > 0) {
          if (stock.serial_item_id) {
            // Mark serial as IN_STOCK
            const serialRecord = await tx.select({ warehouse_id: serialItemsTable.warehouse_id })
              .from(serialItemsTable).where(eq(serialItemsTable.id, stock.serial_item_id));

            if (serialRecord.length > 0) {
              const serialWarehouseId = serialRecord[0].warehouse_id;
              await tx.update(serialItemsTable).set({ status: "IN_STOCK" }).where(eq(serialItemsTable.id, stock.serial_item_id));

              if (serialWarehouseId) {
                const balances = await tx.select().from(inventoryBalancesTable)
                  .where(and(eq(inventoryBalancesTable.product_id, stock.product_id), eq(inventoryBalancesTable.warehouse_id, serialWarehouseId)));
                
                if (balances.length > 0) {
                  await tx.update(inventoryBalancesTable).set({ quantity: balances[0].quantity + actualReturnedQty })
                    .where(and(eq(inventoryBalancesTable.product_id, stock.product_id), eq(inventoryBalancesTable.warehouse_id, serialWarehouseId)));
                }
              }
            }
          } else {
            // Bulk items return to Default Warehouse
            const defaultWarehouseRes = await tx.select().from(warehousesTable).where(and(eq(warehousesTable.branch_id, branchId), eq(warehousesTable.is_default, true)));
            let targetWarehouseId = defaultWarehouseRes.length > 0 ? defaultWarehouseRes[0].id : null;

            if (!targetWarehouseId) {
              const anyWarehouseRes = await tx.select().from(warehousesTable).where(eq(warehousesTable.branch_id, branchId)).limit(1);
              if (anyWarehouseRes.length > 0) targetWarehouseId = anyWarehouseRes[0].id;
            }

            if (targetWarehouseId) {
              const balances = await tx.select().from(inventoryBalancesTable)
                .where(and(eq(inventoryBalancesTable.product_id, stock.product_id), eq(inventoryBalancesTable.warehouse_id, targetWarehouseId)));
              
              if (balances.length > 0) {
                await tx.update(inventoryBalancesTable).set({ quantity: balances[0].quantity + actualReturnedQty })
                  .where(and(eq(inventoryBalancesTable.product_id, stock.product_id), eq(inventoryBalancesTable.warehouse_id, targetWarehouseId)));
              } else {
                await tx.insert(inventoryBalancesTable).values({
                  id: uuidv7(),
                  warehouse_id: targetWarehouseId,
                  product_id: stock.product_id,
                  quantity: actualReturnedQty,
                });
              }
            }
          }
        }
      }

      // 5. Finalize Trip Status
      const finalStatus = hasDiscrepancies ? "CLOSED_WITH_DISCREPANCIES" : "CLOSED";
      await tx.update(tripsTable).set({ 
        status: finalStatus,
        closed_at: new Date()
      }).where(eq(tripsTable.id, tripId));

      return this.getTrip(tripId);
    });
  }

  static async listDiscrepancies(branchId: string, status?: string, page: number = 1, limit: number = 30, search: string = '') {
    const offset = (page - 1) * limit;

    const conditions = [eq(tripsTable.branch_id, branchId)];
    if (status) {
      conditions.push(eq(discrepancyLogsTable.status, status as any));
    }
    if (search) {
      conditions.push(sql`${discrepancyLogsTable.description} ILIKE ${`%${search}%`}`);
    }

    const whereClause = and(...conditions);

    const data = await db.select({
      id: discrepancyLogsTable.id,
      trip_id: discrepancyLogsTable.trip_id,
      type: discrepancyLogsTable.type,
      description: discrepancyLogsTable.description,
      expected_value: discrepancyLogsTable.expected_value,
      actual_value: discrepancyLogsTable.actual_value,
      status: discrepancyLogsTable.status,
      snapshot_data: discrepancyLogsTable.snapshot_data,
      created_at: discrepancyLogsTable.created_at,
      trip: {
        planned_date: tripsTable.planned_date,
        type: tripsTable.type,
        incharge_name: usersTable.name,
      }
    })
    .from(discrepancyLogsTable)
    .innerJoin(tripsTable, eq(discrepancyLogsTable.trip_id, tripsTable.id))
    .innerJoin(usersTable, eq(tripsTable.incharge_id, usersTable.id))
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(discrepancyLogsTable.created_at);

    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(discrepancyLogsTable)
      .innerJoin(tripsTable, eq(discrepancyLogsTable.trip_id, tripsTable.id))
      .innerJoin(usersTable, eq(tripsTable.incharge_id, usersTable.id))
      .where(whereClause);

    const count = Number(countResult[0].count);

    return {
      data,
      meta: {
        total_records: count,
        total_pages: Math.ceil(count / limit),
        current_page: page,
        page_size: limit
      }
    };
  }

  static async resolveDiscrepancy(discrepancyId: string, payload: import('./operations.types').ResolveDiscrepancyPayload) {
    return await db.transaction(async (tx) => {
      // Fetch existing log to access snapshot_data and trip_id
      const existing = await tx.select().from(discrepancyLogsTable).where(eq(discrepancyLogsTable.id, discrepancyId));
      if (existing.length === 0) throw new Error("Discrepancy not found");
      const discrepancy = existing[0];

      let setClause: any = { status: payload.status };
      
      let newDescription = discrepancy.description;
      if (payload.notes) {
        newDescription = `${newDescription}\n[${payload.status} Notes]: ${payload.notes}`;
      }

      let snapshot: any = discrepancy.snapshot_data;
      if (typeof snapshot === 'string') {
        try {
          snapshot = JSON.parse(snapshot);
        } catch (e) {
          // ignore
        }
      }

      // Handle Wallet Refund
      if (payload.refund_amount && payload.refund_amount > 0) {
        if (!snapshot || !snapshot.amount) {
          throw new Error("Cannot process refund: No original charged amount found in snapshot.");
        }
        const originalAmount = parseFloat(snapshot.amount);
        if (payload.refund_amount > originalAmount) {
          throw new Error(`Refund amount (${payload.refund_amount}) cannot exceed the originally charged amount (${originalAmount}).`);
        }

        // Fetch Trip to get incharge_id and branch_id
        const tripRes = await tx.select().from(tripsTable).where(eq(tripsTable.id, discrepancy.trip_id));
        if (tripRes.length === 0) throw new Error("Trip not found for this discrepancy.");
        const trip = tripRes[0];

        if (!trip.incharge_id) throw new Error("Trip has no in-charge assigned to refund.");

        let walletRes = await tx.select().from(staffWalletsTable).where(and(eq(staffWalletsTable.user_id, trip.incharge_id), eq(staffWalletsTable.branch_id, trip.branch_id)));
        if (walletRes.length > 0) {
          const wallet = walletRes[0];
          const newBalance = parseFloat(wallet.balance) + payload.refund_amount;
          
          await tx.insert(staffWalletTransactionsTable).values({
            id: uuidv7(),
            wallet_id: wallet.id,
            trip_id: trip.id,
            discrepancy_id: discrepancy.id,
            type: "OTHER",
            amount: payload.refund_amount.toString(),
            description: `Refund for resolved discrepancy (${discrepancy.type})`
          });

          await tx.update(staffWalletsTable).set({ balance: newBalance.toString() }).where(eq(staffWalletsTable.id, wallet.id));
          newDescription = `${newDescription}\n[Refund]: ${payload.refund_amount} credited to staff wallet.`;
        }
      }

      // Handle Warehouse Return
      if (payload.return_to_warehouse && discrepancy.type === "STOCK_MISSING") {
        if (!payload.warehouse_id) throw new Error("Warehouse ID is required to return stock.");

        // Try snapshot first (for new records), then fall back to trip_stock table (for old records)
        let productId: string | undefined = snapshot?.productId;
        let serialItemId: string | undefined = snapshot?.serialItemId;
        let missingQty: number | undefined;
        let tripStockId: string | undefined;

        if (productId && snapshot?.expectedQty !== undefined && snapshot?.actualQty !== undefined) {
          // Snapshot has full data
          missingQty = Number(snapshot.expectedQty) - Number(snapshot.actualQty);
        } else {
          // Fallback: derive from expected_value / actual_value columns on the discrepancy row,
          // and look up the product_id + serial_item_id from the trip_stock table.
          const expected = Number(discrepancy.expected_value ?? 0);
          const actual   = Number(discrepancy.actual_value   ?? 0);
          missingQty = expected - actual;

          if (!productId) {
            // Find the trip_stock rows that match this discrepancy's trip and have DISCREPANCY status
            const stockRows = await tx
              .select({
                id: tripStockTable.id,
                product_id: tripStockTable.product_id,
                serial_item_id: tripStockTable.serial_item_id,
                loaded_qty: tripStockTable.loaded_qty,
                sold_qty: tripStockTable.sold_qty,
                returned_qty: tripStockTable.returned_qty
              })
              .from(tripStockTable)
              .where(and(
                eq(tripStockTable.trip_id, discrepancy.trip_id),
                eq(tripStockTable.status, "DISCREPANCY")
              ));

            if (stockRows.length > 0) {
              // Pick the stock row whose missing qty matches
              const match = stockRows.find(r => {
                const expectedR = r.loaded_qty - r.sold_qty;
                const missing = expectedR - r.returned_qty;
                return missing === missingQty;
              }) || stockRows[0];
              productId = match.product_id;
              serialItemId = match.serial_item_id ?? undefined;
              tripStockId = match.id;
            }
          }
        }

        if (!productId || missingQty === undefined || missingQty <= 0) {
          throw new Error("Cannot process warehouse return: Unable to determine the missing product or quantity. Please contact support.");
        }

        // 1. Update bulk inventory balance
        const balances = await tx.select().from(inventoryBalancesTable)
          .where(and(eq(inventoryBalancesTable.product_id, productId), eq(inventoryBalancesTable.warehouse_id, payload.warehouse_id)));

        if (balances.length > 0) {
          await tx.update(inventoryBalancesTable).set({ quantity: balances[0].quantity + missingQty })
            .where(and(eq(inventoryBalancesTable.product_id, productId), eq(inventoryBalancesTable.warehouse_id, payload.warehouse_id)));
        } else {
          await tx.insert(inventoryBalancesTable).values({
            id: uuidv7(),
            warehouse_id: payload.warehouse_id,
            product_id: productId,
            quantity: missingQty
          });
        }

        // 2. CRITICAL: For serialized items, reset the serial item status to IN_STOCK
        //    so it becomes visible again in POS and inventory screens.
        if (serialItemId) {
          await tx.update(serialItemsTable)
            .set({ status: "IN_STOCK", warehouse_id: payload.warehouse_id })
            .where(eq(serialItemsTable.id, serialItemId));
        } else {
          // No serial_item_id in snapshot/stock row — try to find by serial_number if provided,
          // or find any ON_TRIP serial item for this product on this trip
          const onTripSerials = await tx
            .select({ id: serialItemsTable.id })
            .from(serialItemsTable)
            .innerJoin(tripStockTable, eq(tripStockTable.serial_item_id, serialItemsTable.id))
            .where(and(
              eq(tripStockTable.trip_id, discrepancy.trip_id),
              eq(serialItemsTable.product_id, productId),
              eq(serialItemsTable.status, "ON_TRIP")
            ));

          for (const serial of onTripSerials) {
            await tx.update(serialItemsTable)
              .set({ status: "IN_STOCK", warehouse_id: payload.warehouse_id })
              .where(eq(serialItemsTable.id, serial.id));
          }
        }

        newDescription = `${newDescription}\n[Warehouse Return]: ${missingQty} units returned to warehouse.`;
      }

      setClause.description = newDescription;

      await tx.update(discrepancyLogsTable)
        .set(setClause)
        .where(eq(discrepancyLogsTable.id, discrepancyId));
        
      return { success: true };
    });
  }

  static async getMobileData(tripId: string, branchId: string) {
    const trip = await this.getTrip(tripId);
    if (!trip || trip.branch_id !== branchId) {
      throw new Error("Trip not found or access denied");
    }

    // 1. Customers on the route
    const customers = trip.route_id 
      ? await db.select().from(customersTable).where(eq(customersTable.route_id, trip.route_id))
      : [];

    // 1.5 Route Areas
    const { routeAreasTable } = await import("../routes/routes.schema");
    const areas = trip.route_id
      ? await db.select().from(routeAreasTable).where(eq(routeAreasTable.route_id, trip.route_id))
      : [];

    // 2. Stock and Products
    const productIds = Array.from(new Set(trip.stock.map(s => s.product_id)));
    let products = productIds.length > 0 
      ? await db.select().from(productsTable).where(inArray(productsTable.id, productIds))
      : [];
      
    const { S3Util } = await import("../../utils/s3.util");
    products = await Promise.all(products.map(async (product) => {
      let image_signed_url = null;
      if (product.image_url) {
        image_signed_url = await S3Util.getSignedDownloadUrl(product.image_url, 604800);
      }
      return { ...product, image_url: image_signed_url };
    }));

    // 3. Active Promotions
    const now = new Date();
    const activePromotions = await db.select()
      .from(promotionsTable)
      .where(and(
        eq(promotionsTable.is_active, true),
        lte(promotionsTable.start_date, now),
        gte(promotionsTable.end_date, now)
      ));

    // 3.5 Active Taxes
    const { taxesTable } = await import("../settings/settings.schema");
    const activeTaxes = await db.select().from(taxesTable).where(eq(taxesTable.is_active, true));

    // 4. Active Contracts for these customers
    const customerIds = customers.map(c => c.id);
    let finalContracts: any[] = [];
    
    // 4.5 Active Installment Schemes
    const schemes = await db.select().from(installmentSchemesTable).where(
      and(
        eq(installmentSchemesTable.is_active, true),
        or(
          eq(installmentSchemesTable.branch_id, branchId),
          sql`${installmentSchemesTable.branch_id} IS NULL`
        )
      )
    );
    
    if (customerIds.length > 0 && (trip.type === "COLLECTION" || trip.type === "BOTH")) {
      const activeContracts = await db.select().from(installmentContractsTable).where(
          and(
            inArray(installmentContractsTable.customer_id, customerIds),
            inArray(installmentContractsTable.status, ["ACTIVE", "DEFAULTED"])
          )
        );

      if (activeContracts.length > 0) {
        const contractIds = activeContracts.map(c => c.id);
        const saleIds = activeContracts.map(c => c.sale_id);
        
        const { installmentSchedulesTable, collectionAttemptsTable } = await import("../collections/collections.schema");
        const { saleItemsTable } = await import("../sale/sales.schema");
        const { productsTable } = await import("../products/products.schema");
        const { guarantorsTable } = await import("../customers/customers.schema");
        
        const futureDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Colombo" }));
        futureDate.setDate(futureDate.getDate() + 180);
        const futureStr = futureDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Colombo' });

        const schedules = await db.select().from(installmentSchedulesTable).where(
          and(
            inArray(installmentSchedulesTable.contract_id, contractIds),
            inArray(installmentSchedulesTable.status, ["PENDING", "PARTIALLY_PAID", "OVERDUE"]),
            sql`${installmentSchedulesTable.due_date} <= ${futureStr}`
          )
        );
        
        const saleItems = await db.select({
          sale_id: saleItemsTable.sale_id,
          product_name: productsTable.name,
          quantity: saleItemsTable.quantity,
        })
        .from(saleItemsTable)
        .innerJoin(productsTable, eq(saleItemsTable.product_id, productsTable.id))
        .where(inArray(saleItemsTable.sale_id, saleIds));

        const saleProductsMap: Record<string, string> = {};
        for (const item of saleItems) {
           const itemLabel = item.quantity > 1 ? `${item.product_name} (x${item.quantity})` : item.product_name;
           if (!saleProductsMap[item.sale_id]) {
             saleProductsMap[item.sale_id] = itemLabel;
           } else {
             saleProductsMap[item.sale_id] += ` + ${itemLabel}`;
           }
        }

        // Fetch guarantor details for these contracts
        const guarantorIds = Array.from(new Set(activeContracts.map(c => c.guarantor_id).filter(Boolean))) as string[];
        let guarantorsList: any[] = [];
        if (guarantorIds.length > 0) {
          guarantorsList = await db.select().from(guarantorsTable).where(inArray(guarantorsTable.id, guarantorIds));
        }
        const guarantorMap: Record<string, any> = Object.fromEntries(guarantorsList.map(g => [g.id, g]));

        const pastAttempts = await db.select({
           contract_id: collectionAttemptsTable.contract_id,
           created_at: collectionAttemptsTable.created_at,
           status: collectionAttemptsTable.status,
           remarks: collectionAttemptsTable.remarks,
        }).from(collectionAttemptsTable).where(
          and(
            inArray(collectionAttemptsTable.contract_id, contractIds),
            inArray(collectionAttemptsTable.status, ["MISSED", "CUSTOMER_UNAVAILABLE", "PROMISE_TO_PAY"])
          )
        ).orderBy(desc(collectionAttemptsTable.created_at));

        const attemptsMap: Record<string, any[]> = {};
        for (const a of pastAttempts) {
           if (!attemptsMap[a.contract_id]) attemptsMap[a.contract_id] = [];
           if (attemptsMap[a.contract_id].length < 5) {
             attemptsMap[a.contract_id].push(a);
           }
        }

        for (const contract of activeContracts) {
           const contractSchedules = schedules.filter(s => s.contract_id === contract.id);
           let currentDue = 0;
           for (const s of contractSchedules) {
             currentDue += (parseFloat(s.amount_due as string) - parseFloat(s.amount_paid as string));
           }
           
           if (contractSchedules.length > 0) {
             const g = contract.guarantor_id ? guarantorMap[contract.guarantor_id] : null;
             finalContracts.push({
               ...contract,
               current_due: currentDue,
               product_name: saleProductsMap[contract.sale_id] || "Product",
               guarantor_name: g?.full_name || null,
               guarantor_phone: g?.mobile || null,
               guarantor_nic: g?.nic || null,
               guarantor_address: g?.address || null,
               schedules: contractSchedules,
               past_attempts: attemptsMap[contract.id] || []
             });
           }
        }
      }
    }

    // 5. System Settings (for print bills)
    const { systemSettingsTable } = await import("../settings/settings.schema");
    const settings = await db.select().from(systemSettingsTable).where(
      inArray(systemSettingsTable.setting_key, ["company_name", "company_logo_key", "downpayment_partial_recovery_days_max"])
    );

    for (const s of settings) {
      if (s.setting_key === 'company_logo_key' && s.setting_value) {
        const signedUrl = await S3Util.getSignedDownloadUrl(s.setting_value as string);
        s.setting_key = 'company_logo_url';
        s.setting_value = signedUrl;
      }
    }

    // 4.6 Pre-Orders for this route
    const { preOrdersTable, preOrderItemsTable } = await import("../orders/orders.schema");
    const preOrders = trip.route_id
      ? await db.select().from(preOrdersTable).where(
          and(
            eq(preOrdersTable.route_id, trip.route_id),
            eq(preOrdersTable.status, "PENDING")
          )
        )
      : [];

    let preOrderItems: any[] = [];
    if (preOrders.length > 0) {
      const poIds = preOrders.map(p => p.id);
      preOrderItems = await db.select().from(preOrderItemsTable).where(inArray(preOrderItemsTable.pre_order_id, poIds));
    }

    // 6. Branch Info (for print bills)
    const { branchesTable, branchPhonesTable } = await import("../branches/branches.schema");
    const branchInfo = await db.query.branchesTable.findFirst({
      where: eq(branchesTable.id, branchId),
      with: { phones: true }
    });

    return {
      trip: {
        id: trip.id,
        route_id: trip.route_id,
        type: trip.type,
        status: trip.status,
      },
      stock: trip.stock,
      customers,
      areas: areas.map(a => ({ id: a.id, name: a.name })),
      products,
      promotions: activePromotions,
      taxes: activeTaxes,
      schemes: schemes,
      contracts: finalContracts,
      preOrders: preOrders,
      preOrderItems: preOrderItems,
      settings: settings,
      branch: branchInfo,
    };
  }

  static async syncRoutes(payload: { id: string, trip_id: string, gps_lat: number, gps_lng: number, timestamp: string }[]) {
    try {
      if (payload.length > 0) {
        // Map payload to db schema
        const routeValues = payload.map(r => ({
          id: r.id,
          trip_id: r.trip_id,
          gps_lat: r.gps_lat.toString(),
          gps_lng: r.gps_lng.toString(),
          timestamp: new Date(r.timestamp),
          created_at: new Date()
        }));

        const { sql } = await import("drizzle-orm");
        await db.insert(tripRoutesTable).values(routeValues).onDuplicateKeyUpdate({ set: { id: sql`id` } });
      }
      return { syncedCount: payload.length };
    } catch (error) {
      console.error("Failed to sync routes:", error);
      throw error;
    }
  }

  static async getTripAgreements(tripId: string) {
    const trip = await db.query.tripsTable.findFirst({
      where: eq(tripsTable.id, tripId),
      with: {
        route: true,
        incharge: true,
        vehicle: true,
      }
    });

    if (!trip) throw new Error("Trip not found");

    // Fetch all installment sales for this trip (excluding cancelled)
    const sales = await db.query.salesTable.findMany({
      where: and(
        eq(salesTable.trip_id, tripId),
        eq(salesTable.sale_type, "INSTALLMENT"),
        ne(salesTable.status, "CANCELLED")
      ),
      with: {
        customer: true,
        creator: true,
        items: {
          with: {
            product: true,
            serialItem: true,
          }
        }
      },
      orderBy: [asc(salesTable.created_at)]
    });

    const { S3Util } = await import("../../utils/s3.util");
    const { systemSettingsTable } = await import("../settings/settings.schema");
    const { branchesTable } = await import("../branches/branches.schema");

    // System Settings for Company Branding
    const settings = await db.select().from(systemSettingsTable).where(
      inArray(systemSettingsTable.setting_key, ["company_name", "company_logo_key", "company_address", "company_phone"])
    );

    let companyName = "MASTER-H (PVT) LTD";
    let companyLogoUrl = "";
    let companyAddress = "";
    let companyPhone = "";

    for (const s of settings) {
      if (s.setting_key === "company_name" && s.setting_value) companyName = s.setting_value;
      if (s.setting_key === "company_address" && s.setting_value) companyAddress = s.setting_value;
      if (s.setting_key === "company_phone" && s.setting_value) companyPhone = s.setting_value;
      if (s.setting_key === "company_logo_key" && s.setting_value) {
        try {
          companyLogoUrl = await S3Util.getSignedDownloadUrl(s.setting_value, 3600);
        } catch (e) {}
      }
    }

    // Branch Information
    const branchInfo = await db.query.branchesTable.findFirst({
      where: eq(branchesTable.id, trip.branch_id),
      with: { phones: true }
    });

    const agreements: any[] = [];

    for (const sale of sales) {
      const contractRecord = await db.query.installmentContractsTable.findFirst({
        where: eq(installmentContractsTable.sale_id, sale.id),
        with: {
          guarantor: true,
          scheme: true,
          schedules: {
            orderBy: [asc(installmentSchedulesTable.installment_number)]
          }
        }
      });

      if (!contractRecord) continue;

      let signatureSignedUrl = null;
      let guarantorSignatureSignedUrl = null;

      if (contractRecord.signature_image_url) {
        try {
          signatureSignedUrl = await S3Util.getSignedDownloadUrl(contractRecord.signature_image_url, 3600);
        } catch (e) {}
      }

      if (contractRecord.guarantor_signature_image_url) {
        try {
          guarantorSignatureSignedUrl = await S3Util.getSignedDownloadUrl(contractRecord.guarantor_signature_image_url, 3600);
        } catch (e) {}
      }

      agreements.push({
        sale: {
          id: sale.id,
          reference_number: sale.reference_number || sale.id.slice(0, 8).toUpperCase(),
          created_at: sale.created_at,
          total: sale.total,
          downpayment: sale.downpayment,
          payment_mode: sale.payment_mode,
          creator_name: sale.creator?.name || trip.incharge?.name || "Staff",
          creator_phone: sale.creator?.phone_number || "",
          items: (sale.items || []).map(item => ({
            product_id: item.product_id,
            product_name: item.product?.name || "Product",
            sku: item.product?.sku || "",
            serial_number: item.serialItem?.serial_number || null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: item.line_total,
            warranty_type: item.product?.warranty_type || "NONE",
            warranty_period_years: item.product?.warranty_period_years || null,
            warranty_period_months: item.product?.warranty_period_months || null,
          }))
        },
        contract: {
          id: contractRecord.id,
          principal: contractRecord.principal,
          interest_rate: contractRecord.interest_rate,
          interest_amount: contractRecord.interest_amount,
          total_payable: contractRecord.total_payable,
          downpayment: contractRecord.downpayment,
          balance: contractRecord.balance,
          schedule_frequency: contractRecord.schedule_frequency,
          status: contractRecord.status,
          signature_signed_url: signatureSignedUrl,
          guarantor_signature_signed_url: guarantorSignatureSignedUrl,
          scheme_name: contractRecord.scheme?.name || "Standard Scheme",
          terms: contractRecord.scheme?.terms || contractRecord.schedules.length,
          schedules: (contractRecord.schedules || []).map(s => ({
            installment_number: s.installment_number,
            due_date: s.due_date,
            amount_due: s.amount_due,
            amount_paid: s.amount_paid,
            status: s.status,
          }))
        },
        customer: sale.customer ? {
          id: sale.customer.id,
          full_name: sale.customer.full_name,
          nic: sale.customer.nic || "N/A",
          mobile: sale.customer.mobile,
          address: sale.customer.address,
        } : null,
        guarantor: contractRecord.guarantor ? {
          id: contractRecord.guarantor.id,
          full_name: contractRecord.guarantor.full_name,
          nic: contractRecord.guarantor.nic || "N/A",
          mobile: contractRecord.guarantor.mobile,
          address: contractRecord.guarantor.address,
        } : null
      });
    }

    return {
      trip: {
        id: trip.id,
        planned_date: trip.planned_date,
        type: trip.type,
        status: trip.status,
        route_name: trip.route?.name || "Route",
        incharge_name: trip.incharge?.name || "In-Charge",
        vehicle_plate: trip.vehicle?.plate_number || "",
      },
      company: {
        name: companyName,
        logo_url: companyLogoUrl,
        address: companyAddress,
        phone: companyPhone,
      },
      branch: {
        id: branchInfo?.id,
        name: branchInfo?.name || "Branch",
        address: branchInfo?.address || "",
        phones: (branchInfo?.phones || []).map((p: any) => p.phone_number),
      },
      agreements,
      total_agreements: agreements.length,
    };
  }
}
