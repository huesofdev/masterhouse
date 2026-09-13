import { Router } from "express";
import { createBranch, getBranch, listBranches, updateBranch } from "./branches.controller";
import { requireAuth } from "../../middlewares/jwt.middleware";
import { requireBranchScope } from "../../middlewares/branch.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";

const router = Router();

// Protect branches routes
router.use(requireAuth);

router.post("/", requirePermission("branches:create"), createBranch);
router.get("/", requirePermission("branches:read"), listBranches);
router.get("/:id", requirePermission("branches:read"), getBranch);
router.put("/:id", requirePermission("branches:update"), updateBranch);

export default router;
