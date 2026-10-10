import type { Request, Response, NextFunction } from "express";
import { CustomersService } from "./customers.service";
import { SyncService } from "../sync/sync.service";

export const searchCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const query = req.query.q as string;

    if (!branchId || !query) {
      res.status(400).json({ success: false, message: "Missing branch context or search query" });
      return;
    }

    const customers = await CustomersService.searchCustomers(query, branchId);
    res.status(200).json({ success: true, data: customers });
  } catch (error) {
    next(error);
  }
};

export const listCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const search = (req.query.search as string) || (req.query.q as string) || '';
    const routeId = (req.query.route_id as string) || undefined;
    const activeStatus = (req.query.activeStatus as string) || 'ALL';
    const contractCount = (req.query.contractCount as string) || (req.query.contract_count as string) || undefined;

    const result = await CustomersService.listCustomers(branchId, page, limit, search, routeId, activeStatus, contractCount);
    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const branchId = (req as any).branchId;
  const userId = (req as any).userId || (req as any).user?.id;

  try {
    // Fix: Ensure route_id and area_id are strictly null if empty string is sent
    const payload = { ...req.body };
    if (payload.route_id === "") {
      payload.route_id = null;
    }
    if (payload.area_id === "") {
      payload.area_id = null;
    }

    if (!payload.full_name || !payload.mobile || !payload.address) {
      throw new Error("Missing required customer fields (full_name, mobile, address).");
    }

    const id = await CustomersService.createCustomer(branchId, payload);
    res.status(201).json({ success: true, data: { id } });
  } catch (error: any) {
    const isValidationError = 
      error.message?.includes("already exists") ||
      error.message?.includes("Missing required") ||
      error.code === "ER_NO_REFERENCED_ROW" ||
      error.code === "ER_NO_REFERENCED_ROW_2" ||
      error.code === "ER_DATA_TOO_LONG" ||
      error.code === "ER_BAD_NULL_ERROR" ||
      error.code === "ER_DUP_ENTRY" ||
      error.name === "ZodError" ||
      error.issues;

    if (isValidationError) {
      try {
        if (branchId) {
          await SyncService.logConflict(branchId, userId || "system", error, req.body, "CREATE_CUSTOMER");
        }
      } catch (logErr) {
        console.warn("[SyncConflict] Failed to auto-log customer conflict:", logErr);
      }

      res.status(200).json({ 
        success: true, 
        conflict: true, 
        message: error.message || "Customer creation validation failed and conflict logged for review." 
      });
      return;
    }

    next(error);
  }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    const payload = { ...req.body };
    if (payload.route_id === "") {
      payload.route_id = null;
    }
    
    await CustomersService.updateCustomer(id, payload);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const uploadNic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { side } = req.body; // 'front' or 'back'
    
    if (!req.file || !side) {
      res.status(400).json({ success: false, message: "File and side parameter required" });
      return;
    }

    const key = await CustomersService.uploadNic(id, side as "front" | "back", req.file.buffer);
    res.status(200).json({ success: true, data: { key } });
  } catch (error) {
    next(error);
  }
};

export const getNicUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, side } = req.params; // side = 'front' or 'back'
    const url = await CustomersService.getNicSignedUrl(id, side as "front" | "back");
    
    if (!url) {
      res.status(404).json({ success: false, message: "NIC not found" });
      return;
    }
    
    res.status(200).json({ success: true, data: { url } });
  } catch (error) {
    next(error);
  }
};

export const getCustomerDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const branchId = (req as any).branchId;
    const data = await CustomersService.getCustomerDetails(id, branchId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const exportCustomerDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const branchId = (req as any).branchId;
    
    const buffer = await CustomersService.exportCustomerDetails(id, branchId);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Customer_Profile_${id}.xlsx`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};
export const updateCustomerRating = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { rating, override } = req.body;

    if (rating === undefined || typeof rating !== 'number' || rating < 1 || rating > 5) {
      res.status(400).json({ success: false, message: 'Rating must be a number between 1 and 5' });
      return;
    }

    await CustomersService.updateCustomerRating(id, rating, override === true);
    res.status(200).json({ success: true, message: 'Rating updated' });
  } catch (error) {
    next(error);
  }
};

export const resetCustomerRatingOverride = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await CustomersService.resetCustomerRatingOverride(id);
    res.status(200).json({ success: true, message: 'Rating reset to auto' });
  } catch (error) {
    next(error);
  }
};
