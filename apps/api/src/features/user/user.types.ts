import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  phone_number: z.string().max(50, "Phone number is too long").nullable().optional(),
  role_id: z.string().uuid("Invalid Role ID").optional(),
  // Must provide at least one branch
  branch_ids: z.array(z.string().uuid("Invalid Branch ID")).min(1, "User must be assigned to at least one branch"),
  is_active: z.boolean().default(true),
  max_discount_percentage: z.number().min(0).max(100).optional(),
});

export type CreateUserPayload = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  email: z.string().email("Invalid email format").optional(),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  phone_number: z.string().max(50, "Phone number is too long").nullable().optional(),
  role_id: z.string().uuid("Invalid Role ID").optional(),
  branch_ids: z.array(z.string().uuid("Invalid Branch ID")).min(1, "User must be assigned to at least one branch").optional(),
  is_active: z.boolean().optional(),
  max_discount_percentage: z.number().min(0).max(100).optional(),
});

export type UpdateUserPayload = z.infer<typeof updateUserSchema>;

export const updateMeSchema = z.object({
  email: z.string().email("Invalid email format").optional(),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  phone_number: z.string().max(50, "Phone number is too long").nullable().optional(),
});

export type UpdateMePayload = z.infer<typeof updateMeSchema>;

export const resetMyPasswordSchema = z.object({
  old_password: z.string().min(1, "Old password is required"),
  new_password: z.string().min(8, "New password must be at least 8 characters long"),
});

export type ResetMyPasswordPayload = z.infer<typeof resetMyPasswordSchema>;

export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  phone_number: string | null;
  role_id: string | null;
  is_active: boolean;
  max_discount_percentage: string;
  branch_ids: string[];
  profile_picture_url?: string;
}
