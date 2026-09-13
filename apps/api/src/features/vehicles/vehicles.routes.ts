import { Router } from "express";
import { createVehicle, getVehicle, listVehicles, updateVehicle, deleteVehicle } from "./vehicles.controller";
import { requireAuth } from "../../middlewares/jwt.middleware";
import { requireBranchScope } from "../../middlewares/branch.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";

const router = Router();

router.use(requireAuth);
router.use(requireBranchScope);

router.post("/", requirePermission("logistics:create"), createVehicle);
router.get("/", requirePermission("logistics:read"), listVehicles);
router.get("/:id", requirePermission("logistics:read"), getVehicle);
router.put("/:id", requirePermission("logistics:update"), updateVehicle);
router.delete("/:id", requirePermission("logistics:update"), deleteVehicle);

export default router;
