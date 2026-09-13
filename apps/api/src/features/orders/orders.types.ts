import { z } from "zod";

export const createPreOrderSchema = z.object({
  id: z.string().uuid().optional(),
  trip_id: z.string().uuid().optional().nullable(),
  customer_id: z.string().uuid("Invalid customer ID"),
  items: z.array(z.object({
    product_id: z.string().uuid("Invalid product ID"),
    quantity: z.number().int().min(1, "Quantity must be at least 1").default(1),
    discount_input: z.string().optional().nullable(),
  })).min(1, "At least one item is required"),
  advance_payment: z.number().min(0).default(0),
  payment_method: z.enum(["CASH", "CARD", "BANK_TRANSFER"]).optional().nullable(),
  sale_type_preference: z.enum(["DIRECT", "INSTALLMENT"]).optional().nullable(),
  receipt_number: z.string().optional().nullable(),
  offline_receipt_number: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export const fulfillPreOrderSchema = z.object({
  sale_type: z.enum(["DIRECT", "INSTALLMENT"]),
  // For installment
  scheme_id: z.string().uuid().optional().nullable(),
  guarantor_id: z.string().uuid().optional().nullable(),
  // For direct sale
  payment_method: z.enum(["CASH", "CARD", "BANK_TRANSFER"]).optional().nullable(),
  receipt_number: z.string().optional().nullable(),
});

export type CreatePreOrderPayload = z.infer<typeof createPreOrderSchema>;
