import { z } from 'zod';

export interface Promotion {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  discount_type: "PERCENTAGE" | "FIXED";
  discount_value: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const promotionFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional().or(z.literal('')),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  discount_type: z.enum(["PERCENTAGE", "FIXED"]),
  discount_value: z.coerce.number().min(0, "Discount must be positive"),
  is_active: z.boolean().default(true),
});

export type PromotionFormValues = z.infer<typeof promotionFormSchema>;
