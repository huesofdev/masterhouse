import type { Request, Response, NextFunction } from "express";
import { createPreOrderSchema } from "./orders.types";
import { OrdersService } from "./orders.service";
import { SyncService } from "../sync/sync.service";

export const createPreOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = createPreOrderSchema.parse(req.body);
    const branchId = (req as any).branchId;
    const userId = (req as any).user?.id;

    if (!branchId || !userId) {
      res.status(400).json({ success: false, message: "Missing context" });
      return;
    }

    const id = await OrdersService.createPreOrder(payload, branchId, userId);
    res.status(201).json({ success: true, data: { id } });
  } catch (error: any) {
    const branchId = (req as any).branchId || (req as any).user?.branch_id;
    const userId = (req as any).user?.id;
    
    // Log EVERY error as a conflict for offline sync auditing
    await SyncService.logConflict(branchId, userId, error, req.body, "CREATE_PRE_ORDER");
    
    // Return a 400/409 status code so the mobile app moves it to the DLQ (Dead Letter Queue)
    res.status(409).json({ 
      success: false, 
      conflict: true, 
      message: "Sync failed. Moved to Error Queue on device." 
    });
  }
};

export const listPreOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const routeId = req.query.routeId as string;
    const status = req.query.status as string;

    const orders = await OrdersService.listPreOrders(branchId, routeId, status);
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

export const deletePreOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const { id } = req.params;

    await OrdersService.deletePreOrder(id, branchId);
    res.status(200).json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    next(error);
  }
};
