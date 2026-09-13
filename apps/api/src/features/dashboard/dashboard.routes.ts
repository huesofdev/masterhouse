import { Router } from "express";
import { getDashboardSummary } from "./dashboard.controller";
import { requireAuth } from "../../middlewares/jwt.middleware";
import { requireBranchScope } from "../../middlewares/branch.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";

const router = Router();

router.use(requireAuth);
router.use(requireBranchScope);

router.get("/summary", requirePermission("reports:view"), getDashboardSummary);

export default router;
