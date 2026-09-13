import type { Request, Response, NextFunction } from "express";
import { RoutesService } from "./routes.service";
import { createRouteSchema, updateRouteSchema } from "./routes.types";

export const createRoute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const payload = createRouteSchema.parse(req.body);
    const route = await RoutesService.createRoute(branchId, payload);
    res.status(201).json({ success: true, data: route });
  } catch (error) { next(error); }
};

export const getRoute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const route = await RoutesService.getRoute(req.params.id as string);
    if (!route) { res.status(404).json({ success: false, message: "Route not found" }); return; }
    res.status(200).json({ success: true, data: route });
  } catch (error) { next(error); }
};

export const listRoutes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const routes = await RoutesService.listRoutes(branchId);
    res.status(200).json({ success: true, data: routes });
  } catch (error) { next(error); }
};

export const updateRoute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = updateRouteSchema.parse(req.body);
    const route = await RoutesService.updateRoute(req.params.id as string, payload);
    if (!route) { res.status(404).json({ success: false, message: "Route not found" }); return; }
    res.status(200).json({ success: true, data: route });
  } catch (error) { next(error); }
};

export const deleteRoute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deleted = await RoutesService.deleteRoute(req.params.id as string);
    if (!deleted) { res.status(404).json({ success: false, message: "Route not found" }); return; }
    res.status(200).json({ success: true, message: "Route deleted successfully" });
  } catch (error) { next(error); }
};
