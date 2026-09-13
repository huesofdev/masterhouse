import { z } from 'zod';

export interface Permission {
  id: string;
  name: string;
  description: string | null;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
  permission: Permission;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  level: number;
  permissions: RolePermission[];
}

export const roleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(255),
  description: z.string().max(255).optional().nullable(),
  level: z.coerce.number().min(0).max(100).default(10),
});

export type RoleFormValues = z.infer<typeof roleSchema>;
