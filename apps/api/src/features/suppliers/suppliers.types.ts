import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z.string().min(2, "Supplier name is required").max(255),
  contact_person: z.string().max(255).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email("Invalid email").max(255).or(z.literal('')).optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  opening_balance: z.number().optional().default(0),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export type CreateSupplierPayload = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierPayload = z.infer<typeof updateSupplierSchema>;

export const recordPaymentSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  notes: z.string().optional().nullable(),
});

export type RecordPaymentPayload = z.infer<typeof recordPaymentSchema>;
