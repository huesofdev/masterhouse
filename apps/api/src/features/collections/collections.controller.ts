import type { Request, Response, NextFunction } from "express";
import { createAdjustmentSchema, createSchemeSchema, updateSchemeSchema, createReceiptSchema, createAttemptSchema } from "./collections.types";
import { CollectionsService } from "./collections.service";
import { SyncService } from "../sync/sync.service";

export const createAdjustment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const contractId = req.params.id as string;
    const userId = (req as any).user.id;
    const payload = createAdjustmentSchema.parse(req.body);

    await CollectionsService.createAdjustment(contractId, payload, userId);
    
    res.status(201).json({ success: true, message: "Adjustment applied successfully" });
  } catch (error: any) {
    if (error.message === "Contract not found or not active") {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    if (error.message === "Adjustment causes negative balance") {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
  }
};

export const freezeContract = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const contractId = req.params.id as string;
    const success = await CollectionsService.freezeContract(contractId);
    
    if (!success) {
      res.status(400).json({ success: false, message: "Could not freeze contract. It may not exist or is not active." });
      return;
    }
    
    res.status(200).json({ success: true, message: "Contract frozen successfully. No late fees will be applied." });
  } catch (error) {
    next(error);
  }
};

export const resumeContract = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const contractId = req.params.id as string;
    await CollectionsService.resumeContract(contractId);
    
    res.status(200).json({ success: true, message: "Contract resumed. Installment schedules have been adjusted forward." });
  } catch (error: any) {
    if (error.message === "Contract is not suspended") {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const createScheme = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = createSchemeSchema.parse(req.body);
    const id = await CollectionsService.createScheme(payload);
    res.status(201).json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
};

export const listSchemes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId || (req as any).user?.branch_id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const search = (req.query.search as string) || (req.query.q as string) || '';

    const result = await CollectionsService.listSchemes(branchId, page, limit, search);
    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    next(error);
  }
};

export const updateScheme = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schemeId = req.params.id as string;
    const payload = updateSchemeSchema.parse(req.body);
    
    const success = await CollectionsService.updateScheme(schemeId, payload);
    if (!success) {
      res.status(404).json({ success: false, message: "Scheme not found" });
      return;
    }
    
    res.status(200).json({ success: true, message: "Scheme updated successfully" });
  } catch (error) {
    next(error);
  }
};

export const createReceipt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = createReceiptSchema.parse(req.body);
    const userId = (req as any).user.id;
    const branchId = (req as any).branchId || (req as any).user?.branch_id;

    const receiptId = await CollectionsService.processCollectionReceipt(payload, userId, branchId);
    const printData = await CollectionsService.getReceiptPrintDetails(receiptId);
    
    res.status(201).json({ 
      success: true, 
      data: { id: receiptId, print_data: printData }, 
      message: "Payment collected successfully" 
    });
  } catch (error) {
    next(error);
  }
};

export const syncReceipt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = createReceiptSchema.parse(req.body);
    const userId = (req as any).user.id;
    const branchId = (req as any).branchId || (req as any).user?.branch_id;

    const receiptId = await CollectionsService.processCollectionReceipt(payload, userId, branchId);
    const printData = await CollectionsService.getReceiptPrintDetails(receiptId);
    
    res.status(201).json({ 
      success: true, 
      data: { id: receiptId, print_data: printData }, 
      message: "Payment collected successfully" 
    });
  } catch (error: any) {
    const branchId = (req as any).branchId || (req as any).user?.branch_id;
    const userId = (req as any).user?.id;
    
    // Log EVERY error as a conflict for offline sync auditing
    await SyncService.logConflict(branchId, userId, error, req.body, "RECEIPT");
    
    // Return a 400/409 status code so the mobile app moves it to the DLQ (Dead Letter Queue)
    // DO NOT return 200/202, otherwise the mobile app will think it succeeded and delete the data!
    res.status(409).json({ 
      success: false, 
      conflict: true, 
      message: "Sync failed. Moved to Error Queue on device." 
    });
  }
};

export const listSchedules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter = (req.query.filter as 'overdue' | 'today' | 'upcoming') || 'today';
    const branchId = (req as any).branchId || (req as any).user?.branch_id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const search = (req.query.search as string) || (req.query.q as string) || '';
    
    // Advanced Filters
    const routeId = req.query.routeId as string | undefined;
    const areaId = req.query.areaId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const status = req.query.status as string | undefined;
    
    const result = await CollectionsService.getSchedulesToCollect(filter, branchId, page, limit, search, routeId, areaId, startDate, endDate, status);
    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    next(error);
  }
};

export const printReceipt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const receiptId = req.params.id as string;
    const printData = await CollectionsService.getReceiptPrintDetails(receiptId);
    res.status(200).json({ success: true, data: printData });
  } catch (error: any) {
    if (error.message === "Receipt not found") {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const logAttempt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = createAttemptSchema.parse(req.body);
    const userId = (req as any).user.id;

    const attemptId = await CollectionsService.processCollectionAttempt(payload, userId);
    
    res.status(201).json({ 
      success: true, 
      data: { id: attemptId }, 
      message: "Attempt logged successfully" 
    });
  } catch (error) {
    next(error);
  }
};

export const getContractHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const contractId = req.params.id as string;
    const history = await CollectionsService.getContractHistory(contractId);
    
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

export const getScheduleCounts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId || (req as any).user?.branch_id;
    const routeId = req.query.routeId as string | undefined;
    const areaId = req.query.areaId as string | undefined;
    const counts = await CollectionsService.getScheduleCounts(branchId, routeId, areaId);
    res.status(200).json({ success: true, data: counts });
  } catch (error) {
    next(error);
  }
};

export const getMapData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId || (req as any).user?.branch_id;
    const filters = {
      from: req.query.from as string,
      to: req.query.to as string,
      trip_id: req.query.trip_id as string
    };
    
    const mapData = await CollectionsService.getMapData(branchId, filters);
    res.status(200).json({ success: true, data: mapData });
  } catch (error) {
    next(error);
  }
};
