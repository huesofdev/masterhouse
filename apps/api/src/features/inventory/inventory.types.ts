import { z } from "zod";

export const intakeItemSchema = z.object({
  product_id: z.string().uuid("Invalid product ID"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unit_cost: z.number().min(0, "Unit cost cannot be negative"),
  serials: z.array(z.string().min(1)).optional(),
});

export const createIntakeSchema = z.object({
  branch_id: z.string().uuid("Invalid branch ID"),
  warehouse_id: z.string().uuid("Invalid warehouse ID"),
  supplier_id: z.string().uuid().optional(),
  supplier_name: z.string().min(2, "Supplier name is required").max(255),
  invoice_number: z.string().max(100).optional(),
  received_at: z.string().datetime().optional(),
  items: z.array(intakeItemSchema).min(1, "At least one item is required"),
});

export type IntakeItemPayload = z.infer<typeof intakeItemSchema>;
export type CreateIntakePayload = z.infer<typeof createIntakeSchema>;
