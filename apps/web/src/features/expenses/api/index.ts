import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/axios';
import { useBranchStore } from '../../../hooks/useBranchStore';

// -- Types
export interface ExpenseCategory {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

export interface Expense {
  id: string;
  branch_id: string;
  category_id: string;
  user_id: string;
  amount: number;
  expense_date: string;
  description?: string;
  receipt_url?: string;
  created_at: string;
}

// -- Hooks
export const useGetCategories = () => {
  return useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; data: ExpenseCategory[] }>('/expenses/categories');
      return res.data.data;
    },
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; type?: string }) => {
      const res = await apiClient.post<{ success: boolean; data: ExpenseCategory }>('/expenses/categories', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete<{ success: boolean }>(`/expenses/categories/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    },
  });
};

export const useGetExpenses = (filters?: { startDate?: string; endDate?: string; categoryId?: string }) => {
  const branchId = useBranchStore((s) => s.activeBranchId);
  return useQuery({
    queryKey: ['expenses', branchId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.categoryId) params.append('categoryId', filters.categoryId);

      const res = await apiClient.get<{ success: boolean; data: Expense[] }>(`/expenses?${params.toString()}`);
      return res.data.data;
    },
    enabled: !!branchId,
  });
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { category_id: string; amount: number; expense_date: string; description?: string; receipt_url?: string }) => {
      const res = await apiClient.post<{ success: boolean; data: Expense }>('/expenses', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
};
