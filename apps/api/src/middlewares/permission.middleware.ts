import type { Request, Response, NextFunction } from "express";
import { UserService } from "../features/user/user.service";
import { RbacService } from "../features/rbac/rbac.service";

export const requirePermission = (requiredPermission: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
        return;
      }

      const user = await UserService.getUser(userId);
      if (!user || !user.role_id) {
        res.status(403).json({ success: false, message: "Forbidden: No role assigned" });
        return;
      }

      const role = await RbacService.getRole(user.role_id);
      if (!role) {
        res.status(403).json({ success: false, message: "Forbidden: Role not found" });
        return;
      }

      const hasPermission = role.permissions.some(rp => rp.permission.name === requiredPermission);
      
      // Users with a role level >= 90 (Owner/SuperAdmin) bypass all individual permission checks
      const isSuperAdmin = role.level >= 90;
      
      if (!hasPermission && !isSuperAdmin) {
        res.status(403).json({ success: false, message: `Forbidden: Missing required permission: ${requiredPermission}` });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({ success: false, message: "Internal Server Error during permission validation" });
    }
  };
};
