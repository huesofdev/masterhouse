import { db } from "../../db";
import { sql, eq, and, like, or, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import * as ExcelJS from "exceljs";
import { intakeOrdersTable, intakeItemsTable } from "./intake.schema";
import { inventoryBalancesTable, serialItemsTable } from "./inventory.schema";
import { CreateIntakePayload } from "./inventory.types";
import { productsTable } from "../products/products.schema";
import { branchesTable } from "../branches/branches.schema";
import { warehousesTable } from "../warehouses/warehouses.schema";
import { suppliersTable } from "../suppliers/suppliers.schema";
import { supplierBranchBalancesTable, supplierLedgerTable } from "../suppliers/supplier_ledger.schema";

export class InventoryService {
  static async processIntake(payload: CreateIntakePayload, userId: string) {
    return await db.transaction(async (tx) => {
      // 1. Calculate total cost
      let totalOrderCost = 0;
      for (const item of payload.items) {
        totalOrderCost += item.quantity * item.unit_cost;
      }

      // 2. Create Intake Order
      const intakeOrderId = uuidv7();
      await tx.insert(intakeOrdersTable).values({
        id: intakeOrderId,
        branch_id: payload.branch_id,
        warehouse_id: payload.warehouse_id,
        supplier_id: payload.supplier_id || null,
        supplier_name: payload.supplier_name,
        invoice_number: payload.invoice_number,
        received_at: payload.received_at ? new Date(payload.received_at) : new Date(),
        created_by: userId,
        total_cost: totalOrderCost.toString(),
      });

      // 3. Process Items
      for (const item of payload.items) {
        const intakeItemId = uuidv7();
        const totalItemCost = item.quantity * item.unit_cost;

        // Insert intake item line
        await tx.insert(intakeItemsTable).values({
          id: intakeItemId,
          intake_order_id: intakeOrderId,
          warehouse_id: payload.warehouse_id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost.toString(),
          total_cost: totalItemCost.toString(),
        });

        // Handle serialized items
        if (item.serials && item.serials.length > 0) {
          if (item.serials.length !== item.quantity) {
            throw new Error(`Mismatched serials count for product ${item.product_id}. Expected ${item.quantity}, got ${item.serials.length}`);
          }

          // Check for duplicate serials in the payload list itself
          const uniqueSerialsInRequest = new Set(item.serials);
          if (uniqueSerialsInRequest.size !== item.serials.length) {
            throw new Error(`Duplicate serial numbers detected in your intake list.`);
          }

          // Check if any of these serials already exist in the database
          const existingSerials = await tx.select({
            serial_number: serialItemsTable.serial_number
          })
          .from(serialItemsTable)
          .where(inArray(serialItemsTable.serial_number, item.serials));

          if (existingSerials.length > 0) {
            const duplicates = existingSerials.map(s => s.serial_number).join(", ");
            throw new Error(`Serial number(s) [${duplicates}] already exist in inventory.`);
          }
          
          for (const serial of item.serials) {
            await tx.insert(serialItemsTable).values({
              id: uuidv7(),
              product_id: item.product_id,
              intake_item_id: intakeItemId,
              warehouse_id: payload.warehouse_id,
              serial_number: serial,
              status: "IN_STOCK",
            });
          }
        }

        // Upsert inventory balances (bulk quantity)
        // Check if balance exists
        const existingBalance = await tx.query.inventoryBalancesTable.findFirst({
          where: and(
            eq(inventoryBalancesTable.warehouse_id, payload.warehouse_id),
            eq(inventoryBalancesTable.product_id, item.product_id)
          )
        });

        if (existingBalance) {
          // Calculate new moving average cost
          const oldQty = existingBalance.quantity;
          const oldAvg = parseFloat(existingBalance.avg_cost as string);
          const newQty = item.quantity;
          const newUnit = item.unit_cost;

          const totalQty = oldQty + newQty;
          const newAvgCost = totalQty === 0 ? 0 : ((oldQty * oldAvg) + (newQty * newUnit)) / totalQty;

          await tx.update(inventoryBalancesTable)
            .set({
              quantity: totalQty,
              avg_cost: newAvgCost.toString(),
            })
            .where(and(
              eq(inventoryBalancesTable.warehouse_id, payload.warehouse_id),
              eq(inventoryBalancesTable.product_id, item.product_id)
            ));
        } else {
          await tx.insert(inventoryBalancesTable).values({
            warehouse_id: payload.warehouse_id,
            product_id: item.product_id,
            quantity: item.quantity,
            avg_cost: item.unit_cost.toString(),
          });
        }

        // Update product's last purchase price
        await tx.update(productsTable)
          .set({ last_purchase_price: item.unit_cost.toString() })
          .where(eq(productsTable.id, item.product_id));
      }

      // 4. Update Supplier Ledger if supplier is linked
      if (payload.supplier_id && totalOrderCost > 0) {
        // Find or create balance
        let balanceRow = await tx.query.supplierBranchBalancesTable.findFirst({
          where: and(
            eq(supplierBranchBalancesTable.supplier_id, payload.supplier_id),
            eq(supplierBranchBalancesTable.branch_id, payload.branch_id)
          )
        });

        if (!balanceRow) {
          const newBalanceId = uuidv7();
          await tx.insert(supplierBranchBalancesTable).values({
            id: newBalanceId,
            supplier_id: payload.supplier_id,
            branch_id: payload.branch_id,
            balance_due: "0.00",
            total_paid: "0.00",
            opening_balance: "0.00"
          });
          balanceRow = { id: newBalanceId, supplier_id: payload.supplier_id, branch_id: payload.branch_id, balance_due: "0.00", total_paid: "0.00", opening_balance: "0.00" } as any;
        }

        const currentBalance = parseFloat(balanceRow!.balance_due as string);
        const newBalance = currentBalance + totalOrderCost;

        await tx.update(supplierBranchBalancesTable)
          .set({
            balance_due: newBalance.toString(),
            updated_at: new Date()
          })
          .where(eq(supplierBranchBalancesTable.id, balanceRow!.id));

        // Insert Ledger Entry
        await tx.insert(supplierLedgerTable).values({
          id: uuidv7(),
          supplier_id: payload.supplier_id,
          branch_id: payload.branch_id,
          transaction_type: "INTAKE_BILL",
          reference_id: intakeOrderId,
          amount: totalOrderCost.toString(),
          balance_after: newBalance.toString(),
          notes: `Billed from Intake ${payload.invoice_number || intakeOrderId.slice(0, 8)}`,
          created_by: userId,
        });
      }

      return { id: intakeOrderId };
    });
  }

  static async getIntakeOrders(branchId: string, page: number = 1, limit: number = 100, search: string = '') {
    const offset = (page - 1) * limit;

    let whereClause = eq(intakeOrdersTable.branch_id, branchId);
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;

      // 1. Subquery for Serial Number matches
      const matchingSerialIntakeIds = db
        .select({ intake_order_id: intakeItemsTable.intake_order_id })
        .from(serialItemsTable)
        .innerJoin(intakeItemsTable, eq(serialItemsTable.intake_item_id, intakeItemsTable.id))
        .where(like(serialItemsTable.serial_number, term));

      // 2. Subquery for Product Name or SKU matches
      const matchingProductIntakeIds = db
        .select({ intake_order_id: intakeItemsTable.intake_order_id })
        .from(intakeItemsTable)
        .innerJoin(productsTable, eq(intakeItemsTable.product_id, productsTable.id))
        .where(
          or(
            like(productsTable.name, term),
            like(productsTable.sku, term)
          )
        );

      whereClause = and(
        eq(intakeOrdersTable.branch_id, branchId),
        or(
          like(intakeOrdersTable.supplier_name, term),
          like(intakeOrdersTable.invoice_number, term),
          like(intakeOrdersTable.id, term),
          inArray(intakeOrdersTable.id, matchingSerialIntakeIds),
          inArray(intakeOrdersTable.id, matchingProductIntakeIds)
        )
      ) as any;
    }

    const data = await db.query.intakeOrdersTable.findMany({
      where: whereClause,
      orderBy: (orders, { desc }) => [desc(orders.received_at)],
      limit,
      offset,
      with: {
        warehouse: true,
        creator: { columns: { name: true, email: true } },
      }
    });

    const totalRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(intakeOrdersTable)
      .where(whereClause);
      
    const total = Number(totalRes[0].count);

    return {
      data,
      meta: {
        total_records: total,
        current_page: page,
        total_pages: Math.ceil(total / limit),
        limit
      }
    };
  }

  static async getInventoryBalances(warehouseId: string) {
    return await db.query.inventoryBalancesTable.findMany({
      where: eq(inventoryBalancesTable.warehouse_id, warehouseId),
      with: {
        product: true
      }
    });
  }

  static async getIntakeOrderById(id: string) {
    return await db.query.intakeOrdersTable.findFirst({
      where: eq(intakeOrdersTable.id, id),
      with: {
        warehouse: true,
        supplier: true,
        creator: { columns: { id: true, name: true, email: true } },
        items: {
          with: {
            product: {
              columns: { id: true, name: true, sku: true, is_serialized: true, base_price: true }
            },
            serials: {
              columns: { id: true, serial_number: true, status: true }
            }
          }
        }
      }
    });
  }

  static async deleteIntake(intakeId: string, userId: string) {
    return await db.transaction(async (tx) => {
      // 1. Fetch Intake with all items and their serials
      const intake = await tx.query.intakeOrdersTable.findFirst({
        where: eq(intakeOrdersTable.id, intakeId),
        with: {
          items: {
            with: {
              serials: true
            }
          }
        }
      });
      
      if (!intake) throw new Error("Intake not found");

      // 2. Validate Safety (Can we reverse?)
      for (const item of intake.items) {
        if (item.serials && item.serials.length > 0) {
          // Serialized Check — every serial from this intake must still be IN_STOCK
          for (const serial of item.serials) {
            if (serial.status !== "IN_STOCK") {
              throw new Error(`Cannot delete intake: Serial ${serial.serial_number} has been moved or sold (Status: ${serial.status}). Reverse the sale/transfer first.`);
            }
          }
        } else {
          // Bulk Item Check — the warehouse must have enough stock to deduct
          const balance = await tx.query.inventoryBalancesTable.findFirst({
            where: and(
              eq(inventoryBalancesTable.warehouse_id, item.warehouse_id),
              eq(inventoryBalancesTable.product_id, item.product_id)
            )
          });
          if (!balance) {
            throw new Error(`Cannot delete intake: No inventory balance record found for product in warehouse. The stock may have already been cleared or moved.`);
          }
          if (balance.quantity < item.quantity) {
            throw new Error(`Cannot delete intake: Only ${balance.quantity} units remain in warehouse but this intake added ${item.quantity}. Some items may have already been sold or transferred out.`);
          }
        }
      }

      // 3. Reversal Process — decrement balances and remove serials
      for (const item of intake.items) {
        const isSerialized = item.serials && item.serials.length > 0;
        // How many units to deduct — for serialized, use actual serial count
        const qtyToDeduct = isSerialized ? item.serials!.length : item.quantity;

        // Fetch the current balance record
        const balance = await tx.query.inventoryBalancesTable.findFirst({
          where: and(
            eq(inventoryBalancesTable.warehouse_id, item.warehouse_id),
            eq(inventoryBalancesTable.product_id, item.product_id)
          )
        });

        if (!balance) {
          // This should never happen after passing validation above, but guard anyway
          throw new Error(`Inventory balance record disappeared during transaction for product ${item.product_id}. Aborting.`);
        }

        const currentQty = balance.quantity;
        const currentAvgCost = parseFloat(balance.avg_cost as string);
        const intakeUnitCost = parseFloat(item.unit_cost as string);
        const newQty = currentQty - qtyToDeduct;

        // Recalculate avg_cost by reversing the weighted-average formula:
        //   newAvg = (currentTotal - removedTotal) / newQty
        //   where currentTotal = currentQty * currentAvgCost
        //   and   removedTotal = qtyToDeduct * intakeUnitCost
        let newAvgCost: number;
        if (newQty <= 0) {
          newAvgCost = 0; // No stock left, reset avg cost to zero
        } else {
          const currentTotal = currentQty * currentAvgCost;
          const removedTotal = qtyToDeduct * intakeUnitCost;
          newAvgCost = (currentTotal - removedTotal) / newQty;
          // Guard against negative avg_cost due to floating-point or data errors
          if (newAvgCost < 0) newAvgCost = 0;
        }

        await tx.update(inventoryBalancesTable)
          .set({
            quantity: newQty,
            avg_cost: newAvgCost.toFixed(2),
          })
          .where(and(
            eq(inventoryBalancesTable.warehouse_id, item.warehouse_id),
            eq(inventoryBalancesTable.product_id, item.product_id)
          ));

        // Serialized: delete the serial item records
        if (isSerialized) {
          for (const serial of item.serials!) {
            await tx.delete(serialItemsTable).where(eq(serialItemsTable.id, serial.id));
          }
        }
        
        // Delete intake item line
        await tx.delete(intakeItemsTable).where(eq(intakeItemsTable.id, item.id));
      }

      // 4. Reverse Supplier Ledger
      if (intake.supplier_id && parseFloat(intake.total_cost as string) > 0) {
        const totalCost = parseFloat(intake.total_cost as string);
        
        const branchBalance = await tx.query.supplierBranchBalancesTable.findFirst({
          where: and(
            eq(supplierBranchBalancesTable.supplier_id, intake.supplier_id),
            eq(supplierBranchBalancesTable.branch_id, intake.branch_id)
          )
        });

        if (branchBalance) {
          const oldBalanceDue = parseFloat(branchBalance.balance_due as string);
          const newBalanceDue = Math.max(0, oldBalanceDue - totalCost);

          await tx.update(supplierBranchBalancesTable)
            .set({ balance_due: newBalanceDue.toString() })
            .where(eq(supplierBranchBalancesTable.id, branchBalance.id));

          await tx.insert(supplierLedgerTable).values({
            id: uuidv7(),
            supplier_id: intake.supplier_id,
            branch_id: intake.branch_id,
            transaction_type: "ADJUSTMENT",
            reference_id: intake.id,
            amount: (-totalCost).toString(),
            balance_after: newBalanceDue.toString(),
            notes: `Reversal of deleted intake ${intake.invoice_number || 'UNKNOWN'}`,
            created_by: userId,
          });
        }
      }

      // 5. Delete Intake Order header
      await tx.delete(intakeOrdersTable).where(eq(intakeOrdersTable.id, intake.id));
      
      return { success: true };
    });
  }

  // --- BULK OPERATIONS ---
  static async generateBulkTemplate(): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Master House System";
    const sheet = workbook.addWorksheet("Intake");
    
    sheet.columns = [
      { header: "Branch Name (Required)", key: "branch", width: 25 },
      { header: "Warehouse Name (Required)", key: "warehouse", width: 25 },
      { header: "Supplier Name (Required)", key: "supplier", width: 30 },
      { header: "Invoice Number", key: "invoice", width: 20 },
      { header: "SKU (Required)", key: "sku", width: 20 },
      { header: "Quantity (Required)", key: "quantity", width: 15 },
      { header: "Unit Cost (Required)", key: "unitCost", width: 15 },
      { header: "Serial Numbers (Comma separated)", key: "serials", width: 50 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    sheet.addRow({
      branch: "Main Branch",
      warehouse: "Central Warehouse",
      supplier: "Samsung Electronics",
      invoice: "INV-2023-001",
      sku: "ELEC-TV-001",
      quantity: 2,
      unitCost: 100000,
      serials: "SN1001, SN1002",
    });

    return workbook.xlsx.writeBuffer();
  }

  static async bulkUploadIntake(buffer: Buffer, userId: string) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet(1);
    if (!sheet) throw new Error("Excel file must contain at least one worksheet");

    const branches = await db.select().from(branchesTable);
    const warehouses = await db.select().from(warehousesTable);
    const suppliers = await db.select().from(suppliersTable);
    const products = await db.select().from(productsTable);

    const branchMap = new Map(branches.map(b => [b.name.toLowerCase(), b.id]));
    const warehouseMap = new Map(warehouses.map(w => [w.name.toLowerCase(), w.id]));
    const supplierMap = new Map(suppliers.map(s => [s.name.toLowerCase(), s.id]));
    const productMap = new Map(products.map(p => [p.sku, p])); // map SKU to full product

    // We will group rows by "Branch-Warehouse-Supplier-Invoice" to create unified intake orders
    const groupedOrders = new Map<string, CreateIntakePayload>();
    let processed = 0;
    let errors: string[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      try {
        const branchName = row.getCell(1).text?.trim();
        const warehouseName = row.getCell(2).text?.trim();
        const supplierName = row.getCell(3).text?.trim();
        const invoiceNumber = row.getCell(4).text?.trim() || `BULK-${new Date().getTime()}`;
        const sku = row.getCell(5).text?.trim();
        const quantity = parseInt(row.getCell(6).text?.trim() || "0", 10);
        const unitCost = parseFloat(row.getCell(7).text?.trim() || "0");
        const serialsRaw = row.getCell(8).text?.trim();

        if (!branchName || !warehouseName || !supplierName || !sku || quantity <= 0 || isNaN(unitCost)) {
          errors.push(`Row ${rowNumber}: Missing or invalid required fields.`);
          return;
        }

        const branchId = branchMap.get(branchName.toLowerCase());
        const warehouseId = warehouseMap.get(warehouseName.toLowerCase());
        const supplierId = supplierMap.get(supplierName.toLowerCase());
        const product = productMap.get(sku);

        if (!branchId) throw new Error(`Branch '${branchName}' not found`);
        if (!warehouseId) throw new Error(`Warehouse '${warehouseName}' not found`);
        if (!product) throw new Error(`SKU '${sku}' not found in catalog`);

        // Serial validation
        let serials: string[] = [];
        if (product.is_serialized) {
          if (!serialsRaw) throw new Error(`Product ${sku} requires serial numbers`);
          serials = serialsRaw.split(',').map(s => s.trim()).filter(s => s);
          if (serials.length !== quantity) {
            throw new Error(`Serial count (${serials.length}) doesn't match quantity (${quantity})`);
          }
        }

        const groupKey = `${branchId}-${warehouseId}-${supplierName}-${invoiceNumber}`;
        if (!groupedOrders.has(groupKey)) {
          groupedOrders.set(groupKey, {
            branch_id: branchId,
            warehouse_id: warehouseId,
            supplier_id: supplierId,
            supplier_name: supplierName,
            invoice_number: invoiceNumber,
            items: []
          });
        }

        groupedOrders.get(groupKey)!.items.push({
          product_id: product.id,
          quantity,
          unit_cost: unitCost,
          serials: serials.length > 0 ? serials : undefined,
        });

        processed++;
      } catch (err: any) {
        errors.push(`Row ${rowNumber}: ${err.message}`);
      }
    });

    let createdOrders = 0;
    // Process each grouped order
    for (const [key, payload] of groupedOrders.entries()) {
      try {
        await InventoryService.processIntake(payload, userId);
        createdOrders++;
      } catch (err: any) {
        errors.push(`Failed to process order group ${key}: ${err.message}`);
      }
    }

    return { processed, createdOrders, errors };
  }

  static async lookupBarcodeData(payload: { serials?: string[]; skus?: string[] }) {
    const results: {
      serials: Array<{
        serial_number: string;
        status: string;
        product: { id: string; name: string; sku: string; price: number };
        found: boolean;
      }>;
      skus: Array<{
        sku: string;
        found: boolean;
        product?: { id: string; name: string; sku: string; is_serialized: boolean; price: number };
        available_serials?: Array<{ serial_number: string; status: string }>;
      }>;
    } = { serials: [], skus: [] };

    // 1. Process Serials Lookup (max 50)
    if (payload.serials && payload.serials.length > 0) {
      const cleanSerials = Array.from(new Set(payload.serials.map(s => String(s).trim()).filter(Boolean))).slice(0, 50);

      if (cleanSerials.length > 0) {
        const foundSerialItems = await db.query.serialItemsTable.findMany({
          where: inArray(serialItemsTable.serial_number, cleanSerials),
          with: {
            product: { columns: { id: true, name: true, sku: true, base_price: true, price: true } }
          }
        });

        const mapBySerial = new Map(foundSerialItems.map(item => [item.serial_number, item]));

        for (const sNum of cleanSerials) {
          const item = mapBySerial.get(sNum);
          if (item) {
            const price = parseFloat(item.product?.base_price || item.product?.price || '0');
            results.serials.push({
              serial_number: sNum,
              status: item.status,
              product: {
                id: item.product.id,
                name: item.product.name,
                sku: item.product.sku,
                price
              },
              found: true
            });
          } else {
            results.serials.push({
              serial_number: sNum,
              status: "NOT_FOUND",
              product: { id: "", name: "Unknown Serial", sku: "N/A", price: 0 },
              found: false
            });
          }
        }
      }
    }

    // 2. Process SKUs Lookup
    if (payload.skus && payload.skus.length > 0) {
      const cleanSkus = Array.from(new Set(payload.skus.map(s => String(s).trim()).filter(Boolean))).slice(0, 20);

      if (cleanSkus.length > 0) {
        const foundProducts = await db.query.productsTable.findMany({
          where: inArray(productsTable.sku, cleanSkus),
          columns: { id: true, name: true, sku: true, is_serialized: true, base_price: true, price: true }
        });

        const mapBySku = new Map(foundProducts.map(p => [p.sku, p]));

        for (const skuStr of cleanSkus) {
          const prod = mapBySku.get(skuStr);
          if (prod) {
            const price = parseFloat(prod.base_price || prod.price || '0');
            let availableSerials: Array<{ serial_number: string; status: string }> = [];

            if (prod.is_serialized) {
              const inStockSerials = await db.query.serialItemsTable.findMany({
                where: and(
                  eq(serialItemsTable.product_id, prod.id),
                  eq(serialItemsTable.status, "IN_STOCK")
                ),
                columns: { serial_number: true, status: true },
                limit: 100
              });
              availableSerials = inStockSerials;
            }

            results.skus.push({
              sku: skuStr,
              found: true,
              product: {
                id: prod.id,
                name: prod.name,
                sku: prod.sku,
                is_serialized: prod.is_serialized,
                price
              },
              available_serials: availableSerials
            });
          } else {
            results.skus.push({
              sku: skuStr,
              found: false
            });
          }
        }
      }
    }

    return results;
  }
}
