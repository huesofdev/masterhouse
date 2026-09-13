import { Router } from "express";
import { listConflicts, getConflict, resolveConflict, discardConflict, uploadFile, logLocalConflict } from "./sync.controller";
import { requireAuth } from "../../middlewares/jwt.middleware";
import { requireBranchScope } from "../../middlewares/branch.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { uploadMiddleware } from "../../middlewares/upload.middleware";

const router = Router();

router.use(requireAuth);
router.use(requireBranchScope);

router.post("/upload", uploadMiddleware.single("file"), uploadFile);
router.post("/log-conflict", logLocalConflict);

// Only admins with 'sync:manage' can access the Conflict Zone Inbox
router.get("/conflicts", requirePermission("sync:manage"), listConflicts);
router.get("/conflicts/:id", requirePermission("sync:manage"), getConflict);
router.put("/conflicts/:id/resolve", requirePermission("sync:manage"), resolveConflict);
router.put("/conflicts/:id/discard", requirePermission("sync:manage"), discardConflict);

export default router;
