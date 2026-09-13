import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '../../lib/axios';
import type { Supplier, SupplierFormValues, SupplierLedgerEntry, RecordPaymentValues } from './types';

export function useSuppliers(page: number = 1, limit: number = 20, search: string = '') {
  return useQuery({
    queryKey: ['suppliers', page, limit, search],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: Supplier[], meta?: any }>('/suppliers', {
        params: { page, limit, search }
      });
      return { data: data.data, meta: data.meta };
    },
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SupplierFormValues) => {
      const response = await api.post('/suppliers', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SupplierFormValues> }) => {
      const response = await api.put(`/suppliers/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

export function useGetSupplier(id: string) {
  return useQuery({
    queryKey: ['supplier', id],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: Supplier }>(`/suppliers/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useGetSupplierLedger(id: string, page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['supplier_ledger', id, page, limit],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; data: SupplierLedgerEntry[], meta: any }>(`/suppliers/${id}/ledger`, {
        params: { page, limit }
      });
      return { data: data.data, meta: data.meta };
    },
    enabled: !!id,
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RecordPaymentValues }) => {
      const response = await api.post(`/suppliers/${id}/payments`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['supplier_ledger', variables.id] });
    },
  });
}

export function useSetOpeningBalance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { amount: number } }) => {
      const response = await api.post(`/suppliers/${id}/opening-balance`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['supplier_ledger', variables.id] });
    },
  });
}
