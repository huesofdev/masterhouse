import { LoginPayload } from './auth.types'
import { AppError } from '../../error/AppError'
import { generateToken } from '../../middlewares/jwt.middleware'
import { UserService } from '../user/user.service'
import { db } from '../../db'
import { usersTable } from '../user/user.schema'
import { eq, inArray } from 'drizzle-orm'
import { branchesTable } from '../branches/branches.schema'
import { promisify } from 'node:util'
import { scrypt } from 'node:crypto'

const scryptAsync = promisify(scrypt)

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const [salt, key] = hash.split(':')
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer
  return key === derivedKey.toString('hex')
}

export class AuthService {
  static async login(payload: LoginPayload) {
    const userResult = await db.select().from(usersTable).where(eq(usersTable.email, payload.email)).limit(1)
    const user = userResult[0]

    if (!user || !(await verifyPassword(payload.password, user.password_hash))) {
      throw new AppError('Invalid credentials', 401)
    }

    if (!user.is_active) {
      throw new AppError('Account is disabled', 403)
    }

    const populatedUser = await UserService.getUser(user.id);
    const branchIds = populatedUser?.branch_ids || [];

    let userBranches: any[] = [];
    if (branchIds.length > 0) {
      userBranches = await db.select({ id: branchesTable.id, name: branchesTable.name, address: branchesTable.address })
        .from(branchesTable)
        .where(inArray(branchesTable.id, branchIds));
    }

    return {
      token: generateToken(user.id),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number || null,
        role_id: user.role_id,
        branch_ids: branchIds,
        branches: userBranches,
        max_discount_percentage: Number(user.max_discount_percentage || 0)
      }
    }
  }

  static async getMe(userId: string) {
    const userResult = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const user = userResult[0];

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.is_active) {
      throw new AppError('Account is disabled', 403);
    }

    const populatedUser = await UserService.getUser(user.id);
    const branchIds = populatedUser?.branch_ids || [];

    let userBranches: any[] = [];
    if (branchIds.length > 0) {
      userBranches = await db.select({ id: branchesTable.id, name: branchesTable.name, address: branchesTable.address })
        .from(branchesTable)
        .where(inArray(branchesTable.id, branchIds));
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number || null,
        role_id: user.role_id,
        branch_ids: branchIds,
        branches: userBranches,
        max_discount_percentage: Number(user.max_discount_percentage || 0)
      }
    };
  }
}
