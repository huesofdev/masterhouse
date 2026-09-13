import { Router } from "express";
import { processIntake, getIntakeOrders, getInventoryBalances, getIntakeById, getAvailableSerials, getBulkTemplate, bulkUploadIntake, deleteIntakeOrder, lookupBarcodeData } from "./inventory.controller";
import { requireAuth } from "../../middlewares/jwt.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { excelUploadMiddleware } from "../../middlewares/upload.middleware";

const router = Router();
router.use(requireAuth);

router.post("/barcodes/lookup", requirePermission("inventory:read"), lookupBarcodeData);
router.get("/intake/bulk-template", requirePermission("inventory:read"), getBulkTemplate);
router.post("/intake/bulk-upload", requirePermission("inventory:adjust"), excelUploadMiddleware.single("file"), bulkUploadIntake);

router.post("/intake", requirePermission("inventory:adjust"), processIntake);
router.get("/intake", requirePermission("inventory:read"), getIntakeOrders);
router.get("/intake/:id", requirePermission("inventory:read"), getIntakeById);
router.delete("/intake/:id", requirePermission("inventory:delete"), deleteIntakeOrder);
router.get("/balances/:warehouseId", requirePermission("inventory:read"), getInventoryBalances);
router.get("/serials/available/:productId", requirePermission("inventory:read"), getAvailableSerials);

import { listTransfers, createTransfer, getTransfer } from "./transfers.controller";
router.get("/transfers", requirePermission("inventory:read"), listTransfers);
router.post("/transfers", requirePermission("inventory:adjust"), createTransfer);
router.get("/transfers/:id", requirePermission("inventory:read"), getTransfer);

export default router;
