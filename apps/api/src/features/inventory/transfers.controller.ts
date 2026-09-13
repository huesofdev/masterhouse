import type { Request, Response, NextFunction } from "express";
import { TransfersService } from "./transfers.service";

export const listTransfers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;

    const result = await TransfersService.listTransfers(page, limit);
    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    next(error);
  }
};

export const getTransfer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const result = await TransfersService.getTransfer(id);
    if (!result) {
      res.status(404).json({ success: false, message: "Transfer not found" });
      return;
    }
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const createTransfer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.id; // Assumes auth middleware sets this
    
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const result = await TransfersService.createTransfer(req.body, userId);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
