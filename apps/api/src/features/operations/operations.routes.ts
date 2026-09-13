import { Router } from "express";
import { createTrip, listTrips, getTrip, getTripSummary, getTripAgreements, loadTripStock, updateTripStatus, unloadStock, cancelTrip, closeTrip, listDiscrepancies, resolveDiscrepancy, getMobileData, syncRoutes } from "./operations.controller";
import { requireAuth } from "../../middlewares/jwt.middleware";
import { requireBranchScope } from "../../middlewares/branch.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";

const router = Router();

// Protect operations routes with Auth and Branch Scoping
router.use(requireAuth);
router.use(requireBranchScope);

// Require specific granular permissions to manage trips
router.post("/trips", requirePermission("trips:create"), createTrip);
router.get("/trips", requirePermission("trips:read"), listTrips);
router.get("/trips/:id", requirePermission("trips:read"), getTrip);
router.get("/trips/:id/summary", requirePermission("trips:read"), getTripSummary);
router.get("/trips/:id/agreements", requirePermission("trips:read"), getTripAgreements);
router.get("/trips/:id/mobile-data", requirePermission("trips:read"), getMobileData);
router.post("/trips/sync-routes", requirePermission("trips:update"), syncRoutes);
router.post("/trips/:id/stock", requirePermission("trips:update"), loadTripStock);
router.delete("/trips/:id/stock/:stockId", requirePermission("trips:update"), unloadStock);
router.put("/trips/:id/status", requirePermission("trips:update"), updateTripStatus);
router.post("/trips/:id/cancel", requirePermission("trips:delete"), cancelTrip);
router.post("/trips/:id/close", requirePermission("trips:reconcile"), closeTrip);

// Discrepancy Management
router.get("/discrepancies", requirePermission("trips:read"), listDiscrepancies);
router.put("/discrepancies/:id/status", requirePermission("trips:reconcile"), resolveDiscrepancy);

export default router;
