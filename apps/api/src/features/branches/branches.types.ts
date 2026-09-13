import { z } from "zod";

export const createBranchSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  address: z.string().optional(),
  phones: z.array(z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits")).default([]),
  isActive: z.boolean().optional(),
});

export const updateBranchSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().optional(),
  phones: z.array(z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits")).optional(),
  isActive: z.boolean().optional(),
});

export type CreateBranchPayload = z.infer<typeof createBranchSchema>;
export type UpdateBranchPayload = z.infer<typeof updateBranchSchema>;
