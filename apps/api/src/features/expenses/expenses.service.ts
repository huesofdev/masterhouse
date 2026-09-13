import { db } from "../../db";
import { expenseCategoriesTable, expensesTable } from "./expenses.schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { S3Util } from "../../utils/s3.util";

export class ExpensesService {
  
  // --- Categories ---
  static async getCategories() {
    return await db.select().from(expenseCategoriesTable);
  }

  static async createCategory(payload: { name: string; type?: string; is_active?: boolean }) {
    const id = uuidv7();
    await db.insert(expenseCategoriesTable).values({
      id,
      name: payload.name,
      type: payload.type || "OPERATIONAL",
      is_active: payload.is_active ?? true,
    });
    const res = await db.select().from(expenseCategoriesTable).where(eq(expenseCategoriesTable.id, id));
    return res[0];
  }

  static async updateCategory(id: string, payload: { name?: string; type?: string; is_active?: boolean }) {
    await db.update(expenseCategoriesTable).set(payload).where(eq(expenseCategoriesTable.id, id));
    const res = await db.select().from(expenseCategoriesTable).where(eq(expenseCategoriesTable.id, id));
    return res[0];
  }

  static async deleteCategory(id: string) {
    await db.update(expenseCategoriesTable).set({ is_active: false }).where(eq(expenseCategoriesTable.id, id));
  }

  // --- Expenses ---
  static async getExpenses(branchId: string, filters: { startDate?: Date; endDate?: Date; categoryId?: string }) {
    let conditions: any[] = [eq(expensesTable.branch_id, branchId)];

    if (filters.startDate) {
      conditions.push(gte(expensesTable.expense_date, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(expensesTable.expense_date, filters.endDate));
    }
    if (filters.categoryId) {
      conditions.push(eq(expensesTable.category_id, filters.categoryId));
    }

    const rows = await db
      .select()
      .from(expensesTable)
      .where(and(...conditions))
      .orderBy(desc(expensesTable.expense_date));

    // Append signed URLs for receipts
    const mappedRows = await Promise.all(rows.map(async (row) => {
      let receipt_signed_url: string | null = null;
      if (row.receipt_url) {
        receipt_signed_url = await S3Util.getSignedDownloadUrl(row.receipt_url);
      }
      return { ...row, receipt_signed_url };
    }));

    return mappedRows;
  }

  static async createExpense(
    branchId: string,
    userId: string,
    payload: { category_id: string; amount: number; expense_date: Date; description?: string; receipt_url?: string }
  ) {
    const id = uuidv7();
    await db.insert(expensesTable).values({
      id,
      branch_id: branchId,
      category_id: payload.category_id,
      user_id: userId,
      amount: payload.amount.toString() as any, // mapping decimal
      expense_date: payload.expense_date,
      description: payload.description,
      receipt_url: payload.receipt_url,
    });

    const res = await db.select().from(expensesTable).where(eq(expensesTable.id, id));
    return res[0];
  }
}
