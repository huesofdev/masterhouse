import { z } from "zod";

export const tripStaffSchema = z.object({
  user_id: z.string().uuid("Invalid staff ID"),
  duty: z.string().min(2, "Duty must be specified"),
});

export const tripStockSchema = z.object({
  product_id: z.string().uuid("Invalid product ID"),
  serial_item_id: z.string().uuid().optional().nullable(),
  loaded_qty: z.number().int().positive("Loaded quantity must be at least 1"),
});

export const createTripSchema = z.object({
  route_id: z.string().uuid("Invalid route ID"),
  vehicle_id: z.string().uuid("Invalid vehicle ID"),
  incharge_id: z.string().uuid("Invalid incharge ID"),
  type: z.enum(["SALE", "COLLECTION", "BOTH"]),
  planned_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  
  // Up to 4 additional staff allowed
  staff: z.array(tripStaffSchema)
    .max(4, "Cannot assign more than 4 additional staff members")
    .optional(),
    
  stock: z.array(tripStockSchema).optional(),
});

export type CreateTripPayload = z.infer<typeof createTripSchema>;

export const loadTripStockSchema = z.object({
  items: z.array(tripStockSchema).min(1, "Must provide at least one item to load"),
});

export const updateTripStatusSchema = z.object({
  status: z.enum(["PLANNED", "LOADING", "DEPARTED", "IN_PROGRESS", "RECONCILING", "CLOSED", "CLOSED_WITH_DISCREPANCIES"]),
  start_km: z.number().int().nonnegative().optional().nullable(),
  end_km: z.number().int().nonnegative().optional().nullable(),
});

export type LoadTripStockPayload = z.infer<typeof loadTripStockSchema>;
export type UpdateTripStatusPayload = z.infer<typeof updateTripStatusSchema>;

export const closeTripSchema = z.object({
  expected_cash: z.number().min(0),
  actual_cash: z.number().min(0),
  returned_items: z.array(z.object({
    trip_stock_id: z.string().uuid(),
    returned_qty: z.number().min(0),
  })),
  end_km: z.number().int().nonnegative().optional().nullable(),
});
export type CloseTripPayload = z.infer<typeof closeTripSchema>;

export const resolveDiscrepancySchema = z.object({
  status: z.enum(["RESOLVED", "WAIVED"]),
  notes: z.string().optional(),
  refund_amount: z.number().min(0).optional(),
  return_to_warehouse: z.boolean().optional(),
  warehouse_id: z.string().uuid().optional(),
}).superRefine((data, ctx) => {
  if (data.return_to_warehouse && !data.warehouse_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Warehouse ID is required when returning stock to warehouse",
      path: ["warehouse_id"],
    });
  }
});
export type ResolveDiscrepancyPayload = z.infer<typeof resolveDiscrepancySchema>;
