import { z } from "zod";

// Categories
export interface Category {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export const categorySchema = z.object({
  name: z.string().min(2, "Name is required").max(255),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

// Brands
export interface Brand {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export const brandSchema = z.object({
  name: z.string().min(2, "Name is required").max(255),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

export type BrandFormValues = z.infer<typeof brandSchema>;

// Products
export interface Product {
  id: string;
  category_id: string;
  brand_id: string | null;
  name: string;
  sku: string;
  description: string | null;
  base_price: string;       // retail price for reps
  uom: string;
  is_serialized: boolean;
  min_downpayment_amount: string;
  warranty_type: "NONE" | "WARRANTY" | "GUARANTEE";
  warranty_period_years: number;
  warranty_period_months: number;
  avg_cost: string;         // computed by intake, not manually set
  image_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;      // joined relation
  brand?: Brand;            // joined relation
}

export const productSchema = z.object({
  category_id: z.string().min(1, "Category is required"),
  brand_id: z.string().optional().nullable(),
  name: z.string().min(2, "Name is required").max(255),
  sku: z.string().min(2, "SKU is required").max(100),
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

export type ProductFormValues = z.infer<typeof productSchema>;
