import { Router } from "express";
import { db } from "../../db";
import { quotationsTable, quotationItemsTable } from "./quotations.schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../../middlewares/jwt.middleware";
import { requireBranchScope } from "../../middlewares/branch.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { StatusCodes } from "http-status-codes";
import { v7 as uuidv7 } from "uuid";

export const quotationsRouter = Router();

// Both auth + branch scope required on all routes
quotationsRouter.use(requireAuth);
quotationsRouter.use(requireBranchScope);

// Get all quotations
quotationsRouter.get("/", requirePermission("sales:read"), async (req, res) => {
  try {
    const branchId = (req as any).branchId;
    if (!branchId) return res.status(StatusCodes.BAD_REQUEST).json({ error: "No branch context" });

    const quotations = await db.query.quotationsTable.findMany({
      where: eq(quotationsTable.branch_id, branchId),
      with: {
        customer: true,
        creator: true,
      },
      orderBy: [desc(quotationsTable.created_at)],
    });

    res.json({ data: quotations });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch quotations" });
  }
});

// Create a quotation
quotationsRouter.post("/", requirePermission("sales:create"), async (req, res) => {
  try {
    const branchId = (req as any).branchId;
    const userId = (req as any).user?.id;
    if (!branchId || !userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Unauthorized" });

    const { customer_id, subtotal, manual_discount, tax_amount, tax_details, total, items } = req.body;

    // Generate ID upfront — uuidv7Type has no MySQL default, must be explicit
    const quotationId = uuidv7();

    let createdRef = "";
    await db.transaction(async (tx) => {
      // Generate sequential reference number
      const { getNextSequence } = await import("../../lib/sequence-generator");
      createdRef = await getNextSequence(tx, branchId, "QUOTATION");

      // 1. Insert quotation with explicit ID
      await tx.insert(quotationsTable).values({
        id: quotationId,
        reference_number: createdRef,
        branch_id: branchId,
        customer_id: customer_id || null,
        created_by: userId,
        subtotal: String(subtotal),
        manual_discount: String(manual_discount),
        tax_amount: String(tax_amount),
        tax_details: tax_details ? JSON.stringify(tax_details) : null,
        total: String(total),
      });

      // 2. Insert items each with an explicit ID
      if (items && items.length > 0) {
        const insertItems = items.map((item: any) => ({
          id: uuidv7(),
          quotation_id: quotationId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: String(item.unit_price),
          discount_amount: String(item.discount_amount || 0),
          discount_type: item.discount_type || null,
          line_total: String(item.line_total),
        }));
        await tx.insert(quotationItemsTable).values(insertItems);
      }
    });

    res.status(StatusCodes.CREATED).json({ success: true, id: quotationId, reference_number: createdRef });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create quotation" });
  }
});

// Get a single quotation by ID
quotationsRouter.get("/:id", requirePermission("sales:read"), async (req, res) => {
  try {
    const branchId = (req as any).branchId;
    const { id } = req.params;
    
    if (!branchId) return res.status(StatusCodes.BAD_REQUEST).json({ error: "No branch context" });

    const quotation = await db.query.quotationsTable.findFirst({
      where: eq(quotationsTable.id, id),
      with: {
        customer: true,
        creator: true,
        items: {
          with: {
            product: true
          }
        }
      }
    });

    if (!quotation) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Quotation not found" });
    }

    if (quotation.branch_id !== branchId) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied" });
    }

    res.json({ success: true, data: quotation });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch quotation" });
  }
});

// Delete a quotation
quotationsRouter.delete("/:id", requirePermission("sales:update"), async (req, res) => {
  try {
    const branchId = (req as any).branchId;
    const { id } = req.params;

    if (!branchId) return res.status(StatusCodes.BAD_REQUEST).json({ error: "No branch context" });

    // Verify it exists and belongs to branch
    const quotation = await db.query.quotationsTable.findFirst({
      where: eq(quotationsTable.id, id)
    });

    if (!quotation) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Quotation not found" });
    }

    if (quotation.branch_id !== branchId) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied" });
    }

    await db.transaction(async (tx) => {
      // Delete items first
      await tx.delete(quotationItemsTable).where(eq(quotationItemsTable.quotation_id, id));
      // Delete quotation
      await tx.delete(quotationsTable).where(eq(quotationsTable.id, id));
    });

    res.json({ success: true, message: "Quotation deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to delete quotation" });
  }
});
