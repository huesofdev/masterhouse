import { Router } from "express";
import { db } from "../../db";
import { fixedAssetsTable, fixedAssetCategoriesTable } from "./assets.schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../../middlewares/jwt.middleware";
import { requireBranchScope } from "../../middlewares/branch.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { StatusCodes } from "http-status-codes";
import { v7 as uuidv7 } from "uuid";

export const assetsRouter = Router();

// Auth required
assetsRouter.use(requireAuth);

// ==========================================
// CATEGORIES (Not branch scoped)
// ==========================================
assetsRouter.get("/categories", requirePermission("assets:read"), async (req, res) => {
  try {
    const categories = await db.query.fixedAssetCategoriesTable.findMany({
      where: eq(fixedAssetCategoriesTable.is_active, true),
      orderBy: [desc(fixedAssetCategoriesTable.created_at)]
    });
    res.json({ data: categories });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch categories" });
  }
});

assetsRouter.post("/categories", requirePermission("assets:create"), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(StatusCodes.BAD_REQUEST).json({ error: "Name is required" });

    const id = uuidv7();
    await db.insert(fixedAssetCategoriesTable).values({
      id,
      name,
    });

    res.status(StatusCodes.CREATED).json({ success: true, id });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create category" });
  }
});

assetsRouter.delete("/categories/:id", requirePermission("assets:delete"), async (req, res) => {
  try {
    const { id } = req.params;
    await db.update(fixedAssetCategoriesTable)
      .set({ is_active: false })
      .where(eq(fixedAssetCategoriesTable.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to delete category" });
  }
});

// ==========================================
// ASSETS (Branch scoped)
// ==========================================
assetsRouter.use(requireBranchScope);

assetsRouter.get("/", requirePermission("assets:read"), async (req, res) => {
  try {
    const branchId = (req as any).branchId;
    if (!branchId) return res.status(StatusCodes.BAD_REQUEST).json({ error: "Branch context required" });

    const assets = await db.query.fixedAssetsTable.findMany({
      where: eq(fixedAssetsTable.branch_id, branchId),
      with: {
        category: true,
        warehouse: true,
        custodian: true
      },
      orderBy: [desc(fixedAssetsTable.created_at)]
    });

    res.json({ data: assets });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch fixed assets" });
  }
});

assetsRouter.post("/", requirePermission("assets:create"), async (req, res) => {
  try {
    const branchId = (req as any).branchId;
    if (!branchId) return res.status(StatusCodes.BAD_REQUEST).json({ error: "Branch context required" });

    const { 
      asset_code, name, category_id, warehouse_id, assigned_to, 
      status, purchase_date, purchase_price, supplier, warranty_expiry, notes 
    } = req.body;

    const id = uuidv7();
    await db.insert(fixedAssetsTable).values({
      id,
      asset_code,
      name,
      category_id,
      branch_id: branchId,
      warehouse_id: warehouse_id || null,
      assigned_to: assigned_to || null,
      status: status || 'ACTIVE',
      purchase_date: purchase_date || null,
      purchase_price: purchase_price ? String(purchase_price) : null,
      supplier: supplier || null,
      warranty_expiry: warranty_expiry || null,
      notes: notes || null
    });

    res.status(StatusCodes.CREATED).json({ success: true, id });
  } catch (error: any) {
    console.error(error);
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(StatusCodes.CONFLICT).json({ error: "Asset code already exists" });
    }
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create fixed asset" });
  }
});

assetsRouter.put("/:id", requirePermission("assets:update"), async (req, res) => {
  try {
    const branchId = (req as any).branchId;
    const { id } = req.params;
    
    // Ensure asset belongs to branch
    const existing = await db.query.fixedAssetsTable.findFirst({
      where: eq(fixedAssetsTable.id, id)
    });
    
    if (!existing) return res.status(StatusCodes.NOT_FOUND).json({ error: "Asset not found" });
    if (existing.branch_id !== branchId) return res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied" });

    const { 
      name, category_id, warehouse_id, assigned_to, 
      status, purchase_date, purchase_price, supplier, warranty_expiry, notes 
    } = req.body;

    await db.update(fixedAssetsTable).set({
      name,
      category_id,
      warehouse_id: warehouse_id || null,
      assigned_to: assigned_to || null,
      status,
      purchase_date: purchase_date || null,
      purchase_price: purchase_price ? String(purchase_price) : null,
      supplier: supplier || null,
      warranty_expiry: warranty_expiry || null,
      notes: notes || null
    }).where(eq(fixedAssetsTable.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to update fixed asset" });
  }
});

assetsRouter.delete("/:id", requirePermission("assets:delete"), async (req, res) => {
  try {
    const branchId = (req as any).branchId;
    const { id } = req.params;

    const existing = await db.query.fixedAssetsTable.findFirst({
      where: eq(fixedAssetsTable.id, id)
    });
    
    if (!existing) return res.status(StatusCodes.NOT_FOUND).json({ error: "Asset not found" });
    if (existing.branch_id !== branchId) return res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied" });

    await db.delete(fixedAssetsTable).where(eq(fixedAssetsTable.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to delete fixed asset" });
  }
});
