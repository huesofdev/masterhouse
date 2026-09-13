import type { Request, Response, NextFunction } from "express";
import { SuppliersService } from "./suppliers.service";
import { createSupplierSchema, updateSupplierSchema, recordPaymentSchema } from "./suppliers.types";

export const listSuppliers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const search = (req.query.search as string) || (req.query.q as string) || '';
    const branchId = (req as any).branchId as string;

    const result = await SuppliersService.listSuppliers(branchId, page, limit, search);
    res.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) { next(error); }
};

export const createSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = createSupplierSchema.parse(req.body);
    const branchId = (req as any).branchId as string;
    const userId = (req as any).user.id as string;
    const supplier = await SuppliersService.createSupplier(payload, branchId, userId);
    res.status(201).json({ success: true, data: supplier });
  } catch (error) { next(error); }
};

export const getSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId as string;
    const supplier = await SuppliersService.getSupplier(req.params.id, branchId);
    if (!supplier) { res.status(404).json({ success: false, message: "Supplier not found" }); return; }
    res.json({ success: true, data: supplier });
  } catch (error) { next(error); }
};

export const updateSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = updateSupplierSchema.parse(req.body);
    const branchId = (req as any).branchId as string;
    const supplier = await SuppliersService.updateSupplier(req.params.id, payload, branchId);
    if (!supplier) { res.status(404).json({ success: false, message: "Supplier not found" }); return; }
    res.json({ success: true, data: supplier });
  } catch (error) { next(error); }
};

export const deleteSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deleted = await SuppliersService.deleteSupplier(req.params.id);
    if (!deleted) { res.status(404).json({ success: false, message: "Supplier not found" }); return; }
    res.json({ success: true, message: "Supplier deleted" });
  } catch (error) { next(error); }
};

export const recordPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = recordPaymentSchema.parse(req.body);
    const branchId = (req as any).branchId as string;
    const userId = (req as any).user.id as string;
    
    const result = await SuppliersService.recordPayment(req.params.id, branchId, payload, userId);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const setOpeningBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const amount = Number(req.body.amount);
    if (isNaN(amount) || amount <= 0) {
      res.status(400).json({ message: "Invalid amount" });
      return;
    }
    const branchId = (req as any).branchId as string;
    const userId = (req as any).user.id as string;
    
    const result = await SuppliersService.setOpeningBalance(req.params.id, branchId, amount, userId);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const getSupplierLedger = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const branchId = (req as any).branchId as string;

    const result = await SuppliersService.getSupplierLedger(req.params.id, branchId, page, limit);
    res.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) { next(error); }
};

export const migrateSupplierLinks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await SuppliersService.migrateIntakeSupplierLinks();
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
};
