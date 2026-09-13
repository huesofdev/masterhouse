import type { Request, Response, NextFunction } from "express";
import { RbacService } from "./rbac.service";
import { 
  createRoleSchema, updateRoleSchema, 
  createPermissionSchema, updatePermissionSchema, assignPermissionSchema, syncPermissionsSchema
} from "./rbac.types";
import { UserService } from "../user/user.service";

// --- ROLES ---
export const createRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = createRoleSchema.parse(req.body);
    
    // Check hierarchy
    const actorId = (req as any).user?.id;
    if (actorId && payload.level !== undefined) {
      const actor = await UserService.getUser(actorId);
      let actorLevel = 0;
      if (actor && actor.role_id) {
        const role = await RbacService.getRole(actor.role_id);
        if (role) actorLevel = role.level;
      }
      
      const isPeerAllowed = payload.level === actorLevel && actorLevel === 100;
      if (payload.level > actorLevel || (payload.level === actorLevel && !isPeerAllowed)) {
        res.status(403).json({ success: false, message: "Forbidden: You cannot create a role with a rank equal to or higher than your own (unless Level 100)" });
        return;
      }
    }

    const role = await RbacService.createRole(payload);
    res.status(201).json({ success: true, data: role });
  } catch (error) { next(error); }
};

export const getRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = await RbacService.getRole(req.params.id as string);
    if (!role) { res.status(404).json({ success: false, message: "Role not found" }); return; }
    res.status(200).json({ success: true, data: role });
  } catch (error) { next(error); }
};

export const listRoles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const roles = await RbacService.listRoles();
    res.status(200).json({ success: true, data: roles });
  } catch (error) { next(error); }
};

export const updateRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const payload = updateRoleSchema.parse(req.body);
    
    // Check hierarchy
    const actorId = (req as any).user?.id;
    if (actorId) {
      const actor = await UserService.getUser(actorId);
      let actorLevel = 0;
      if (actor && actor.role_id) {
        const role = await RbacService.getRole(actor.role_id);
        if (role) actorLevel = role.level;
      }

      // target level check (cannot edit a role that is already >= your level)
      const targetRole = await RbacService.getRole(id);
      if (targetRole) {
        const targetLevel = targetRole.level;
        const isPeerEditAllowed = targetLevel === actorLevel && actorLevel === 100;
        if (targetLevel > actorLevel || (targetLevel === actorLevel && !isPeerEditAllowed)) {
          res.status(403).json({ success: false, message: "Forbidden: You cannot modify a role with a rank equal to or higher than your own (unless Level 100)" });
          return;
        }
      }

      // payload level check (cannot promote a role to >= your level)
      if (payload.level !== undefined) {
        const isPeerAssignAllowed = payload.level === actorLevel && actorLevel === 100;
        if (payload.level > actorLevel || (payload.level === actorLevel && !isPeerAssignAllowed)) {
          res.status(403).json({ success: false, message: "Forbidden: You cannot assign a role rank equal to or higher than your own (unless Level 100)" });
          return;
        }
      }
    }

    const role = await RbacService.updateRole(id, payload);
    if (!role) { res.status(404).json({ success: false, message: "Role not found" }); return; }
    res.status(200).json({ success: true, data: role });
  } catch (error) { next(error); }
};

export const deleteRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deleted = await RbacService.deleteRole(req.params.id as string);
    if (!deleted) { res.status(404).json({ success: false, message: "Role not found" }); return; }
    res.status(200).json({ success: true, message: "Role deleted successfully" });
  } catch (error) { next(error); }
};

// --- PERMISSIONS ---
export const createPermission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = createPermissionSchema.parse(req.body);
    const permission = await RbacService.createPermission(payload);
    res.status(201).json({ success: true, data: permission });
  } catch (error) { next(error); }
};

export const getPermission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const permission = await RbacService.getPermission(req.params.id as string);
    if (!permission) { res.status(404).json({ success: false, message: "Permission not found" }); return; }
    res.status(200).json({ success: true, data: permission });
  } catch (error) { next(error); }
};

export const listPermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const permissions = await RbacService.listPermissions();
    res.status(200).json({ success: true, data: permissions });
  } catch (error) { next(error); }
};

export const updatePermission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = updatePermissionSchema.parse(req.body);
    const permission = await RbacService.updatePermission(req.params.id as string, payload);
    if (!permission) { res.status(404).json({ success: false, message: "Permission not found" }); return; }
    res.status(200).json({ success: true, data: permission });
  } catch (error) { next(error); }
};

export const deletePermission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deleted = await RbacService.deletePermission(req.params.id as string);
    if (!deleted) { res.status(404).json({ success: false, message: "Permission not found" }); return; }
    res.status(200).json({ success: true, message: "Permission deleted successfully" });
  } catch (error) { next(error); }
};

// --- ASSIGNMENTS ---
export const assignPermissionToRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { permission_id } = assignPermissionSchema.parse(req.body);
    const role = await RbacService.assignPermissionToRole(req.params.roleId as string, permission_id);
    res.status(200).json({ success: true, data: role });
  } catch (error) { next(error); }
};

export const removePermissionFromRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const permissionId = req.params.permissionId as string;
    const role = await RbacService.removePermissionFromRole(req.params.roleId as string, permissionId);
    res.status(200).json({ success: true, data: role });
  } catch (error) { next(error); }
};

export const syncPermissionsForRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { permission_ids } = syncPermissionsSchema.parse(req.body);
    const role = await RbacService.syncPermissionsForRole(req.params.roleId as string, permission_ids);
    res.status(200).json({ success: true, data: role, message: "Permissions synced successfully" });
  } catch (error) { next(error); }
};
