import { Router } from "express";
import { createPreOrder, listPreOrders, deletePreOrder } from "./orders.controller";
import { requireAuth } from "../../middlewares/jwt.middleware";
import { requireBranchScope } from "../../middlewares/branch.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";

const router = Router();

router.use(requireAuth);
router.use(requireBranchScope);

router.post("/", requirePermission("orders:create"), createPreOrder);
router.get("/", requirePermission("orders:read"), listPreOrders);
router.delete("/:id", requirePermission("orders:delete"), deletePreOrder);

export default router;
