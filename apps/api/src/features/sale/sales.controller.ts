import type { Request, Response, NextFunction } from "express";
import { createSaleSchema, updateSaleNotesSchema } from "./sales.types";
import { SalesService } from "./sales.service";
import { SyncService } from "../sync/sync.service";

export const listSales = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    if (!branchId) {
      res.status(400).json({ success: false, message: "Missing branch context" });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const search = (req.query.search as string) || (req.query.q as string) || '';
    
    // Advanced Filters
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const saleType = req.query.saleType as string | undefined;
    const paymentMode = req.query.paymentMode as string | undefined;
    const status = req.query.status as string | undefined;
    const source = req.query.source as string | undefined;
    const routeId = req.query.routeId as string | undefined;
    const userId = req.query.userId as string | undefined;

    const result = await SalesService.listSales(branchId, page, limit, search, startDate, endDate, saleType, paymentMode, status, source, routeId, userId);
    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    next(error);
  }
};

export const getSaleDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const saleId = req.params.id;
    if (!saleId) {
      res.status(400).json({ success: false, message: "Missing sale ID" });
      return;
    }
    const data = await SalesService.getSaleDetails(saleId);
    if (!data) {
      res.status(404).json({ success: false, message: "Sale not found" });
      return;
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};


export const posSearch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const query = req.query.q as string;

    if (!branchId || query === undefined) {
      res.status(400).json({ success: false, message: "Missing branch context or search query" });
      return;
    }

    const result = await SalesService.posSearch(query, branchId);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getAvailableSerials = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const productId = req.params.productId;

    if (!branchId || !productId) {
      res.status(400).json({ success: false, message: "Missing branch context or product ID" });
      return;
    }

    const serials = await SalesService.getAvailableSerials(productId, branchId);
    res.status(200).json({ success: true, data: serials });
  } catch (error) {
    next(error);
  }
};

export const createSale = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = createSaleSchema.parse(req.body);
    const branchId = (req as any).branchId;
    const userId = (req as any).user?.id;

    if (!branchId || !userId) {
      res.status(400).json({ success: false, message: "Missing branch context or user" });
      return;
    }

    const result = await SalesService.createSale(payload, branchId, userId);

    res.status(201).json({ success: true, message: "Sale created successfully", saleId: result.id, reference_number: result.reference_number });
  } catch (error: any) {
    next(error);
  }
};

export const syncSale = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Extract context early so it's available in the catch block even if Zod validation throws
  const branchId = (req as any).branchId;
  const userId = (req as any).user?.id;

  try {
    if (!branchId || !userId) {
      res.status(400).json({ success: false, message: "Missing branch context or user" });
      return;
    }

    const payload = createSaleSchema.parse(req.body);
    const result = await SalesService.createSale(payload, branchId, userId);
    
    res.status(201).json({ success: true, message: "Sale created successfully", saleId: result.id, reference_number: result.reference_number });
  } catch (error: any) {
    // Log ALL errors to sync_conflicts for admin review, even 500s or Zod errors
    try {
      if (branchId && userId) {
        await SyncService.logConflict(branchId, userId, error, req.body, "SALE");
      }
    } catch (logError) {
      console.error("Failed to log sync conflict:", logError);
    }

    // Determine appropriate 4xx status so mobile app marks it as 'failed' instead of retrying forever
    const isZodError = error.name === "ZodError" || error.issues;
    const statusCode = isZodError ? 400 : 409;
    
    res.status(statusCode).json({ 
      success: false, 
      conflict: true, 
      message: `Conflict logged for review: ${error.message || "Unknown error"}` 
    });
  }
};

export const voidSale = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const saleId = req.params.id;
    const branchId = (req as any).branchId;
    const userId = (req as any).user?.id;

    if (!saleId || !branchId || !userId) {
      res.status(400).json({ success: false, message: "Missing required parameters" });
      return;
    }

    await SalesService.voidSale(saleId, userId, branchId);
    res.status(200).json({ success: true, message: "Sale voided successfully" });
  } catch (error) {
    next(error);
  }
};

export const updateSaleNotes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const saleId = req.params.id;
    const payload = updateSaleNotesSchema.parse(req.body);

    if (!saleId) {
      res.status(400).json({ success: false, message: "Missing sale ID" });
      return;
    }

    await SalesService.updateSaleNotes(saleId, payload.notes || null);
    res.status(200).json({ success: true, message: "Sale notes updated successfully" });
  } catch (error) {
    next(error);
  }
};
