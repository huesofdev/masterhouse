import { z } from 'zod';

export interface Branch {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
  phones?: { id: string; branch_id: string; phone_number: string }[];
}

export const branchSchema = z.object({
  name: z.string().min(1, 'Branch name is required').max(255),
  address: z.string().max(255).optional().nullable(),
  isActive: z.boolean().default(true),
  phones: z.array(z.object({
    value: z.string().regex(/^\d{10}$/, "Phone must be exactly 10 digits")
  })).default([]),
});

export type BranchFormValues = z.infer<typeof branchSchema>;
