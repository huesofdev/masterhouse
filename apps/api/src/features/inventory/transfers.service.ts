import { db } from "../../db";
import { stockTransfersTable, stockTransferItemsTable, stockTransferSerialsTable } from "./transfers.schema";
import { inventoryBalancesTable, serialItemsTable } from "./inventory.schema";
import { eq, and, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { productsTable } from "../products/products.schema";

export class TransfersService {
  static async listTransfers(page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;
    
    // We fetch a simple history
    const items = await db.query.stockTransfersTable.findMany({
      limit,
      offset,
      orderBy: (transfers, { desc }) => [desc(transfers.transferred_at)],
      with: {
        sourceWarehouse: { columns: { name: true } },
        destinationWarehouse: { columns: { name: true } },
        transferredBy: { columns: { name: true } },
        items: {
          with: {
            product: { columns: { id: true, name: true, sku: true } },
            serials: {
              with: {
                serial: { columns: { serial_number: true } }
              }
            }
          }
        }
      }
    });

    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(stockTransfersTable);
      
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

  static async getTransfer(id: string) {
    const transfer = await db.query.stockTransfersTable.findFirst({
      where: eq(stockTransfersTable.id, id),
      with: {
        sourceWarehouse: { columns: { name: true, address: true } },
        destinationWarehouse: { columns: { name: true, address: true } },
        transferredBy: { columns: { name: true, email: true } },
        items: {
          with: {
            product: { columns: { id: true, name: true, sku: true, brand: true, category: true } },
            serials: {
              with: {
                serial: { columns: { serial_number: true } }
              }
            }
          }
        }
      }
    });
    return transfer;
  } 

  static async createTransfer(payload: any, userId: string) {
    const transferId = uuidv7();
    
    await db.transaction(async (tx) => {
      // 1. Create the transfer record
      await tx.insert(stockTransfersTable).values({
        id: transferId,
        reference_number: `TRN-${Date.now().toString().slice(-6)}`,
        source_warehouse_id: payload.source_warehouse_id,
        destination_warehouse_id: payload.destination_warehouse_id,
        transferred_by: userId,
        notes: payload.notes || null,
      });

      for (const item of payload.items) {
        const transferItemId = uuidv7();
        
        // 2. Insert item record
        await tx.insert(stockTransferItemsTable).values({
          id: transferItemId,
          transfer_id: transferId,
          product_id: item.product_id,
          quantity: item.quantity,
        });

        // 3. Deduct from source warehouse
        const sourceBal = await tx.select().from(inventoryBalancesTable)
          .where(and(
            eq(inventoryBalancesTable.warehouse_id, payload.source_warehouse_id),
            eq(inventoryBalancesTable.product_id, item.product_id)
          ));
          
        if (!sourceBal.length || sourceBal[0].quantity < item.quantity) {
          throw new Error(`Insufficient quantity for product ${item.product_id} in source warehouse`);
        }
        
        await tx.update(inventoryBalancesTable)
          .set({ quantity: sourceBal[0].quantity - item.quantity })
          .where(and(
            eq(inventoryBalancesTable.warehouse_id, payload.source_warehouse_id),
            eq(inventoryBalancesTable.product_id, item.product_id)
          ));

        // 4. Add to destination warehouse
        const destBal = await tx.select().from(inventoryBalancesTable)
          .where(and(
            eq(inventoryBalancesTable.warehouse_id, payload.destination_warehouse_id),
            eq(inventoryBalancesTable.product_id, item.product_id)
          ));
          
        if (destBal.length) {
          await tx.update(inventoryBalancesTable)
            .set({ quantity: destBal[0].quantity + item.quantity })
            .where(and(
              eq(inventoryBalancesTable.warehouse_id, payload.destination_warehouse_id),
              eq(inventoryBalancesTable.product_id, item.product_id)
            ));
        } else {
          await tx.insert(inventoryBalancesTable).values({
            warehouse_id: payload.destination_warehouse_id,
            product_id: item.product_id,
            quantity: item.quantity,
            avg_cost: sourceBal[0].avg_cost, // preserve avg cost
          });
        }

        // 5. Transfer serial numbers if provided
        if (item.serial_ids && item.serial_ids.length > 0) {
          if (item.serial_ids.length !== item.quantity) {
            throw new Error(`Mismatched serial count for product ${item.product_id}`);
          }
          
          for (const serialId of item.serial_ids) {
            await tx.insert(stockTransferSerialsTable).values({
              id: uuidv7(),
              transfer_item_id: transferItemId,
              serial_id: serialId
            });
            
            // Move serial to new warehouse
            await tx.update(serialItemsTable)
              .set({ warehouse_id: payload.destination_warehouse_id })
              .where(eq(serialItemsTable.id, serialId));
          }
        }
      }
    });

    return { id: transferId };
  }
}
