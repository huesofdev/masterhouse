import type { Request, Response, NextFunction } from "express";
import { SettingsService } from "./settings.service";
import sharp from "sharp";
import { S3Util } from "../../utils/s3.util";
import { v7 as uuidv7 } from "uuid";
import { RbacService } from "../rbac/rbac.service";

export const getSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const settings = await SettingsService.getAllSettings();
    
    // If not admin, we might want to hide sensitive keys like TEXTLK_API_TOKEN
    // Let's check rank
    const userId = (req as any).user?.id;
    let isRank100 = false;
    
    if (userId) {
      const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      if (user.length > 0 && user[0].role_id) {
        const role = await RbacService.getRole(user[0].role_id);
        if (role && role.level === 100) {
          isRank100 = true;
        }
      }
    }
    
    // Mask sensitive config for non-admins
    if (!isRank100) {
      delete settings['textlk_api_key'];
      delete settings['textlk_sender_id'];
    }

    if (settings['company_logo_key']) {
      try {
        settings['company_logo_signed_url'] = await S3Util.getSignedDownloadUrl(settings['company_logo_key']);
      } catch (e) {
        console.error('Failed to get signed URL for logo', e);
      }
    }

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

export const getPublicSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const settings = await SettingsService.getAllSettings();
    
    // Only pick safe fields
    const safeSettings: Record<string, string> = {};
    if (settings['company_name']) safeSettings['company_name'] = settings['company_name'];
    if (settings['company_logo_key']) {
      safeSettings['company_logo_key'] = settings['company_logo_key'];
      try {
        safeSettings['company_logo_signed_url'] = await S3Util.getSignedDownloadUrl(settings['company_logo_key']);
      } catch (e) {
        console.error('Failed to get signed URL for logo', e);
      }
    }

    res.status(200).json({ success: true, data: safeSettings });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const updates: Record<string, string> = req.body;
    
    // Check rank for updating sensitive ones
    const sensitiveKeys = ['textlk_api_key', 'textlk_sender_id', 'sms_enabled'];
    const hasSensitive = Object.keys(updates).some(k => sensitiveKeys.includes(k));
    
    if (hasSensitive) {
      const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      const role = await RbacService.getRole(user[0].role_id!);
      if (!role || role.level !== 100) {
        res.status(403).json({ success: false, message: "Forbidden: Rank 100 required for SMS settings" });
        return;
      }
    }

    await SettingsService.updateSettings(updates, userId);
    res.status(200).json({ success: true, message: "Settings updated successfully" });
  } catch (error) {
    next(error);
  }
};

export const uploadLogo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: "No image file provided" });
      return;
    }

    // Convert/Compress image using sharp
    const compressedBuffer = await sharp(req.file.buffer)
      .resize(400, 400, { fit: "inside", withoutEnlargement: true }) // Max 400x400 for logo
      .webp({ quality: 80 })
      .toBuffer();

    const uniqueId = uuidv7();
    const key = `logos/${uniqueId}.webp`;

    await S3Util.uploadBuffer(compressedBuffer, key, "image/webp");
    
    // We assume the bucket is public or we construct the public URL
    // e.g. https://masterh-assets.your-endpoint.com/logos/uuid.webp
    // Or we use the presigned url getter for frontend if it's private.
    // For simplicity, let's just save the key, the frontend can fetch it.
    
    const logoUrl = `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_PUBLIC_DOMAIN}/${key}`; 
    // Wait, let's just save the key so we can get signed URLs later, or if it's public we can save full URL.
    // Let's assume the user has a public R2 bucket. I'll save just the key.
    
    await SettingsService.updateSetting('company_logo_key', key, userId);

    res.status(200).json({ success: true, message: "Logo uploaded successfully", data: { key } });
  } catch (error) {
    next(error);
  }
};

import { db } from "../../db";
import { usersTable } from "../user/user.schema";
import { eq } from "drizzle-orm";

export const getTaxes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const taxes = await SettingsService.getTaxes();
    res.status(200).json({ success: true, data: taxes });
  } catch (error) {
    next(error);
  }
};

export const createTax = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await SettingsService.createTax(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const updateTax = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await SettingsService.updateTax(req.params.id, req.body);
    res.status(200).json({ success: true, message: "Tax updated successfully" });
  } catch (error) {
    next(error);
  }
};

export const deleteTax = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await SettingsService.deleteTax(req.params.id);
    res.status(200).json({ success: true, message: "Tax deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const getDocumentSequences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    if (!branchId) {
      res.status(400).json({ success: false, message: "Branch context required" });
      return;
    }
    const sequences = await SettingsService.getDocumentSequences(branchId);
    res.status(200).json({ success: true, data: sequences });
  } catch (error) {
    next(error);
  }
};

export const updateDocumentSequence = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    if (!branchId) {
      res.status(400).json({ success: false, message: "Branch context required" });
      return;
    }
    const { documentType, prefixFormat, currentSequence } = req.body;
    await SettingsService.updateDocumentSequence(branchId, documentType, prefixFormat, currentSequence);
    res.status(200).json({ success: true, message: "Sequence updated successfully" });
  } catch (error) {
    next(error);
  }
};
