import { Router } from "express";
import { 
  createCategory, getCategory, listCategories, updateCategory, deleteCategory,
  createBrand, getBrand, listBrands, updateBrand, deleteBrand,
  createProduct, getProduct, listProducts, updateProduct, deleteProduct,
  getBulkTemplate, bulkUploadProducts, syncProducts
} from "./catalog.controller";
import { requireAuth } from "../../middlewares/jwt.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { excelUploadMiddleware } from "../../middlewares/upload.middleware";

const router = Router();
router.use(requireAuth);

// Categories
router.post("/categories", requirePermission("catalog:create"), createCategory);
router.get("/categories", requirePermission("catalog:read"), listCategories);
router.get("/categories/:id", requirePermission("catalog:read"), getCategory);
router.put("/categories/:id", requirePermission("catalog:update"), updateCategory);
router.delete("/categories/:id", requirePermission("catalog:delete"), deleteCategory);

// Brands
router.post("/brands", requirePermission("catalog:create"), createBrand);
router.get("/brands", requirePermission("catalog:read"), listBrands);
router.get("/brands/:id", requirePermission("catalog:read"), getBrand);
router.put("/brands/:id", requirePermission("catalog:update"), updateBrand);
router.delete("/brands/:id", requirePermission("catalog:delete"), deleteBrand);

// Products
router.get("/products/bulk-template", requirePermission("catalog:create"), getBulkTemplate);
router.post("/products/bulk-upload", requirePermission("catalog:create"), excelUploadMiddleware.single("file"), bulkUploadProducts);

router.get("/products/sync", requirePermission("catalog:read"), syncProducts);
router.post("/products", requirePermission("catalog:create"), createProduct);
router.get("/products", requirePermission("catalog:read"), listProducts);
router.get("/products/:id", requirePermission("catalog:read"), getProduct);
router.put("/products/:id", requirePermission("catalog:update"), updateProduct);
router.delete("/products/:id", requirePermission("catalog:delete"), deleteProduct);

export default router;
