import { z } from 'zod';

export interface User {
  id: string;
  email: string;
  name: string | null;
  phone_number: string | null;
  role_id: string | null;
  is_active: boolean;
  max_discount_percentage: string;
  branch_ids: string[];
}

export const userFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional().or(z.literal('')),
  phone_number: z.string().max(50, 'Phone number must be under 50 characters').optional().or(z.literal('')),
  role_id: z.string().uuid('Invalid Role ID').optional().or(z.literal('')),
  branch_ids: z.array(z.string().uuid('Invalid Branch ID')).min(1, 'User must be assigned to at least one branch'),
  is_active: z.boolean().default(true),
  max_discount_percentage: z.coerce.number().min(0).max(100).optional(),
});

export type UserFormValues = z.infer<typeof userFormSchema>;
