import { z } from "zod";

export const UOMEnum = z.enum(["pieces", "kg", "g", "l", "ml", "box", "pack"]);

export const ProductTypeEnum = z.enum(["bulk", "serial"]);

// --- CATEGORIES ---
export const createCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(255),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

export type CreateCategoryPayload = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(255).optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});

export type UpdateCategoryPayload = z.infer<typeof updateCategorySchema>;

// --- BRANDS ---
export const createBrandSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(255),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

export type CreateBrandPayload = z.infer<typeof createBrandSchema>;

export const updateBrandSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});

export type UpdateBrandPayload = z.infer<typeof updateBrandSchema>;

// --- PRODUCTS ---
export const createProductSchema = z.object({
  category_id: z.string().min(1, "Category is required"),
  brand_id: z.string().nullable().optional(),
  name: z.string().min(2, "Name must be at least 2 characters").max(255),
  sku: z.string().min(2, "SKU must be at least 2 characters").max(100),
  description: z.string().optional().nullable(),
  base_price: z.coerce.number().min(0, "Retail price must be positive").default(0),
  uom: z.enum(["pieces", "kg", "g", "l", "ml", "box", "pack"]).default("pieces"),
  is_serialized: z.boolean().default(false),
  min_downpayment_amount: z.coerce.number().min(0).default(0),
  warranty_type: z.enum(["WARRANTY", "GUARANTEE", "NONE"]).default("NONE"),
  warranty_period_years: z.coerce.number().int().min(0).default(0),
  warranty_period_months: z.coerce.number().int().min(0).default(0),
  avg_cost: z.coerce.number().min(0).default(0),
  image_url: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

export type CreateProductPayload = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductPayload = z.infer<typeof updateProductSchema>;
