import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "../../db";
import { branchesTable, branchPhonesTable } from "./branches.schema";
import { CreateBranchPayload, UpdateBranchPayload } from "./branches.types";

export class BranchesService {
  static async createBranch(payload: CreateBranchPayload) {
    const id = uuidv7();
    
    await db.transaction(async (tx) => {
      await tx.insert(branchesTable).values({
        id,
        name: payload.name,
        address: payload.address || null,
        isActive: payload.isActive !== undefined ? payload.isActive : true,
      });

      if (payload.phones && payload.phones.length > 0) {
        // remove duplicates from the input
        const uniquePhones = Array.from(new Set(payload.phones));
        const phoneValues = uniquePhones.map(phone => ({
          id: uuidv7(),
          branch_id: id,
          phone_number: phone,
        }));
        await tx.insert(branchPhonesTable).values(phoneValues);
      }
    });

    return this.getBranch(id);
  }

  static async getBranch(id: string) {
    const result = await db.query.branchesTable.findFirst({
      where: eq(branchesTable.id, id),
      with: { phones: true },
    });
    return result || null;
  }

  static async listBranches() {
    return db.query.branchesTable.findMany({
      with: { phones: true },
    });
  }

  static async updateBranch(id: string, payload: UpdateBranchPayload) {
    await db.transaction(async (tx) => {
      const updateData: any = {};
      if (payload.name !== undefined) updateData.name = payload.name;
      if (payload.address !== undefined) updateData.address = payload.address;
      if (payload.isActive !== undefined) updateData.isActive = payload.isActive;

      if (Object.keys(updateData).length > 0) {
        await tx.update(branchesTable).set(updateData).where(eq(branchesTable.id, id));
      }

      if (payload.phones !== undefined) {
        // Clear existing phones and insert new ones
        await tx.delete(branchPhonesTable).where(eq(branchPhonesTable.branch_id, id));
        
        if (payload.phones.length > 0) {
          const uniquePhones = Array.from(new Set(payload.phones));
          const phoneValues = uniquePhones.map(phone => ({
            id: uuidv7(),
            branch_id: id,
            phone_number: phone,
          }));
          await tx.insert(branchPhonesTable).values(phoneValues);
        }
      }
    });

    return this.getBranch(id);
  }
}
