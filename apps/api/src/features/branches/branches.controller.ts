import type { Request, Response, NextFunction } from "express";
import { BranchesService } from "./branches.service";
import { createBranchSchema, updateBranchSchema } from "./branches.types";
import { UserService } from "../user/user.service";
import { RbacService } from "../rbac/rbac.service";

export const createBranch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = createBranchSchema.parse(req.body);
    const branch = await BranchesService.createBranch(payload);
    res.status(201).json({ success: true, data: branch });
  } catch (error) { next(error); }
};

export const getBranch = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branch = await BranchesService.getBranch(req.params.id);
    if (!branch) { res.status(404).json({ success: false, message: "Branch not found" }); return; }
    res.status(200).json({ success: true, data: branch });
  } catch (error) { next(error); }
};

export const listBranches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branches = await BranchesService.listBranches();
    
    // Filter branches based on user access
    const userId = (req as any).user?.id;
    if (userId) {
      const user = await UserService.getUser(userId);
      if (user) {
        let isSuperAdmin = false;
        if (user.role_id) {
          const role = await RbacService.getRole(user.role_id);
          if (role && role.level >= 50) isSuperAdmin = true;
        }

        if (!isSuperAdmin) {
          const allowedBranches = branches.filter(b => user.branch_ids.includes(b.id));
          res.status(200).json({ success: true, data: allowedBranches });
          return;
        }
      }
    }

    res.status(200).json({ success: true, data: branches });
  } catch (error) { next(error); }
};

export const updateBranch = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = updateBranchSchema.parse(req.body);
    const branch = await BranchesService.updateBranch(req.params.id, payload);
    if (!branch) { res.status(404).json({ success: false, message: "Branch not found" }); return; }
    res.status(200).json({ success: true, data: branch });
  } catch (error) { next(error); }
};
