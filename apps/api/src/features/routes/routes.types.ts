import { z } from "zod";

export const createRouteSchema = z.object({
  code: z.string().min(1, "Code is required").max(50),
  name: z.string().min(2, "Name is required").max(255),
  description: z.string().max(255).optional().or(z.literal("")),
  is_active: z.boolean().default(true),
  areas: z.array(z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1, "Area name is required").max(255),
  })).optional(),
});

export type CreateRoutePayload = z.infer<typeof createRouteSchema>;

export const updateRouteSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(2).max(255).optional(),
  description: z.string().max(255).optional().or(z.literal("")),
  is_active: z.boolean().optional(),
  areas: z.array(z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1, "Area name is required").max(255),
  })).optional(),
});

export type UpdateRoutePayload = z.infer<typeof updateRouteSchema>;
