import type { Request, Response, NextFunction } from "express";
import { CatalogService } from "./catalog.service";
import { 
  createCategorySchema, updateCategorySchema,
  createBrandSchema, updateBrandSchema,
  createProductSchema, updateProductSchema
} from "./catalog.types";

// --- CATEGORIES ---
export const createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = createCategorySchema.parse(req.body);
    const category = await CatalogService.createCategory(payload);
    res.status(201).json({ success: true, data: category });
  } catch (error) { next(error); }
};

export const getCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = await CatalogService.getCategory(req.params.id as string);
    if (!category) { res.status(404).json({ success: false, message: "Category not found" }); return; }
    res.status(200).json({ success: true, data: category });
  } catch (error) { next(error); }
};

export const listCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await CatalogService.listCategories();
    res.status(200).json({ success: true, data: categories });
  } catch (error) { next(error); }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = updateCategorySchema.parse(req.body);
    const category = await CatalogService.updateCategory(req.params.id as string, payload);
    if (!category) { res.status(404).json({ success: false, message: "Category not found" }); return; }
    res.status(200).json({ success: true, data: category });
  } catch (error) { next(error); }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deleted = await CatalogService.deleteCategory(req.params.id as string);
    if (!deleted) { res.status(404).json({ success: false, message: "Category not found" }); return; }
    res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error: any) { 
    if (error?.message?.includes("Cannot delete category")) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error); 
  }
};

// --- BRANDS ---
export const createBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = createBrandSchema.parse(req.body);
    const brand = await CatalogService.createBrand(payload);
    res.status(201).json({ success: true, data: brand });
  } catch (error) { next(error); }
};

export const getBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const brand = await CatalogService.getBrand(req.params.id as string);
    if (!brand) { res.status(404).json({ success: false, message: "Brand not found" }); return; }
    res.status(200).json({ success: true, data: brand });
  } catch (error) { next(error); }
};

export const listBrands = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const brands = await CatalogService.listBrands();
    res.status(200).json({ success: true, data: brands });
  } catch (error) { next(error); }
};

export const updateBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = updateBrandSchema.parse(req.body);
    const brand = await CatalogService.updateBrand(req.params.id as string, payload);
    if (!brand) { res.status(404).json({ success: false, message: "Brand not found" }); return; }
    res.status(200).json({ success: true, data: brand });
  } catch (error) { next(error); }
};

export const deleteBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deleted = await CatalogService.deleteBrand(req.params.id as string);
    if (!deleted) { res.status(404).json({ success: false, message: "Brand not found" }); return; }
    res.status(200).json({ success: true, message: "Brand deleted successfully" });
  } catch (error: any) { 
    if (error?.message?.includes("Cannot delete brand")) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error); 
  }
};

// --- PRODUCTS ---
export const createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = createProductSchema.parse(req.body);
    const product = await CatalogService.createProduct(payload);
    res.status(201).json({ success: true, data: product });
  } catch (error) { next(error); }
};

export const getProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await CatalogService.getProduct(req.params.id as string);
    if (!product) { res.status(404).json({ success: false, message: "Product not found" }); return; }
    res.status(200).json({ success: true, data: product });
  } catch (error) { next(error); }
};

export const syncProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const products = await CatalogService.syncProducts();
    res.status(200).json({ success: true, data: products });
  } catch (error) { next(error); }
};

export const listProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const search = (req.query.search as string) || '';
    
    const filters = {
      categoryId: req.query.categoryId as string,
      type: req.query.type as string,
      status: req.query.status as string,
    };
    
    const result = await CatalogService.listProducts(page, limit, search, filters);
    res.status(200).json({ success: true, ...result });
  } catch (error) { next(error); }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = updateProductSchema.parse(req.body);
    const product = await CatalogService.updateProduct(req.params.id as string, payload);
    if (!product) { res.status(404).json({ success: false, message: "Product not found" }); return; }
    res.status(200).json({ success: true, data: product });
  } catch (error) { next(error); }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deleted = await CatalogService.deleteProduct(req.params.id as string);
    if (!deleted) { res.status(404).json({ success: false, message: "Product not found" }); return; }
    res.status(200).json({ success: true, message: "Product deleted successfully" });
  } catch (error: any) { 
    if (error?.message?.includes("Cannot delete product")) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error); 
  }
};

// --- BULK OPERATIONS ---
export const getBulkTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const buffer = await CatalogService.generateBulkTemplate();
    res.setHeader("Content-Disposition", 'attachment; filename="Products_Bulk_Template.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (error) { next(error); }
};

export const bulkUploadProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: "Excel file is required" });
      return;
    }
    const result = await CatalogService.bulkUploadProducts(req.file.buffer);
    res.status(200).json({ success: true, data: result });
  } catch (error) { next(error); }
};
