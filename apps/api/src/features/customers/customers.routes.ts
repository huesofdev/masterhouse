import { Router } from "express";
import { searchCustomers, listCustomers, createCustomer, updateCustomer, uploadNic, getNicUrl, getCustomerDetails, exportCustomerDetails, updateCustomerRating, resetCustomerRatingOverride } from "./customers.controller";
import { requireAuth } from "../../middlewares/jwt.middleware";
import { requireBranchScope } from "../../middlewares/branch.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { uploadMiddleware } from "../../middlewares/upload.middleware";

const router = Router();

router.use(requireAuth);
router.use(requireBranchScope);

// Customer CRUD
router.get("/", requirePermission("customers:read"), listCustomers);
router.get("/:id/details", requirePermission("customers:read"), getCustomerDetails);
router.get("/:id/export", requirePermission("customers:read"), exportCustomerDetails);
router.post("/", requirePermission("customers:create"), createCustomer);
router.put("/:id", requirePermission("customers:update"), updateCustomer);
router.get("/search", requirePermission("customers:read"), searchCustomers);

// NIC Management
router.post("/:id/nic", requirePermission("customers:update"), uploadMiddleware.single("file"), uploadNic);
router.get("/:id/nic/:side", requirePermission("customers:read"), getNicUrl);

// Rating Management
router.patch("/:id/rating", requirePermission("customers:update"), updateCustomerRating);
router.delete("/:id/rating/override", requirePermission("customers:update"), resetCustomerRatingOverride);

export default router;
