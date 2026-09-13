import type { Request, Response, NextFunction } from "express";
import { ServiceEngine } from "./service.service";
import { processReturnSchema, createWarrantyClaimSchema, updateWarrantyStatusSchema, closeWarrantyClaimSchema } from "./service.types";

// ─── Returns ──────────────────────────────────────────────────────────────────

export const getSaleForReturn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const saleId = req.params.saleId;
    if (!saleId) { res.status(400).json({ success: false, message: "Sale ID required" }); return; }
    const sale = await ServiceEngine.getSaleWithItems(saleId);
    if (!sale) { res.status(404).json({ success: false, message: "Sale not found" }); return; }
    res.status(200).json({ success: true, data: sale });
  } catch (error) { next(error); }
};

export const listReturns = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const search = (req.query.search as string) || (req.query.q as string) || '';

    const result = await ServiceEngine.listReturns(branchId, page, limit, search);
    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  } catch (error) { next(error); }
};

export const processReturn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const branchId = (req as any).branchId;
    const payload = processReturnSchema.parse(req.body);
    const returnId = await ServiceEngine.processReturn(payload, userId, branchId);
    res.status(201).json({ success: true, data: { id: returnId }, message: "Return processed successfully" });
  } catch (error: any) {
    if (error.name === "ZodError") { res.status(400).json({ success: false, message: error.errors }); return; }
    next(error);
  }
};

// ─── Warranty Claims ──────────────────────────────────────────────────────────

export const listWarrantyClaims = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const search = (req.query.search as string) || (req.query.q as string) || '';

    const result = await ServiceEngine.listWarrantyClaims(branchId, status, page, limit, search);
    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  } catch (error) { next(error); }
};

export const createWarrantyClaim = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const payload = createWarrantyClaimSchema.parse(req.body);
    const claimId = await ServiceEngine.createWarrantyClaim(payload, userId);
    res.status(201).json({ success: true, data: { id: claimId }, message: "Warranty claim created" });
  } catch (error: any) {
    if (error.name === "ZodError") { res.status(400).json({ success: false, message: error.errors }); return; }
    next(error);
  }
};

export const updateWarrantyStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const claimId = req.params.id;
    const payload = updateWarrantyStatusSchema.parse(req.body);
    await ServiceEngine.updateWarrantyStatus(claimId, payload);
    res.status(200).json({ success: true, message: `Claim status updated to ${payload.status}` });
  } catch (error: any) {
    if (error.name === "ZodError") { res.status(400).json({ success: false, message: error.errors }); return; }
    next(error);
  }
};

export const closeWarrantyClaim = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const claimId = req.params.id;
    const payload = closeWarrantyClaimSchema.parse(req.body);
    await ServiceEngine.closeWarrantyClaim(claimId, payload);
    res.status(200).json({ success: true, message: "Warranty claim closed" });
  } catch (error: any) {
    if (error.message.includes("replacement_serial_id")) { res.status(400).json({ success: false, message: error.message }); return; }
    if (error.name === "ZodError") { res.status(400).json({ success: false, message: error.errors }); return; }
    next(error);
  }
};
