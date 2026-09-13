import { eq, desc } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "../../db";
import { promotionsTable } from "./promotions.schema";
import { CreatePromotionPayload, UpdatePromotionPayload, PromotionResponse } from "./promotions.types";

export class PromotionsService {
  static async createPromotion(payload: CreatePromotionPayload, createdBy: string): Promise<PromotionResponse> {
    const id = uuidv7();

    await db.insert(promotionsTable).values({
      id,
      name: payload.name,
      description: payload.description || null,
      start_date: new Date(payload.start_date),
      end_date: new Date(payload.end_date),
      discount_type: payload.discount_type,
      discount_value: payload.discount_value.toString(),
      is_active: payload.is_active !== undefined ? payload.is_active : true,
      created_by: createdBy,
    });

    return this.getPromotion(id) as Promise<PromotionResponse>;
  }

  static async getPromotion(id: string): Promise<PromotionResponse | null> {
    const result = await db.query.promotionsTable.findFirst({
      where: eq(promotionsTable.id, id),
    });
    
    if (!result) return null;
    return result as PromotionResponse;
  }

  static async updatePromotion(id: string, payload: UpdatePromotionPayload): Promise<PromotionResponse | null> {
    const updateData: Partial<typeof promotionsTable.$inferInsert> = {};
    
    if (payload.name) updateData.name = payload.name;
    if (payload.description !== undefined) updateData.description = payload.description || null;
    if (payload.start_date) updateData.start_date = new Date(payload.start_date);
    if (payload.end_date) updateData.end_date = new Date(payload.end_date);
    if (payload.discount_type) updateData.discount_type = payload.discount_type;
    if (payload.discount_value !== undefined) updateData.discount_value = payload.discount_value.toString();
    if (payload.is_active !== undefined) updateData.is_active = payload.is_active;

    if (Object.keys(updateData).length > 0) {
      await db.update(promotionsTable).set(updateData).where(eq(promotionsTable.id, id));
    }

    return this.getPromotion(id);
  }

  static async deletePromotion(id: string): Promise<boolean> {
    const result = await db.delete(promotionsTable).where(eq(promotionsTable.id, id));
    return result[0].affectedRows > 0;
  }
  
  static async listPromotions(): Promise<PromotionResponse[]> {
    const results = await db.query.promotionsTable.findMany({
      orderBy: [desc(promotionsTable.created_at)]
    });
    return results as PromotionResponse[];
  }
}
