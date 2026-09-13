import type { Request, Response, NextFunction } from "express";
import { DashboardService } from "./dashboard.service";

export const getDashboardSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    if (!branchId) {
      res.status(400).json({ success: false, message: "Branch ID required" });
      return;
    }

    const summary = await DashboardService.getSummary(branchId);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};
