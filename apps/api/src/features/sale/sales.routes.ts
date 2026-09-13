import { Router } from "express";
import { createSale, posSearch, getAvailableSerials, listSales, getSaleDetails, syncSale, voidSale, updateSaleNotes } from "./sales.controller";
import { requireAuth } from "../../middlewares/jwt.middleware";
import { requireBranchScope } from "../../middlewares/branch.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";

const router = Router();

router.use(requireAuth);
router.use(requireBranchScope);

// Require 'sales:create' permission to execute POS sales
router.post("/", requirePermission("sales:create"), createSale);
router.post("/sync", requirePermission("sales:create"), syncSale); // Alias for mobile offline sync
router.get("/", requirePermission("sales:read"), listSales);
router.get("/pos-search", requirePermission("sales:create"), posSearch);
router.get("/available-serials/:productId", requirePermission("sales:create"), getAvailableSerials);
router.get("/:id", requirePermission("sales:read"), getSaleDetails);
router.patch("/:id/notes", requirePermission("sales:create"), updateSaleNotes);
router.post("/:id/void", requirePermission("sales:delete"), voidSale);

export default router;
