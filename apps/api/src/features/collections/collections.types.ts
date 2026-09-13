import { z } from "zod";

export const createAdjustmentSchema = z.object({
  type: z.enum(["DISCOUNT", "WRITE_OFF", "PENALTY", "REBATE"]),
  amount: z.number().positive(),
  reason: z.string().min(3).max(255),
});

export type CreateAdjustmentPayload = z.infer<typeof createAdjustmentSchema>;

export const createSchemeSchema = z.object({
  branch_id: z.string().uuid().optional(),
  name: z.string().min(3).max(255),
  terms: z.number().positive().int(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  interest_rate: z.number().min(0),
  min_downpayment_percent: z.number().min(0).max(100),
  late_fee_percentage: z.number().min(0).max(100),
  grace_period_days: z.number().int().min(0).default(5),
});

export type CreateSchemePayload = z.infer<typeof createSchemeSchema>;

export const updateSchemeSchema = z.object({
  name: z.string().min(3).max(255).optional(),
  terms: z.number().positive().int().optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional(),
  interest_rate: z.number().min(0).optional(),
  min_downpayment_percent: z.number().min(0).max(100).optional(),
  late_fee_percentage: z.number().min(0).max(100).optional(),
  grace_period_days: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

export type UpdateSchemePayload = z.infer<typeof updateSchemeSchema>;

export const createReceiptSchema = z.object({
  id: z.string().uuid().optional(),
  receipt_no: z.string().optional(),
  offline_receipt_number: z.string().optional(),
  contract_id: z.string().uuid(),
  amount: z.number().positive(),
  payment_mode: z.enum(["CASH", "CARD", "BANK_TRANSFER", "CHEQUE"]).default("CASH"),
  trip_id: z.string().uuid().optional(),
  idempotencyKey: z.string().optional(),
  gps_lat: z.number().optional(),
  gps_lng: z.number().optional(),
});

export type CreateReceiptPayload = z.infer<typeof createReceiptSchema>;

export const createAttemptSchema = z.object({
  trip_id: z.string().uuid(),
  contract_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  status: z.enum(["COLLECTED", "MISSED", "CUSTOMER_UNAVAILABLE", "PROMISE_TO_PAY"]),
  remarks: z.string().optional(),
  gps_lat: z.number().optional(),
  gps_lng: z.number().optional(),
});

export type CreateAttemptPayload = z.infer<typeof createAttemptSchema>;
