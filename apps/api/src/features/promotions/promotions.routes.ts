import { Router } from "express";
import { createPromotion, getPromotion, updatePromotion, deletePromotion, listPromotions } from "./promotions.controller";
import { requireAuth } from "../../middlewares/jwt.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";

const router = Router();

router.use(requireAuth);

// Anyone authenticated can list/get promotions (e.g. mobile app sync)
router.get("/", requirePermission("promotions:read"), listPromotions);
router.get("/:id", requirePermission("promotions:read"), getPromotion);

// Only level 50+ (or those with specific permissions) can create/update/delete
router.post("/", requirePermission("promotions:create"), createPromotion);
router.put("/:id", requirePermission("promotions:update"), updatePromotion);
router.delete("/:id", requirePermission("promotions:delete"), deletePromotion);

export default router;
