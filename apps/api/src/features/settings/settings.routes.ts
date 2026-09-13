import { Router } from "express";
import { getSettings, updateSettings, uploadLogo, getPublicSettings, getTaxes, createTax, updateTax, deleteTax } from "./settings.controller";
import { requireAuth } from "../../middlewares/jwt.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { uploadMiddleware } from "../../middlewares/upload.middleware";

const router = Router();

// Public endpoints (must be before requireAuth)
router.get("/public", getPublicSettings);

router.use(requireAuth);

router.get("/", requirePermission("settings:read"), getSettings);
router.put("/", requirePermission("settings:update"), updateSettings);
router.post("/upload-logo", requirePermission("settings:update"), uploadMiddleware.single("logo"), uploadLogo);

// Taxes routes
router.get("/taxes", requirePermission("settings:read"), getTaxes);
router.post("/taxes", requirePermission("settings:update"), createTax);
router.put("/taxes/:id", requirePermission("settings:update"), updateTax);
router.delete("/taxes/:id", requirePermission("settings:update"), deleteTax);

// Sequences
import { getDocumentSequences, updateDocumentSequence } from "./settings.controller";
import { requireBranchScope } from "../../middlewares/branch.middleware";
router.get("/sequences", requirePermission("settings:read"), requireBranchScope, getDocumentSequences);
router.put("/sequences", requirePermission("settings:update"), requireBranchScope, updateDocumentSequence);

export default router;
