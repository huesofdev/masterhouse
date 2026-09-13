import { Router } from "express";
import { getCategories, createCategory, updateCategory, deleteCategory, getExpenses, createExpense } from "./expenses.controller";
import { requireAuth } from "../../middlewares/jwt.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { requireBranchScope } from "../../middlewares/branch.middleware";

const router = Router();

// Categories
router.get("/categories", requireAuth, requirePermission("settings:read"), getCategories);
router.post("/categories", requireAuth, requirePermission("settings:update"), createCategory);
router.patch("/categories/:id", requireAuth, requirePermission("settings:update"), updateCategory);
router.delete("/categories/:id", requireAuth, requirePermission("settings:update"), deleteCategory);

// Expenses (Branch specific)
router.get("/", requireAuth, requireBranchScope, requirePermission("expenses:read"), getExpenses);
router.post("/", requireAuth, requireBranchScope, requirePermission("expenses:create"), createExpense);

export default router;
