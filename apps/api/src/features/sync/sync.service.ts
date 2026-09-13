import { eq, and } from "drizzle-orm";
import { db } from "../../db";
import { syncConflictsTable } from "./sync.schema";
import { SyncConflictResponse, ResolveConflictPayload } from "./sync.types";
import { CollectionsService } from "../collections/collections.service";
import { CreateReceiptPayload } from "../collections/collections.types";
import { v7 as uuidv7 } from "uuid";
import { SalesService } from "../sale/sales.service";
import { CreateSalePayload } from "../sale/sales.types";
import { OrdersService } from "../orders/orders.service";
import { CreatePreOrderPayload } from "../orders/orders.types";
export class SyncService {
  // Offline Sync Engine handling a queue of events
  static async processMobilePayload(branchId: string, userId: string, events: any[]) {
    const results = [];

    for (const event of events) {
      try {
        if (event.type === "RECEIPT") {
          const payload = event.payload as CreateReceiptPayload;
          const receiptId = await CollectionsService.processCollectionReceipt(payload, userId, branchId);
          results.push({ id: event.id || payload.id || receiptId, status: "SUCCESS" });
        } else if (event.type === "CREATE_SALE" || event.type === "SALE") {
          const payload = event.payload as CreateSalePayload;
          const saleId = await SalesService.createSale(payload, branchId, userId);
          results.push({ id: event.id || payload.id || saleId, status: "SUCCESS" });
        } else if (event.type === "CREATE_PRE_ORDER") {
          const payload = event.payload as CreatePreOrderPayload;
          const preOrderId = await OrdersService.createPreOrder(payload, branchId, userId);
          results.push({ id: event.id || payload.id || preOrderId, status: "SUCCESS" });
        } else {
          throw new Error("Unknown event type: " + event.type);
        }
      } catch (error: any) {
        // Log to sync_conflicts but DON'T break the loop
        let errorType: "DOUBLE_SALE" | "PHANTOM_STOCK" | "OVER_COLLECTION" | "OTHER" = "OTHER";

        if (error.message?.includes("already sold")) errorType = "DOUBLE_SALE";
        if (error.message?.includes("out of stock")) errorType = "PHANTOM_STOCK";

        await db.insert(syncConflictsTable).values({
          id: uuidv7(),
          branch_id: branchId,
          user_id: userId,
          error_type: errorType,
          error_message: error.message || "Unknown error",
          raw_payload: event,
          status: "PENDING",
        });

        results.push({ id: event.id, status: "CONFLICT", error: error.message });
      }
    }

    return results;
  }

  static async logConflict(branchId: string, userId: string, error: any, payload: any, type: string) {
    let errorType: "DOUBLE_SALE" | "PHANTOM_STOCK" | "OVER_COLLECTION" | "OTHER" = "OTHER";

    if (error.message?.includes("already sold")) errorType = "DOUBLE_SALE";
    if (error.message?.includes("out of stock")) errorType = "PHANTOM_STOCK";
    if (error.message?.includes("exceeds")) errorType = "OVER_COLLECTION";

    const payloadId = payload.idempotency_key || payload.idempotencyKey || payload.id;
    if (payloadId) {
      const { sql } = require("drizzle-orm");
      const existing = await db.select({ id: syncConflictsTable.id })
        .from(syncConflictsTable)
        .where(
          and(
            eq(syncConflictsTable.branch_id, branchId),
            sql`${syncConflictsTable.raw_payload}->>'$.id' = ${payloadId}`
          )
        ).limit(1);

      if (existing.length > 0) {
        // Conflict already logged, return silently
        return;
      }
    }

    await db.insert(syncConflictsTable).values({
      id: uuidv7(),
      branch_id: branchId,
      user_id: userId,
      error_type: errorType,
      error_message: error.message || "Unknown error",
      raw_payload: { type, payload, id: payloadId },
      status: "PENDING",
    });
  }

  static async listPendingConflicts(branchId: string): Promise<SyncConflictResponse[]> {
    const conflicts = await db.select().from(syncConflictsTable).where(
      and(
        eq(syncConflictsTable.branch_id, branchId),
        eq(syncConflictsTable.status, "PENDING")
      )
    );
    return conflicts;
  }

  static async getConflict(id: string, branchId: string): Promise<SyncConflictResponse | null> {
    const results = await db.select().from(syncConflictsTable).where(
      and(
        eq(syncConflictsTable.id, id),
        eq(syncConflictsTable.branch_id, branchId)
      )
    ).limit(1);

    return results[0] || null;
  }

  static async discardConflict(id: string, branchId: string): Promise<boolean> {
    const result = await db.update(syncConflictsTable)
      .set({ status: "DISCARDED", resolved_at: new Date() })
      .where(
        and(
          eq(syncConflictsTable.id, id),
          eq(syncConflictsTable.branch_id, branchId),
          eq(syncConflictsTable.status, "PENDING")
        )
      );

    return result[0].affectedRows > 0;
  }

  static async resolveConflict(id: string, branchId: string, payload: ResolveConflictPayload): Promise<boolean> {
    const conflict = await this.getConflict(id, branchId);
    if (!conflict || conflict.status !== "PENDING") return false;

    // TODO: The actual core logic to pass `payload.corrected_payload` back into the Sync engine
    // For example: await MobileSyncEngine.processPayload(payload.corrected_payload);
    // If that throws an error, we do not mark as resolved, we throw the error back to the UI.

    // Assuming the re-processing succeeded:
    const result = await db.update(syncConflictsTable)
      .set({ status: "RESOLVED", resolved_at: new Date() })
      .where(eq(syncConflictsTable.id, id));

    return result[0].affectedRows > 0;
  }
}
