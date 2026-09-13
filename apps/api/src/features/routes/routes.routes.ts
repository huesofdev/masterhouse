import { Router } from "express";
import { createRoute, getRoute, listRoutes, updateRoute, deleteRoute } from "./routes.controller";
import { requireAuth } from "../../middlewares/jwt.middleware";
import { requireBranchScope } from "../../middlewares/branch.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";

const router = Router();

router.use(requireAuth);
router.use(requireBranchScope);

router.post("/", requirePermission("logistics:create"), createRoute);
router.get("/", requirePermission("logistics:read"), listRoutes);
router.get("/:id", requirePermission("logistics:read"), getRoute);
router.put("/:id", requirePermission("logistics:update"), updateRoute);
router.delete("/:id", requirePermission("logistics:update"), deleteRoute);

export default router;
