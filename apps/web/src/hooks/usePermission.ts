import { useAuth } from './useAuth';

export function usePermission(permission: string): boolean {
  return useAuth((s) => s.hasPermission(permission));
}
