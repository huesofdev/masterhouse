import type { Request, Response, NextFunction } from "express";
import { WarehousesService } from "./warehouses.service";
import { createWarehouseSchema, updateWarehouseSchema } from "./warehouses.types";

export const createWarehouse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId; // from requireBranchScope middleware
    const payload = createWarehouseSchema.parse(req.body);
    const warehouse = await WarehousesService.createWarehouse(branchId, payload);
    res.status(201).json({ success: true, data: warehouse });
  } catch (error) { next(error); }
};

export const getWarehouse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const warehouse = await WarehousesService.getWarehouse(req.params.id as string);
    if (!warehouse) { res.status(404).json({ success: false, message: "Warehouse not found" }); return; }
    res.status(200).json({ success: true, data: warehouse });
  } catch (error) { next(error); }
};

export const listWarehouses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const warehouses = await WarehousesService.listWarehouses(branchId);
    res.status(200).json({ success: true, data: warehouses });
  } catch (error) { next(error); }
};

export const listAllWarehouses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const warehouses = await WarehousesService.listAllWarehouses(userId);
    res.status(200).json({ success: true, data: warehouses });
  } catch (error) { next(error); }
};

export const updateWarehouse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const payload = updateWarehouseSchema.parse(req.body);
    const warehouse = await WarehousesService.updateWarehouse(req.params.id as string, branchId, payload);
    if (!warehouse) { res.status(404).json({ success: false, message: "Warehouse not found" }); return; }
    res.status(200).json({ success: true, data: warehouse });
  } catch (error) { next(error); }
};

export const deleteWarehouse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deleted = await WarehousesService.deleteWarehouse(req.params.id as string);
    if (!deleted) { res.status(404).json({ success: false, message: "Warehouse not found" }); return; }
    res.status(200).json({ success: true, message: "Warehouse deleted successfully" });
  } catch (error) { next(error); }
};
