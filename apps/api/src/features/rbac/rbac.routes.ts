import { Router } from "express";
import { 
  createRole, getRole, listRoles, updateRole, deleteRole,
  createPermission, getPermission, listPermissions, updatePermission, deletePermission,
  assignPermissionToRole, removePermissionFromRole, syncPermissionsForRole
} from "./rbac.controller";
import { requireAuth } from "../../middlewares/jwt.middleware";
import { requireBranchScope } from "../../middlewares/branch.middleware";

const router = Router();

// Protect all RBAC routes with auth and branch scope
router.use(requireAuth);
router.use(requireBranchScope);

// Roles
router.post("/roles", createRole);
router.get("/roles", listRoles);
router.get("/roles/:id", getRole);
router.put("/roles/:id", updateRole);
router.delete("/roles/:id", deleteRole);

// Role Permissions
router.post("/roles/:roleId/permissions", assignPermissionToRole);
router.delete("/roles/:roleId/permissions/:permissionId", removePermissionFromRole);
router.put("/roles/:roleId/permissions", syncPermissionsForRole);

// Permissions
router.post("/permissions", createPermission);
router.get("/permissions", listPermissions);
router.get("/permissions/:id", getPermission);
router.put("/permissions/:id", updatePermission);
router.delete("/permissions/:id", deletePermission);

export default router;
