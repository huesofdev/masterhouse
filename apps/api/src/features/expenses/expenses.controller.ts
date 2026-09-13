import type { Request, Response, NextFunction } from "express";
import { ExpensesService } from "./expenses.service";

export const getCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await ExpensesService.getCategories();
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = await ExpensesService.createCategory(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = await ExpensesService.updateCategory(req.params.id, req.body);
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await ExpensesService.deleteCategory(req.params.id);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const getExpenses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    if (!branchId) {
      res.status(400).json({ success: false, message: "Branch context missing" });
      return;
    }

    const { startDate, endDate, categoryId } = req.query;
    
    const filters: any = {};
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (categoryId) filters.categoryId = categoryId as string;

    const expenses = await ExpensesService.getExpenses(branchId, filters);
    res.status(200).json({ success: true, data: expenses });
  } catch (error) {
    next(error);
  }
};

export const createExpense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = (req as any).branchId;
    const userId = (req as any).user?.id;
    
    if (!branchId || !userId) {
      res.status(400).json({ success: false, message: "Branch context or user missing" });
      return;
    }

    // Convert string to date
    const payload = {
       ...req.body,
       expense_date: new Date(req.body.expense_date),
       amount: parseFloat(req.body.amount)
    };

    const expense = await ExpensesService.createExpense(branchId, userId, payload);
    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};
