import type { Request, Response, NextFunction } from "express";
import { createUserSchema, updateUserSchema, updateMeSchema, resetMyPasswordSchema } from "./user.types";
import { UserService } from "./user.service";
import { RbacService } from "../rbac/rbac.service";

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const user = await UserService.getUser(userId);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    let roleLevel = 0;
    if (user.role_id) {
      const role = await RbacService.getRole(user.role_id);
      if (role) roleLevel = role.level;
    }

    res.status(200).json({ success: true, data: { ...user, rank: roleLevel } });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = createUserSchema.parse(req.body);
    
    // Security Check: Scoping
    const userId = (req as any).user?.id;
    if (userId) {
      const creator = await UserService.getUser(userId);
      let actorLevel = 0;
      let hasGlobalBranchAccess = false;
      if (creator && creator.role_id) {
        const role = await RbacService.getRole(creator.role_id);
        if (role) {
          actorLevel = role.level;
          // Level 40 and above (Managers, Admins) or system users with no specific branch can assign any branch
          if (role.level >= 40 || (creator.branch_ids && creator.branch_ids.length === 0)) {
            hasGlobalBranchAccess = true;
          }
        }
      }
      
      // Enforce hierarchy
      if (payload.role_id) {
        const targetRole = await RbacService.getRole(payload.role_id);
        if (targetRole) {
          const isPeerCreationAllowed = targetRole.level === actorLevel && actorLevel === 100;
          if (targetRole.level > actorLevel || (targetRole.level === actorLevel && !isPeerCreationAllowed)) {
            res.status(403).json({ success: false, message: "Forbidden: You cannot create a user with a role rank equal to or higher than your own (unless you are Level 100)" });
            return;
          }
        }
      }

      if (payload.max_discount_percentage !== undefined && actorLevel < 50) {
        res.status(403).json({ success: false, message: "Forbidden: Only users with rank 50 or above can set maximum discount percentages" });
        return;
      }

      if (!hasGlobalBranchAccess) {
        // Enforce that the requested branch_ids are a subset of the creator's branch_ids
        const creatorBranches = creator?.branch_ids || [];
        const isSubset = payload.branch_ids.every(bid => creatorBranches.includes(bid));
        
        if (!isSubset) {
          res.status(403).json({ success: false, message: "Forbidden: You cannot assign users to branches outside your own scope" });
          return;
        }
      }
    }

    const { user, temporaryPassword } = await UserService.createUser(payload);
    
    res.status(201).json({ 
      success: true, 
      message: "User created successfully. Please provide the temporary password to the user securely.",
      data: user,
      temporaryPassword // Return this once so Admin can copy it
    });
  } catch (error) {
    next(error);
  }
};

export const adminResetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const temporaryPassword = await UserService.adminResetPassword(id);
    
    if (!temporaryPassword) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    
    res.status(200).json({ 
      success: true, 
      message: "Password reset successfully", 
      temporaryPassword 
    });
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const payload = updateMeSchema.parse(req.body);
    const user = await UserService.selfUpdateDetails(userId, payload);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const updateMyPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const payload = resetMyPasswordSchema.parse(req.body);
    
    await UserService.selfUpdatePassword(userId, payload);
    res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error: any) {
    if (error.message === "Invalid old password") {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const updateMyProfilePicture = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!req.file) {
      res.status(400).json({ success: false, message: "No file provided" });
      return;
    }

    const user = await UserService.updateMyProfilePicture(userId, req.file.buffer);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const user = await UserService.getUser(id);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const payload = updateUserSchema.parse(req.body);

    const actorId = (req as any).user?.id;
    if (actorId) {
      const actor = await UserService.getUser(actorId);
      const targetUser = await UserService.getUser(id);
      
      let actorLevel = 0;
      if (actor && actor.role_id) {
        const role = await RbacService.getRole(actor.role_id);
        if (role) actorLevel = role.level;
      }

      let targetLevel = 0;
      if (targetUser && targetUser.role_id) {
        const role = await RbacService.getRole(targetUser.role_id);
        if (role) targetLevel = role.level;
      }

      if (actorId !== id) {
        const isPeerEditAllowed = targetLevel === actorLevel && actorLevel === 100;
        if (targetLevel > actorLevel || (targetLevel === actorLevel && !isPeerEditAllowed)) {
          res.status(403).json({ success: false, message: "Forbidden: You cannot modify a user with a role rank equal to or higher than your own (unless Level 100)" });
          return;
        }
      }

      if (payload.role_id) {
        const newTargetRole = await RbacService.getRole(payload.role_id);
        if (newTargetRole) {
          const isPeerAssignAllowed = newTargetRole.level === actorLevel && actorLevel === 100;
          if (newTargetRole.level > actorLevel || (newTargetRole.level === actorLevel && !isPeerAssignAllowed)) {
            res.status(403).json({ success: false, message: "Forbidden: You cannot assign a role rank equal to or higher than your own (unless Level 100)" });
            return;
          }
        }
      }

      if (payload.max_discount_percentage !== undefined && actorLevel < 50) {
        res.status(403).json({ success: false, message: "Forbidden: Only users with rank 50 or above can modify maximum discount percentages" });
        return;
      }
    }

    const user = await UserService.updateUser(id, payload);
    
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};



export const listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const search = (req.query.search as string) || (req.query.q as string) || '';

    const result = await UserService.listUsers(branchId, page, limit, search);
    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    next(error);
  }
};

export const getStaffWallet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const branchId = req.query.branchId as string;

    if (!branchId) {
      res.status(400).json({ success: false, message: "branchId query parameter is required" });
      return;
    }

    const result = await UserService.getStaffWallet(id, branchId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const addWalletRepayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { branchId, amount, description, type } = req.body;

    if (!branchId || !amount || !description || !type) {
      res.status(400).json({ success: false, message: "branchId, amount, description, and type are required" });
      return;
    }

    if (type !== "REPAYMENT" && type !== "SALARY_DEDUCTION") {
      res.status(400).json({ success: false, message: "type must be REPAYMENT or SALARY_DEDUCTION" });
      return;
    }

    const result = await UserService.addWalletRepayment(id, branchId, parseFloat(amount), description, type);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const listWallets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const search = (req.query.search as string) || (req.query.q as string) || '';

    const result = await UserService.listWallets(branchId, page, limit, search);
    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    next(error);
  }
};
