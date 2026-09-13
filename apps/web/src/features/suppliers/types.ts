import { z } from "zod";

export interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  balance_due?: string;
  total_paid?: string;
  opening_balance?: string;
}

export interface SupplierLedgerEntry {
  id: string;
  supplier_id: string;
  branch_id: string;
  transaction_type: 'OPENING_BALANCE' | 'INTAKE_BILL' | 'PAYMENT' | 'ADJUSTMENT';
  reference_id: string | null;
  amount: string;
  balance_after: string;
  notes: string | null;
  created_at: string;
  creator: {
    name: string;
    email: string;
  };
}

export const supplierSchema = z.object({
  name: z.string().min(2, "Supplier name is required").max(255),
  contact_person: z.string().max(255).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email("Invalid email").max(255).optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  opening_balance: z.number().optional().default(0),
});

export const recordPaymentSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  notes: z.string().optional().nullable(),
});

export const setOpeningBalanceSchema = z.object({
  amount: z.number().min(0, "Amount must be positive"),
});

export type RecordPaymentValues = z.infer<typeof recordPaymentSchema>;
export type SetOpeningBalanceValues = z.infer<typeof setOpeningBalanceSchema>;

export type SupplierFormValues = z.infer<typeof supplierSchema>;
