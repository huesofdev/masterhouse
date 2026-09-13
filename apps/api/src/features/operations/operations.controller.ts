import type { Request, Response, NextFunction } from "express";
import { createTripSchema, loadTripStockSchema, updateTripStatusSchema } from "./operations.types";
import { OperationsService } from "./operations.service";
import { UserService } from "../user/user.service";
import { RbacService } from "../rbac/rbac.service";

export const createTrip = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = createTripSchema.parse(req.body);
    
    const branchId = (req as any).branchId;
    const userId = (req as any).user?.id;

    if (!branchId || !userId) {
      res.status(400).json({ success: false, message: "Missing branch context or user" });
      return;
    }

    const trip = await OperationsService.createTrip(branchId, userId, payload);
    
    res.status(201).json({ success: true, data: trip });
  } catch (error: any) {
    next(error);
  }
};

export const listTrips = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    
    if (!branchId) {
      res.status(400).json({ success: false, message: "Missing branch context" });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const search = (req.query.search as string) || (req.query.q as string) || '';
    const assigned_to = req.query.assigned_to as string | undefined;
    const status = req.query.status as string | undefined;
    const exclude_status = req.query.exclude_status ? (req.query.exclude_status as string).split(',') : undefined;
    const route_id = req.query.route_id as string | undefined;

    const result = await OperationsService.listTrips(branchId, page, limit, search, assigned_to, exclude_status, status, route_id);
    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  } catch (error: any) {
    next(error);
  }
};

export const getTrip = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const trip = await OperationsService.getTrip(req.params.id as string);
    if (!trip) {
      res.status(404).json({ success: false, message: "Trip not found" });
      return;
    }
    res.status(200).json({ success: true, data: trip });
  } catch (error: any) {
    next(error);
  }
};

export const getTripSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const summary = await OperationsService.getTripSummary(req.params.id as string);
    res.status(200).json({ success: true, data: summary });
  } catch (error: any) {
    if (error.message.includes("not found")) {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const getTripAgreements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const agreementsData = await OperationsService.getTripAgreements(req.params.id as string);
    res.status(200).json({ success: true, data: agreementsData });
  } catch (error: any) {
    if (error.message.includes("not found")) {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const getMobileData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const tripId = req.params.id as string;
    
    if (!branchId || !tripId || tripId === "undefined") {
      res.status(400).json({ success: false, message: "Missing or invalid required parameters" });
      return;
    }

    const data = await OperationsService.getMobileData(tripId, branchId);
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    if (error.message.includes("not found")) {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const loadTripStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const payload = loadTripStockSchema.parse(req.body);
    const trip = await OperationsService.loadTripStock(req.params.id as string, branchId, payload);
    res.status(200).json({ success: true, data: trip, message: "Stock loaded successfully" });
  } catch (error: any) {
    if (error.message.includes("Cannot load stock")) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const unloadStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const tripId = req.params.id as string;
    const stockId = req.params.stockId as string;
    
    if (!branchId || !tripId || !stockId || stockId === "undefined" || tripId === "undefined") {
      res.status(400).json({ success: false, message: "Missing or invalid required parameters" });
      return;
    }

    const trip = await OperationsService.unloadTripStock(tripId, stockId, branchId);
    res.status(200).json({ success: true, data: trip, message: "Stock unloaded successfully" });
  } catch (error: any) {
    if (error.message.includes("Cannot unload stock") || error.message.includes("not found")) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const updateTripStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = updateTripStatusSchema.parse(req.body);
    const tripId = req.params.id as string;
    const userId = (req as any).user?.id;
    
    if (payload.status === 'RECONCILING') {
      const trip = await OperationsService.getTrip(tripId);
      if (!trip) {
        res.status(404).json({ success: false, message: "Trip not found" });
        return;
      }
      
      // If the trip is currently active, someone is forcing it to end.
      if (trip.status === 'DEPARTED' || trip.status === 'IN_PROGRESS') {
        // Only the assigned in-charge OR someone with trips:force_end can do this.
        if (trip.incharge?.id !== userId) {
          const u = await UserService.getUser(userId);
          const role = u?.role_id ? await RbacService.getRole(u.role_id) : null;
          const isSuperAdmin = role && role.level >= 90;
          const hasForceEnd = role && role.permissions.some(rp => rp.permission.name === "trips:force_end");
          
          if (!isSuperAdmin && !hasForceEnd) {
            res.status(403).json({ success: false, message: "Forbidden: You need trips:force_end permission to bypass the assigned rep and force end this trip." });
            return;
          }
        }
      }
    }

    const updatedTrip = await OperationsService.updateTripStatus(tripId, payload);
    res.status(200).json({ success: true, data: updatedTrip, message: `Trip status updated to ${payload.status}` });
  } catch (error: any) {
    next(error);
  }
};

export const cancelTrip = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const tripId = req.params.id as string;
    
    if (!branchId || !tripId || tripId === "undefined") {
      res.status(400).json({ success: false, message: "Missing or invalid required parameters" });
      return;
    }

    const trip = await OperationsService.cancelTrip(tripId, branchId);
    res.status(200).json({ success: true, data: trip, message: "Trip cancelled successfully" });
  } catch (error: any) {
    if (error.message.includes("cancelled")) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const closeTrip = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const tripId = req.params.id as string;
    const payload = req.body;
    
    if (!branchId || !tripId || tripId === "undefined") {
      res.status(400).json({ success: false, message: "Missing or invalid required parameters" });
      return;
    }

    const trip = await OperationsService.closeTrip(tripId, branchId, payload);
    res.status(200).json({ success: true, data: trip, message: "Trip closed successfully" });
  } catch (error: any) {
    if (error.message.includes("RECONCILING")) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const listDiscrepancies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const status = req.query.status as string | undefined;

    if (!branchId) {
      res.status(400).json({ success: false, message: "Branch ID required" });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const search = (req.query.search as string) || (req.query.q as string) || '';

    const result = await OperationsService.listDiscrepancies(branchId, status, page, limit, search);
    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    next(error);
  }
};

export const resolveDiscrepancy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const discrepancyId = req.params.id as string;
    const payload = req.body;

    if (!discrepancyId || discrepancyId === "undefined") {
      res.status(400).json({ success: false, message: "Missing discrepancy ID" });
      return;
    }

    const discrepancy = await OperationsService.resolveDiscrepancy(discrepancyId, payload);
    res.status(200).json({ success: true, data: discrepancy, message: "Discrepancy resolved successfully" });
  } catch (error) {
    next(error);
  }
};

export const syncRoutes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = req.body; // array of { id, trip_id, gps_lat, gps_lng, timestamp }
    if (!Array.isArray(payload) || payload.length === 0) {
      res.status(400).json({ success: false, message: "Invalid or empty payload" });
      return;
    }

    const result = await OperationsService.syncRoutes(payload);
    res.status(200).json({ success: true, data: result, message: "Routes synced successfully" });
  } catch (error) {
    next(error);
  }
};
