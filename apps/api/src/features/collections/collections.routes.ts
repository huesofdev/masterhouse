import { Router } from "express";
import { createAdjustment, freezeContract, resumeContract, createScheme, listSchemes, updateScheme, createReceipt, listSchedules, printReceipt, syncReceipt, logAttempt, getContractHistory, getContractBreakdown, getScheduleCounts, getMapData } from "./collections.controller";
import { requireAuth } from "../../middlewares/jwt.middleware";
import { requireBranchScope } from "../../middlewares/branch.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";

const router = Router();

router.use(requireAuth);
router.use(requireBranchScope);

// Schemes (Financing Templates)
router.post("/schemes", requirePermission("collections:create"), createScheme);
router.get("/schemes", requirePermission("collections:read"), listSchemes);
router.put("/schemes/:id", requirePermission("collections:update"), updateScheme);

// Contract Adjustments (Discounts, Write-offs)
router.post("/contracts/:id/adjustments", requirePermission("collections:adjust"), createAdjustment);

// Collections / Receipts
router.get("/map-data", requirePermission("collections:read"), getMapData);
router.post("/receipts", requirePermission("collections:create"), createReceipt);
router.post("/sync", requirePermission("collections:create"), syncReceipt); // Alias for mobile offline sync
router.get("/receipts/:id/print", requirePermission("collections:read"), printReceipt);
router.get("/schedules/counts", requirePermission("collections:read"), getScheduleCounts);
router.get("/schedules", requirePermission("collections:read"), listSchedules);

// Contract Lifecycle (Freeze during Warranty)
router.post("/contracts/:id/freeze", requirePermission("collections:update"), freezeContract);
router.post("/contracts/:id/resume", requirePermission("collections:update"), resumeContract);
router.get("/contracts/:id/history", requirePermission("collections:read"), getContractHistory);
router.get("/contracts/:id/breakdown", requirePermission("collections:read"), getContractBreakdown);

// Collection Attempts
router.post("/attempts", requirePermission("collections:create"), logAttempt);

export default router;
