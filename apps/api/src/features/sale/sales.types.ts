import { z } from "zod";

export const createSaleItemSchema = z.object({
  product_id: z.string().uuid("Invalid product ID"),
  serial_item_id: z.string().uuid().optional().nullable(),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unit_price: z.number().min(0, "Unit price cannot be negative"),
  discount_amount: z.number().min(0).default(0),
  discount_type: z.enum(['PERCENTAGE', 'FLAT_LINE', 'FLAT_UNIT']).optional().nullable(),
  line_total: z.number().min(0),
});

export const createSaleSchema = z.object({
  id: z.string().uuid().optional(),
  reference_number: z.string().optional(),
  offline_receipt_number: z.string().optional(),
  customer_id: z.string().uuid("Invalid customer ID").optional().nullable(),
  trip_id: z.string().uuid("Invalid trip ID").optional().nullable(),
  pre_order_id: z.string().uuid("Invalid pre-order ID").optional().nullable(),
  sale_type: z.enum(["DIRECT", "INSTALLMENT"]),
  payment_mode: z.enum(["CASH", "CARD", "TRANSFER"]).default("CASH"),
  subtotal: z.number().min(0),
  promotion_id: z.string().uuid().optional().nullable(),
  promotion_discount: z.number().min(0).default(0),
  manual_discount: z.number().min(0).default(0),
  downpayment: z.number().min(0).default(0),
  partial_downpayment_recovery_date: z.string().optional().nullable(),
  tax_amount: z.number().min(0).default(0),
  tax_details: z.any().optional().nullable(),
  total: z.number().min(0),
  gps_lat: z.number().optional().nullable(),
  gps_lng: z.number().optional().nullable(),
  items: z.array(createSaleItemSchema).min(1, "Sale must have at least one item"),
  scheme_id: z.string().uuid().optional().nullable(),
  guarantor_id: z.string().uuid("Invalid guarantor ID").optional().nullable(),
  new_guarantor: z.object({
    full_name: z.string(),
    nic: z.string(),
    mobile: z.string(),
    address: z.string(),
    nic_front_url: z.string({ required_error: "Guarantor NIC front image is required" }),
    nic_back_url: z.string({ required_error: "Guarantor NIC back image is required" }),
  }).optional().nullable(),
  signature_image_url: z.string().optional().nullable(),
  guarantor_signature_image_url: z.string().optional().nullable(),
  idempotencyKey: z.string().optional(),
  notes: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  // If it's an installment sale AND it's a field trip sale, signature is strictly required
  if (data.sale_type === "INSTALLMENT" && data.trip_id) {
    if (!data.signature_image_url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Customer signature image is mandatory for all field (trip) installment sales.",
        path: ["signature_image_url"],
      });
    }
    // Also require guarantor signature for field sales
    if (!data.guarantor_signature_image_url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Guarantor signature image is mandatory for all field (trip) installment sales.",
        path: ["guarantor_signature_image_url"],
      });
    }
  }
});

export type CreateSalePayload = z.infer<typeof createSaleSchema>;

export const updateSaleNotesSchema = z.object({
  notes: z.string().nullable().optional(),
});
