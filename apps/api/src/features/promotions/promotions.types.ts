import { z } from "zod";

export const createPromotionSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  discount_type: z.enum(["PERCENTAGE", "FIXED"]),
  discount_value: z.number().min(0, "Discount value must be positive"),
  is_active: z.boolean().default(true),
});

export type CreatePromotionPayload = z.infer<typeof createPromotionSchema>;

export const updatePromotionSchema = createPromotionSchema.partial();
export type UpdatePromotionPayload = z.infer<typeof updatePromotionSchema>;

export interface PromotionResponse {
  id: string;
  name: string;
  description: string | null;
  start_date: Date;
  end_date: Date;
  discount_type: "PERCENTAGE" | "FIXED";
  discount_value: string;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}
