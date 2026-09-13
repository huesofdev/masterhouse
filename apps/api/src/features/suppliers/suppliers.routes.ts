import { Router } from "express";
import { requireAuth } from "../../middlewares/jwt.middleware";
import { requireBranchScope } from "../../middlewares/branch.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import {
  listSuppliers, createSupplier, getSupplier, updateSupplier, deleteSupplier,
  migrateSupplierLinks, recordPayment, getSupplierLedger, setOpeningBalance
} from "./suppliers.controller";

const router = Router();
router.use(requireAuth);
router.use(requireBranchScope);

router.get("/", requirePermission("suppliers:read"), listSuppliers);
router.post("/", requirePermission("suppliers:create"), createSupplier);
router.post("/migrate-links", requirePermission("suppliers:create"), migrateSupplierLinks);
router.get("/:id", requirePermission("suppliers:read"), getSupplier);
router.put("/:id", requirePermission("suppliers:update"), updateSupplier);
router.delete("/:id", requirePermission("suppliers:update"), deleteSupplier);

router.post("/:id/payments", requirePermission("suppliers:update"), recordPayment);
router.post("/:id/opening-balance", requirePermission("suppliers:update"), setOpeningBalance);
router.get("/:id/ledger", requirePermission("suppliers:read"), getSupplierLedger);

export default router;
