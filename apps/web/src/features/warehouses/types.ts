import { z } from 'zod';

export interface Warehouse {
  id: string;
  branch_id: string;
  name: string;
  address: string;
  phone?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export const warehouseSchema = z.object({
  name: z.string().min(1, 'Warehouse name is required').max(255),
  address: z.string().min(1, 'Address is required').max(255),
  phone: z.string().max(50, 'Phone must be under 50 characters').optional().or(z.literal('')),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export type WarehouseFormValues = z.infer<typeof warehouseSchema>;
