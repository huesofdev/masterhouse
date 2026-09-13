import type { Request, Response, NextFunction } from "express";
import { resolveConflictSchema } from "./sync.types";
import { SyncService } from "./sync.service";
import { S3Util } from "../../utils/s3.util";
import crypto from "crypto";
import sharp from "sharp";

export const uploadFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }

    const fileExt = file.originalname.split(".").pop() || "jpg";
    const uniqueKey = `sync_uploads/${crypto.randomUUID()}.${fileExt}`;

    let buffer = file.buffer;
    
    if (file.mimetype.startsWith("image/")) {
      try {
        if (buffer.length === 0) throw new Error("Empty buffer");
        buffer = await sharp(buffer)
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .jpeg({ quality: 60 })
          .toBuffer();
      } catch (sharpError) {
        // Fallback for corrupted/0-byte images (e.g. from buggy blank signatures)
        // Generate a 1x1 white JPEG so the sync queue can proceed instead of being permanently blocked
        buffer = await sharp({
          create: { width: 1, height: 1, channels: 3, background: { r: 255, g: 255, b: 255 } }
        }).jpeg().toBuffer();
      }
    }

    const uploadedKey = await S3Util.uploadBuffer(buffer, uniqueKey, file.mimetype.startsWith("image/") ? "image/jpeg" : file.mimetype);

    res.status(200).json({ success: true, key: uploadedKey });
  } catch (error) {
    next(error);
  }
};

export const listConflicts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    if (!branchId) {
      res.status(400).json({ success: false, message: "Branch context missing" });
      return;
    }

    const conflicts = await SyncService.listPendingConflicts(branchId);
    res.status(200).json({ success: true, data: conflicts });
  } catch (error) {
    next(error);
  }
};

export const getConflict = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const id = req.params.id as string;
    
    const conflict = await SyncService.getConflict(id, branchId);
    if (!conflict) {
      res.status(404).json({ success: false, message: "Conflict not found" });
      return;
    }
    
    res.status(200).json({ success: true, data: conflict });
  } catch (error) {
    next(error);
  }
};

export const resolveConflict = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const id = req.params.id as string;
    const payload = resolveConflictSchema.parse(req.body);
    
    const success = await SyncService.resolveConflict(id, branchId, payload);
    if (!success) {
      res.status(400).json({ success: false, message: "Could not resolve conflict. It may not exist or is not pending." });
      return;
    }
    
    res.status(200).json({ success: true, message: "Conflict successfully resolved and processed." });
  } catch (error) {
    next(error);
  }
};

export const discardConflict = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const id = req.params.id as string;
    
    const success = await SyncService.discardConflict(id, branchId);
    if (!success) {
      res.status(400).json({ success: false, message: "Could not discard conflict. It may not exist or is not pending." });
      return;
    }
    
    res.status(200).json({ success: true, message: "Conflict permanently discarded." });
  } catch (error) {
    next(error);
  }
};

export const logLocalConflict = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    // Try all known auth middleware patterns for userId
    const userId = (req as any).userId || (req as any).user?.id || (req as any).user?.userId || branchId;
    const { type, payload, errorMessage } = req.body;
    
    await SyncService.logConflict(branchId, userId, { message: errorMessage }, payload, type);
    
    res.status(200).json({ success: true, message: "Local conflict successfully logged to server." });
  } catch (error) {
    next(error);
  }
};
