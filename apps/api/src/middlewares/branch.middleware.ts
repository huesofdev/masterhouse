import type { Request, Response, NextFunction } from "express";
import { UserService } from "../features/user/user.service";
import { RbacService } from "../features/rbac/rbac.service";
import { BranchesService } from "../features/branches/branches.service";

export const requireBranchScope = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized: User not authenticated" });
      return;
    }

    const user = await UserService.getUser(userId);
    if (!user) {
      res.status(401).json({ success: false, message: "Unauthorized: User not found" });
      return;
    }

    let isGlobalAdmin = false;
    if (user.role_id) {
      const role = await RbacService.getRole(user.role_id);
      if (role && role.level >= 50) {
        isGlobalAdmin = true;
      }
    }

    const branchId = req.headers["x-branch-id"] as string;

    if (!branchId) {
      if (isGlobalAdmin) {
        // Allow Global/Tenant Admins to bypass branch scope
        return next();
      }
      res.status(400).json({ success: false, message: "Bad Request: x-branch-id header is missing" });
      return;
    }

    // 1. Verify the branch exists and is active
    const branch = await BranchesService.getBranch(branchId);
    if (!branch || !branch.isActive) {
      res.status(403).json({ success: false, message: "Forbidden: Branch not found or inactive" });
      return;
    }

    // 2. Verify the authenticated user has access to this branch
    if (!isGlobalAdmin && !user.branch_ids.includes(branchId)) {
      res.status(403).json({ success: false, message: "Forbidden: You do not have access to this branch scope" });
      return;
    }

    // 3. Attach branch context to the request
    (req as any).branchId = branchId;
    
    next();
  } catch (error) {
    console.error("[BRANCH SCOPE ERROR]:", error);
    res.status(500).json({ success: false, message: "Internal Server Error during branch scope validation" });
  }
};
