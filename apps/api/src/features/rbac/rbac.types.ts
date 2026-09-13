import { z } from "zod";

export const createRoleSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  level: z.number().min(0).max(100).optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  level: z.number().min(0).max(100).optional(),
});

export const createPermissionSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
});

export const updatePermissionSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
});

export const assignPermissionSchema = z.object({
  permission_id: z.string().min(1, "Invalid permission ID"),
});

export const syncPermissionsSchema = z.object({
  permission_ids: z.array(z.string().min(1, "Invalid permission ID")),
});

export type CreateRolePayload = z.infer<typeof createRoleSchema>;
export type UpdateRolePayload = z.infer<typeof updateRoleSchema>;
export type CreatePermissionPayload = z.infer<typeof createPermissionSchema>;
export type UpdatePermissionPayload = z.infer<typeof updatePermissionSchema>;
export type AssignPermissionPayload = z.infer<typeof assignPermissionSchema>;
