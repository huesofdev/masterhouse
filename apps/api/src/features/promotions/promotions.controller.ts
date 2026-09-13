import type { Request, Response, NextFunction } from "express";
import { createPromotionSchema, updatePromotionSchema } from "./promotions.types";
import { PromotionsService } from "./promotions.service";

export const createPromotion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = createPromotionSchema.parse(req.body);
    const userId = (req as any).user?.id;
    
    const promotion = await PromotionsService.createPromotion(payload, userId);
    res.status(201).json({ success: true, data: promotion });
  } catch (error) {
    next(error);
  }
};

export const getPromotion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const promotion = await PromotionsService.getPromotion(id);
    
    if (!promotion) {
      res.status(404).json({ success: false, message: "Promotion not found" });
      return;
    }
    
    res.status(200).json({ success: true, data: promotion });
  } catch (error) {
    next(error);
  }
};

export const updatePromotion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const payload = updatePromotionSchema.parse(req.body);
    
    const promotion = await PromotionsService.updatePromotion(id, payload);
    
    if (!promotion) {
      res.status(404).json({ success: false, message: "Promotion not found" });
      return;
    }
    
    res.status(200).json({ success: true, data: promotion });
  } catch (error) {
    next(error);
  }
};

export const deletePromotion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const deleted = await PromotionsService.deletePromotion(id);
    
    if (!deleted) {
      res.status(404).json({ success: false, message: "Promotion not found" });
      return;
    }
    
    res.status(200).json({ success: true, message: "Promotion deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const listPromotions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const promotions = await PromotionsService.listPromotions();
    res.status(200).json({ success: true, data: promotions });
  } catch (error) {
    next(error);
  }
};
