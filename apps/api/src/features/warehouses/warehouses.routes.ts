import { Router } from "express";
import { createWarehouse, getWarehouse, listWarehouses, updateWarehouse, deleteWarehouse, listAllWarehouses } from "./warehouses.controller";
import { requireAuth } from "../../middlewares/jwt.middleware";
import { requireBranchScope } from "../../middlewares/branch.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";

const router = Router();

router.use(requireAuth);
router.get("/all", requirePermission("warehouses:read"), listAllWarehouses);
router.use(requireBranchScope);

router.post("/", requirePermission("warehouses:create"), createWarehouse);
router.get("/", requirePermission("warehouses:read"), listWarehouses);
router.get("/:id", requirePermission("warehouses:read"), getWarehouse);
router.put("/:id", requirePermission("warehouses:update"), updateWarehouse);
router.delete("/:id", requirePermission("warehouses:update"), deleteWarehouse);

export default router;
