import { eq, and, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "../../db";
import { warehousesTable } from "./warehouses.schema";
import { usersTable } from "../user/user.schema";
import { CreateWarehousePayload, UpdateWarehousePayload } from "./warehouses.types";

export class WarehousesService {
  static async createWarehouse(branchId: string, payload: CreateWarehousePayload) {
    const id = uuidv7();

    // If this is set as default, we might want to unset others for this branch. Keep it simple for now.
    if (payload.is_default) {
      await db.update(warehousesTable)
        .set({ is_default: false })
        .where(eq(warehousesTable.branch_id, branchId));
    }

    await db.insert(warehousesTable).values({
      id,
      branch_id: branchId,
      name: payload.name,
      address: payload.address,
      phone: payload.phone,
      is_default: payload.is_default,
    });
    return this.getWarehouse(id);
  }

  static async getWarehouse(id: string) {
    const result = await db.query.warehousesTable.findFirst({
      where: eq(warehousesTable.id, id),
      with: { branch: true },
    });
    return result || null;
  }

  static async listWarehouses(branchId: string) {
    return db.query.warehousesTable.findMany({
      where: eq(warehousesTable.branch_id, branchId),
      orderBy: (warehouses, { desc }) => [desc(warehouses.created_at)],
      with: { branch: true }
    });
  }

  static async listAllWarehouses(userId: string) {
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, userId),
      with: { role: true, userBranches: true }
    });

    if (!user) {
      throw new Error("User not found");
    }

    const level = user.role?.level || 0;
    
    // Level >= 50 has full access
    if (level >= 50) {
      return db.query.warehousesTable.findMany({
        orderBy: (warehouses: any, { desc }: any) => [desc(warehouses.created_at)],
        with: { branch: true }
      });
    }

    // Level < 50 can only see assigned branches
    const assignedBranchIds = user.userBranches.map((ub: any) => ub.branch_id);
    if (assignedBranchIds.length === 0) {
      return []; // No assigned branches, no warehouses
    }

    return db.query.warehousesTable.findMany({
      where: inArray(warehousesTable.branch_id, assignedBranchIds),
      orderBy: (warehouses: any, { desc }: any) => [desc(warehouses.created_at)],
      with: { branch: true }
    });
  }

  static async updateWarehouse(id: string, branchId: string, payload: UpdateWarehousePayload) {
    if (payload.is_default) {
      await db.update(warehousesTable)
        .set({ is_default: false })
        .where(eq(warehousesTable.branch_id, branchId));
    }

    if (Object.keys(payload).length > 0) {
      await db.update(warehousesTable).set(payload).where(eq(warehousesTable.id, id));
    }
    return this.getWarehouse(id);
  }

  static async deleteWarehouse(id: string) {
    const result = await db.delete(warehousesTable).where(eq(warehousesTable.id, id));
    return result[0].affectedRows > 0;
  }
}
