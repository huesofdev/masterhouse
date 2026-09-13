import { eq, inArray, sql, and, or, like } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "../../db";
import { usersTable, userBranchesTable, staffWalletsTable, staffWalletTransactionsTable } from "./user.schema";
import { rolesTable, rolePermissionsTable, permissionsTable } from "../rbac/rbac.schema";
import { CreateUserPayload, UpdateUserPayload, UserResponse, UpdateMePayload, ResetMyPasswordPayload } from "./user.types";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import sharp from "sharp";
import { S3Util } from "../../utils/s3.util";

const scryptAsync = promisify(scrypt);

const hashPassword = async (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
};

export class UserService {
  static async createUser(payload: CreateUserPayload): Promise<{ user: UserResponse, temporaryPassword: string }> {
    const userId = uuidv7();
    
    // Auto-generate a secure temporary password (8 characters hex = 16 chars string, let's just do 8 random chars)
    const temporaryPassword = randomBytes(4).toString("hex");
    const passwordHash = await hashPassword(temporaryPassword);

    await db.transaction(async (tx) => {
      // Insert User
      await tx.insert(usersTable).values({
        id: userId,
        email: payload.email,
        name: payload.name || null,
        phone_number: payload.phone_number || null,
        password_hash: passwordHash,
        role_id: payload.role_id || null,
        is_active: payload.is_active !== undefined ? payload.is_active : true,
        max_discount_percentage: payload.max_discount_percentage !== undefined ? payload.max_discount_percentage.toString() : "0.00",
      });

      // Insert User Branches
      if (payload.branch_ids && payload.branch_ids.length > 0) {
        const branchMappings = payload.branch_ids.map(bid => ({
          user_id: userId,
          branch_id: bid,
        }));
        await tx.insert(userBranchesTable).values(branchMappings);
      }
    });

    const user = await this.getUser(userId);
    return { user: user!, temporaryPassword };
  }

  static async getUser(id: string): Promise<UserResponse | null> {
    const result = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, id),
      with: {
        userBranches: true,
        role: true,
      }
    });
    
    if (!result) return null;

    let permissions: string[] = [];
    if (result.role_id) {
      const rolePerms = await db
        .select({ name: permissionsTable.name })
        .from(rolePermissionsTable)
        .innerJoin(permissionsTable, eq(rolePermissionsTable.permission_id, permissionsTable.id))
        .where(eq(rolePermissionsTable.role_id, result.role_id));
      
      permissions = rolePerms.map(p => p.name);
    }

    return {
      id: result.id,
      email: result.email,
      name: result.name,
      phone_number: result.phone_number,
      role_id: result.role_id,
      rank: result.role?.level ?? 0,
      is_active: result.is_active,
      max_discount_percentage: result.max_discount_percentage,
      profile_picture_url: result.profile_picture_url ? await S3Util.getSignedDownloadUrl(result.profile_picture_url) : undefined,
      branch_ids: result.userBranches.map(ub => ub.branch_id),
      permissions: permissions,
    } as any; // Using any to avoid type check errors if UserResponse is not yet updated
  }

  static async updateUser(id: string, payload: UpdateUserPayload): Promise<UserResponse | null> {
    await db.transaction(async (tx) => {
      const updateData: Partial<typeof usersTable.$inferInsert> = {};
      
      if (payload.email) updateData.email = payload.email;
      if (payload.name) updateData.name = payload.name;
      if (payload.phone_number !== undefined) updateData.phone_number = payload.phone_number;
      if (payload.role_id !== undefined) updateData.role_id = payload.role_id;
      if (payload.is_active !== undefined) updateData.is_active = payload.is_active;
      if (payload.max_discount_percentage !== undefined) updateData.max_discount_percentage = payload.max_discount_percentage.toString();

      if (Object.keys(updateData).length > 0) {
        await tx.update(usersTable).set(updateData).where(eq(usersTable.id, id));
      }

      // Handle branch replacements
      if (payload.branch_ids) {
        // Delete old mappings
        await tx.delete(userBranchesTable).where(eq(userBranchesTable.user_id, id));
        
        // Insert new mappings
        if (payload.branch_ids.length > 0) {
          const branchMappings = payload.branch_ids.map(bid => ({
            user_id: id,
            branch_id: bid,
          }));
          await tx.insert(userBranchesTable).values(branchMappings);
        }
      }
    });

    return this.getUser(id);
  }

  static async adminResetPassword(id: string): Promise<string | null> {
    const user = await this.getUser(id);
    if (!user) return null;

    const temporaryPassword = randomBytes(4).toString("hex");
    const passwordHash = await hashPassword(temporaryPassword);

    await db.update(usersTable).set({ password_hash: passwordHash }).where(eq(usersTable.id, id));
    return temporaryPassword;
  }

  static async selfUpdatePassword(id: string, payload: ResetMyPasswordPayload): Promise<boolean> {
    const result = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!result[0]) return false;

    // Verify old password
    const [salt, key] = result[0].password_hash.split(':');
    const derivedKey = (await scryptAsync(payload.old_password, salt, 64)) as Buffer;
    
    if (key !== derivedKey.toString('hex')) {
      throw new Error("Invalid old password");
    }

    const newHash = await hashPassword(payload.new_password);
    await db.update(usersTable).set({ password_hash: newHash }).where(eq(usersTable.id, id));
    return true;
  }

  static async selfUpdateDetails(id: string, payload: UpdateMePayload): Promise<UserResponse | null> {
    const updateData: Partial<typeof usersTable.$inferInsert> = {};
    if (payload.email) updateData.email = payload.email;
    if (payload.name) updateData.name = payload.name;
    if (payload.phone_number !== undefined) updateData.phone_number = payload.phone_number;

    if (Object.keys(updateData).length > 0) {
      await db.update(usersTable).set(updateData).where(eq(usersTable.id, id));
    }
    return this.getUser(id);
  }

  static async updateMyProfilePicture(id: string, fileBuffer: Buffer): Promise<UserResponse | null> {
    const compressedBuffer = await sharp(fileBuffer)
      .resize({ width: 300, height: 300, fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    const key = `profiles/${id}-${Date.now()}.webp`;
    const uploadedKey = await S3Util.uploadBuffer(compressedBuffer, key, "image/webp");

    await db.update(usersTable).set({ profile_picture_url: uploadedKey }).where(eq(usersTable.id, id));

    return this.getUser(id);
  }

  static async deleteUser(id: string): Promise<boolean> {
    // In many enterprise systems, we prefer soft delete (is_active = false)
    // But if we hard delete, userBranches junction drops automatically due to constraints
    const result = await db.delete(usersTable).where(eq(usersTable.id, id));
    return result[0].affectedRows > 0;
  }
  
  static async listUsers(
    branchId?: string,
    page: number = 1,
    limit: number = 30,
    search: string = ''
  ): Promise<{ data: UserResponse[], meta: { total_records: number, total_pages: number, current_page: number, page_size: number } }> {
    const offset = (page - 1) * limit;

    const conditions = [];
    if (branchId) {
      conditions.push(
        inArray(
          usersTable.id,
          db.select({ user_id: userBranchesTable.user_id })
            .from(userBranchesTable)
            .where(eq(userBranchesTable.branch_id, branchId))
        )
      );
    }
    
    if (search) {
      conditions.push(
        or(
          like(usersTable.name, `%${search}%`),
          like(usersTable.email, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db.query.usersTable.findMany({
      where: whereClause,
      limit,
      offset,
      with: { userBranches: true }
    });

    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(usersTable)
      .where(whereClause);

    const data = results.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      phone_number: user.phone_number,
      role_id: user.role_id,
      is_active: user.is_active,
      max_discount_percentage: user.max_discount_percentage,
      branch_ids: user.userBranches.map(ub => ub.branch_id),
    }));

    return {
      data,
      meta: {
        total_records: Number(count),
        total_pages: Math.ceil(Number(count) / limit),
        current_page: page,
        page_size: limit
      }
    };
  }

  static async listWallets(branchId: string, page: number = 1, limit: number = 30, search: string = '') {
    // Re-use listUsers logic but map the wallet balance
    const usersList = await this.listUsers(branchId, page, limit, search);
    const userIds = usersList.data.map(u => u.id);
    
    let balancesMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const wallets = await db.select().from(staffWalletsTable)
        .where(and(eq(staffWalletsTable.branch_id, branchId), inArray(staffWalletsTable.user_id, userIds)));
      
      for (const w of wallets) {
        balancesMap[w.user_id] = w.balance;
      }
    }

    const data = usersList.data.map(u => ({
      user_id: u.id,
      name: u.name,
      email: u.email,
      role_id: u.role_id,
      balance: balancesMap[u.id] || "0.00"
    }));

    return {
      data,
      meta: usersList.meta
    };
  }

  static async getStaffWallet(userId: string, branchId: string) {
    let walletRes = await db.select().from(staffWalletsTable)
      .where(and(eq(staffWalletsTable.user_id, userId), eq(staffWalletsTable.branch_id, branchId)));

    if (walletRes.length === 0) {
      return { balance: "0.00", transactions: [] };
    }

    const walletId = walletRes[0].id;
    const transactions = await db.select().from(staffWalletTransactionsTable)
      .where(eq(staffWalletTransactionsTable.wallet_id, walletId))
      .orderBy(sql`${staffWalletTransactionsTable.created_at} DESC`);

    return {
      balance: walletRes[0].balance,
      transactions
    };
  }

  static async addWalletRepayment(userId: string, branchId: string, amount: number, description: string, type: "REPAYMENT" | "SALARY_DEDUCTION") {
    return await db.transaction(async (tx) => {
      let walletRes = await tx.select().from(staffWalletsTable)
        .where(and(eq(staffWalletsTable.user_id, userId), eq(staffWalletsTable.branch_id, branchId)));

      let walletId = "";
      let currentBalance = 0;

      if (walletRes.length === 0) {
        walletId = uuidv7();
        await tx.insert(staffWalletsTable).values({
          id: walletId,
          user_id: userId,
          branch_id: branchId,
          balance: "0.00"
        });
      } else {
        walletId = walletRes[0].id;
        currentBalance = parseFloat(walletRes[0].balance);
      }

      // Repayment increases balance (reduces the negative amount owed)
      const newBalance = currentBalance + amount;

      await tx.insert(staffWalletTransactionsTable).values({
        id: uuidv7(),
        wallet_id: walletId,
        type: type,
        amount: amount.toString(),
        description: description,
      });

      await tx.update(staffWalletsTable)
        .set({ balance: newBalance.toString() })
        .where(eq(staffWalletsTable.id, walletId));

      return { success: true, newBalance };
    });
  }
}
