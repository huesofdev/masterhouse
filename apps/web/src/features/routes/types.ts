import { z } from 'zod';

export interface RouteArea {
  id?: string;
  name: string;
}

export interface Route {
  id: string;
  branch_id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  areas?: RouteArea[];
}

export const routeSchema = z.object({
  code: z.string().min(1, 'Route code is required').max(50),
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  description: z.string().max(255).optional().or(z.literal('')),
  is_active: z.boolean().default(true),
  areas: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Area name is required')
  })).optional()
});

export type RouteFormValues = z.infer<typeof routeSchema>;
