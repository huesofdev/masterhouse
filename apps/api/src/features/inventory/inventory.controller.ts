import { Request, Response, NextFunction } from "express";
import { InventoryService } from "./inventory.service";
import { createIntakeSchema } from "./inventory.types";
import { ZodError } from "zod";
import { SalesService } from "../sale/sales.service";

export const processIntake = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = createIntakeSchema.parse(req.body);
    // user ID comes from JWT middleware
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = await InventoryService.processIntake(payload, userId);
    res.status(201).json({ message: "Intake processed successfully", data: result });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    if (error instanceof Error && error.message.includes('already exist')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const getIntakeOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchId = req.headers["x-branch-id"] as string;
    if (!branchId) {
      return res.status(400).json({ message: "Branch ID required in headers" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const search = (req.query.search as string) || '';

    const result = await InventoryService.getIntakeOrders(branchId, page, limit, search);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getInventoryBalances = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const warehouseId = req.params.warehouseId;
    if (!warehouseId) {
      return res.status(400).json({ message: "Warehouse ID required" });
    }
    const data = await InventoryService.getInventoryBalances(warehouseId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const getIntakeById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await InventoryService.getIntakeOrderById(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, message: "Intake order not found" });
    }
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const deleteIntakeOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    await InventoryService.deleteIntake(req.params.id, userId);
    res.json({ success: true, message: "Intake deleted successfully" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAvailableSerials = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const productId = req.params.productId as string;
    const warehouseId = req.query.warehouseId as string | undefined;
    const serials = await SalesService.getAvailableSerials(productId, branchId, warehouseId);
    res.status(200).json({ success: true, data: serials });
  } catch (error) {
    next(error);
  }
};

// --- BULK OPERATIONS ---
export const getBulkTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const buffer = await InventoryService.generateBulkTemplate();
    res.setHeader("Content-Disposition", 'attachment; filename="Intake_Bulk_Template.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (error) { next(error); }
};

export const bulkUploadIntake = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ success: false, message: "Excel file is required" });
      return;
    }
    const result = await InventoryService.bulkUploadIntake(req.file.buffer, userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const lookupBarcodeData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { serials, skus } = req.body || {};
    const data = await InventoryService.lookupBarcodeData({ serials, skus });
    res.status(200).json({ success: true, data });
  } catch (error) { next(error); }
};
