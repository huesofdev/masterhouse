import { eq, and } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "../../db";
import { rolesTable, permissionsTable, rolePermissionsTable } from "./rbac.schema";
import { 
  CreateRolePayload, UpdateRolePayload, 
  CreatePermissionPayload, UpdatePermissionPayload 
} from "./rbac.types";

export class RbacService {
  // --- ROLES ---
  static async createRole(payload: CreateRolePayload) {
    const id = uuidv7();
    await db.insert(rolesTable).values({
      id,
      name: payload.name,
      description: payload.description || null,
    });
    return this.getRole(id);
  }

  static async getRole(id: string) {
    const result = await db.query.rolesTable.findFirst({
      where: eq(rolesTable.id, id),
      with: {
        permissions: {
          with: {
            permission: true
          }
        }
      }
    });
    return result || null;
  }

  static async listRoles() {
    return db.query.rolesTable.findMany({
      with: {
        permissions: {
          with: {
            permission: true
          }
        }
      }
    });
  }

  static async updateRole(id: string, payload: UpdateRolePayload) {
    if (Object.keys(payload).length > 0) {
      await db.update(rolesTable).set(payload).where(eq(rolesTable.id, id));
    }
    return this.getRole(id);
  }

  static async deleteRole(id: string) {
    // Delete role_permissions first
    await db.delete(rolePermissionsTable).where(eq(rolePermissionsTable.role_id, id));
    const result = await db.delete(rolesTable).where(eq(rolesTable.id, id));
    return result[0].affectedRows > 0;
  }

  // --- PERMISSIONS ---
  static async createPermission(payload: CreatePermissionPayload) {
    const id = uuidv7();
    await db.insert(permissionsTable).values({
      id,
      name: payload.name,
      description: payload.description || null,
    });
    return this.getPermission(id);
  }

  static async getPermission(id: string) {
    const result = await db.select().from(permissionsTable).where(eq(permissionsTable.id, id)).limit(1);
    return result[0] || null;
  }

  static async listPermissions() {
    return db.select().from(permissionsTable);
  }

  static async updatePermission(id: string, payload: UpdatePermissionPayload) {
    if (Object.keys(payload).length > 0) {
      await db.update(permissionsTable).set(payload).where(eq(permissionsTable.id, id));
    }
    return this.getPermission(id);
  }

  static async deletePermission(id: string) {
    await db.delete(rolePermissionsTable).where(eq(rolePermissionsTable.permission_id, id));
    const result = await db.delete(permissionsTable).where(eq(permissionsTable.id, id));
    return result[0].affectedRows > 0;
  }

  // --- ASSIGNMENTS ---
  static async assignPermissionToRole(roleId: string, permissionId: string) {
    await db.insert(rolePermissionsTable).values({
      role_id: roleId,
      permission_id: permissionId,
    });
    return this.getRole(roleId);
  }

  static async removePermissionFromRole(roleId: string, permissionId: string) {
    await db.delete(rolePermissionsTable)
      .where(and(eq(rolePermissionsTable.role_id, roleId), eq(rolePermissionsTable.permission_id, permissionId)));
    return this.getRole(roleId);
  }

  static async syncPermissionsForRole(roleId: string, permissionIds: string[]) {
    await db.transaction(async (tx) => {
      await tx.delete(rolePermissionsTable).where(eq(rolePermissionsTable.role_id, roleId));
      if (permissionIds.length > 0) {
        const values = permissionIds.map(pid => ({ role_id: roleId, permission_id: pid }));
        await tx.insert(rolePermissionsTable).values(values);
      }
    });
    return this.getRole(roleId);
  }
}
