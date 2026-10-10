import type { Request, Response, NextFunction } from "express";
import { db } from "../../db";
import { smsTemplatesTable } from "./notifications.schema";
import { eq } from "drizzle-orm";
import { NotificationsService } from "./notifications.service";

export const getTemplates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const templates = await db.select().from(smsTemplatesTable);
    res.status(200).json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
};

export const updateTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { body_template, is_active } = req.body;

    await db.update(smsTemplatesTable)
      .set({ body_template, is_active, updated_at: new Date() })
      .where(eq(smsTemplatesTable.id, id));

    res.status(200).json({ success: true, message: "Template updated successfully" });
  } catch (error) {
    next(error);
  }
};

export const getSmsLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = (req.query.search as string) || "";
    
    const result = await NotificationsService.getSmsLogs(page, limit, search);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const retrySms = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const success = await NotificationsService.retrySms(id);
    
    if (success) {
      res.status(200).json({ success: true, message: "SMS sent successfully" });
    } else {
      res.status(500).json({ success: false, message: "Failed to resend SMS" });
    }
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const sendCustomSms = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { customer_id, phone, message } = req.body;
    const userId = (req as any).user?.id;

    if (!customer_id || !phone || !message?.trim()) {
      res.status(400).json({ success: false, message: "Customer ID, phone number, and message are required." });
      return;
    }

    const result = await NotificationsService.sendCustomSms(customer_id, phone, message.trim(), userId);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "Failed to send custom SMS" });
  }
};
