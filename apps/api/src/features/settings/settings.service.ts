import { db } from "../../db";
import { systemSettingsTable, taxesTable } from "./settings.schema";
import { eq, inArray, and } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { documentSequencesTable } from "./sequences.schema";

export class SettingsService {
  /**
   * Fetch all settings as a key-value map.
   */
  static async getAllSettings(): Promise<Record<string, string>> {
    const rows = await db.select().from(systemSettingsTable);
    const result: Record<string, string> = {};
    for (const row of rows) {
      if (row.setting_value !== null) {
        result[row.setting_key] = row.setting_value;
      }
    }
    return result;
  }

  /**
   * Fetch a specific setting.
   */
  static async getSetting(key: string): Promise<string | null> {
    const rows = await db.select().from(systemSettingsTable).where(eq(systemSettingsTable.setting_key, key)).limit(1);
    if (rows.length === 0) return null;
    return rows[0].setting_value;
  }

  /**
   * Upsert a specific setting.
   */
  static async updateSetting(key: string, value: string, updatedBy: string): Promise<void> {
    const exists = await this.getSetting(key);
    if (exists !== null) {
      await db.update(systemSettingsTable)
        .set({ setting_value: value, updated_by: updatedBy, updated_at: new Date() })
        .where(eq(systemSettingsTable.setting_key, key));
    } else {
      await db.insert(systemSettingsTable).values({
        setting_key: key,
        setting_value: value,
        updated_by: updatedBy,
      });
    }
  }

  /**
   * Upsert multiple settings at once.
   */
  static async updateSettings(settings: Record<string, string>, updatedBy: string): Promise<void> {
    await db.transaction(async (tx) => {
      for (const [key, value] of Object.entries(settings)) {
        const rows = await tx.select().from(systemSettingsTable).where(eq(systemSettingsTable.setting_key, key)).limit(1);
        if (rows.length > 0) {
          await tx.update(systemSettingsTable)
            .set({ setting_value: value, updated_by: updatedBy, updated_at: new Date() })
            .where(eq(systemSettingsTable.setting_key, key));
        } else {
          await tx.insert(systemSettingsTable).values({
            setting_key: key,
            setting_value: value,
            updated_by: updatedBy,
          });
        }
      }
    });
  }

  // --- TAXES ---

  static async getTaxes() {
    return await db.select().from(taxesTable);
  }

  static async getActiveTaxes() {
    return await db.select().from(taxesTable).where(eq(taxesTable.is_active, true));
  }

  static async createTax(data: { name: string; rate: string | number; type: "EXCLUSIVE" | "INCLUSIVE"; is_active?: boolean }) {
    const id = uuidv7();
    await db.insert(taxesTable).values({
      id,
      name: data.name,
      rate: String(data.rate),
      type: data.type,
      is_active: data.is_active ?? true,
    });
    return { id };
  }

  static async updateTax(id: string, data: { name?: string; rate?: string | number; type?: "EXCLUSIVE" | "INCLUSIVE"; is_active?: boolean }) {
    const updateData: any = { updated_at: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.rate !== undefined) updateData.rate = String(data.rate);
    if (data.type !== undefined) updateData.type = data.type;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    await db.update(taxesTable).set(updateData).where(eq(taxesTable.id, id));
  }

  static async deleteTax(id: string) {
    await db.delete(taxesTable).where(eq(taxesTable.id, id));
  }

  // --- DOCUMENT SEQUENCES ---
  static async getDocumentSequences(branchId: string) {
    return await db.select().from(documentSequencesTable).where(eq(documentSequencesTable.branch_id, branchId));
  }

  static async updateDocumentSequence(branchId: string, documentType: string, prefixFormat: string, currentSequence: number) {
    const existing = await db.select().from(documentSequencesTable).where(and(
      eq(documentSequencesTable.branch_id, branchId),
      eq(documentSequencesTable.document_type, documentType)
    )).limit(1);

    if (existing.length > 0) {
      await db.update(documentSequencesTable)
        .set({ prefix_format: prefixFormat, current_sequence: currentSequence })
        .where(and(
          eq(documentSequencesTable.branch_id, branchId),
          eq(documentSequencesTable.document_type, documentType)
        ));
    } else {
      await db.insert(documentSequencesTable).values({
        branch_id: branchId,
        document_type: documentType,
        prefix_format: prefixFormat,
        current_sequence: currentSequence,
      });
    }
  }
}
