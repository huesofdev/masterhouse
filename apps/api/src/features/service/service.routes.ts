import { Router } from "express";
import { getSaleForReturn, listReturns, processReturn, listWarrantyClaims, createWarrantyClaim, updateWarrantyStatus, closeWarrantyClaim } from "./service.controller";
import { requireAuth } from "../../middlewares/jwt.middleware";
import { requireBranchScope } from "../../middlewares/branch.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";

const router = Router();
router.use(requireAuth);
router.use(requireBranchScope);

// Returns
router.get("/returns", requirePermission("service:read"), listReturns);
router.get("/returns/sale/:saleId", requirePermission("service:read"), getSaleForReturn);
router.post("/returns", requirePermission("service:process"), processReturn);

// Warranty Claims
router.get("/warranty", requirePermission("service:read"), listWarrantyClaims);
router.post("/warranty", requirePermission("service:process"), createWarrantyClaim);
router.put("/warranty/:id/status", requirePermission("service:process"), updateWarrantyStatus);
router.post("/warranty/:id/close", requirePermission("service:process"), closeWarrantyClaim);

export default router;
