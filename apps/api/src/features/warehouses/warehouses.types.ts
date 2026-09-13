import { z } from "zod";

export const createWarehouseSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(255),
  address: z.string().min(5, "Address must be at least 5 characters").max(255),
  phone: z.string().max(50, "Phone must be under 50 characters").optional(),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export type CreateWarehousePayload = z.infer<typeof createWarehouseSchema>;

export const updateWarehouseSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  address: z.string().min(5).max(255).optional(),
  phone: z.string().max(50).optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export type UpdateWarehousePayload = z.infer<typeof updateWarehouseSchema>;
