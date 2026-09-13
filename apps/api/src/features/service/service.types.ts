import { z } from "zod";

export const processReturnSchema = z.object({
  sale_item_id: z.string().uuid(),
  type: z.enum(["CUSTOMER_RETURN", "DEFECTIVE", "WARRANTY"]),
  disposition: z.enum(["RESTOCKED", "DEFECTIVE_DEPOT", "SUPPLIER_RETURNED", "WRITTEN_OFF"]),
  reason: z.string().min(3).max(500),
  refund_amount: z.number().min(0).default(0),
  refund_mode: z.enum(["CASH", "STORE_CREDIT", "NONE"]).default("NONE"),
});
export type ProcessReturnPayload = z.infer<typeof processReturnSchema>;

export const createWarrantyClaimSchema = z.object({
  sale_item_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  issue_description: z.string().min(5),
});
export type CreateWarrantyClaimPayload = z.infer<typeof createWarrantyClaimSchema>;

export const updateWarrantyStatusSchema = z.object({
  status: z.enum(["ITEM_COLLECTED", "SENT_TO_SUPPLIER", "IN_REPAIR", "REPAIRED", "REJECTED"]),
});
export type UpdateWarrantyStatusPayload = z.infer<typeof updateWarrantyStatusSchema>;

export const closeWarrantyClaimSchema = z.object({
  resolution: z.enum(["REPAIRED", "REPLACED", "REJECTED"]),
  replacement_serial_id: z.string().uuid().optional(), // required if REPLACED
  notes: z.string().optional(),
});
export type CloseWarrantyClaimPayload = z.infer<typeof closeWarrantyClaimSchema>;
