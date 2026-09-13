import { Router } from "express";
import { createUser, getUser, updateUser, listUsers, updateMe, updateMyPassword, updateMyProfilePicture, adminResetPassword, getMe, getStaffWallet, addWalletRepayment, listWallets } from "./user.controller";
import { requireAuth } from "../../middlewares/jwt.middleware";
import { requireBranchScope } from "../../middlewares/branch.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { uploadMiddleware } from "../../middlewares/upload.middleware";

const router = Router();

// Require auth and branch scope for all user routes
router.use(requireAuth);
router.use(requireBranchScope);

// Self-service routes (must be defined before /:id)
router.get("/me", getMe);
router.put("/me", updateMe);
router.put("/me/password", updateMyPassword);
router.post("/me/profile-picture", uploadMiddleware.single("file"), updateMyProfilePicture);

// Admin / Management routes
router.post("/", requirePermission("users:create"), createUser);
router.get("/", requirePermission("users:read"), listUsers);
router.get("/:id", requirePermission("users:read"), getUser);
router.put("/:id", requirePermission("users:update"), updateUser);
router.post("/:id/reset-password", requirePermission("users:update"), adminResetPassword);
router.get("/wallets/list", requirePermission("wallets:read"), listWallets);
router.get("/:id/wallet", requirePermission("wallets:read"), getStaffWallet);
router.post("/:id/wallet/repayment", requirePermission("wallets:update"), addWalletRepayment);

export default router;
