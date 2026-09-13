import type { Request, Response, NextFunction } from "express";
import { VehiclesService } from "./vehicles.service";
import { createVehicleSchema, updateVehicleSchema } from "./vehicles.types";

export const createVehicle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const payload = createVehicleSchema.parse(req.body);
    const vehicle = await VehiclesService.createVehicle(branchId, payload);
    res.status(201).json({ success: true, data: vehicle });
  } catch (error) { next(error); }
};

export const getVehicle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const vehicle = await VehiclesService.getVehicle(req.params.id as string);
    if (!vehicle) { res.status(404).json({ success: false, message: "Vehicle not found" }); return; }
    res.status(200).json({ success: true, data: vehicle });
  } catch (error) { next(error); }
};

export const listVehicles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const search = (req.query.search as string) || (req.query.q as string) || '';

    const result = await VehiclesService.listVehicles(branchId, page, limit, search);
    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  } catch (error) { next(error); }
};

export const updateVehicle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = updateVehicleSchema.parse(req.body);
    const vehicle = await VehiclesService.updateVehicle(req.params.id as string, payload);
    if (!vehicle) { res.status(404).json({ success: false, message: "Vehicle not found" }); return; }
    res.status(200).json({ success: true, data: vehicle });
  } catch (error) { next(error); }
};

export const deleteVehicle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deleted = await VehiclesService.deleteVehicle(req.params.id as string);
    if (!deleted) { res.status(404).json({ success: false, message: "Vehicle not found" }); return; }
    res.status(200).json({ success: true, message: "Vehicle deleted successfully" });
  } catch (error) { next(error); }
};
