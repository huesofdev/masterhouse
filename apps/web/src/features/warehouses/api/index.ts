import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/axios';
import type { Warehouse, WarehouseFormValues } from '../types';

export function useWarehouses() {
  return useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Warehouse[] }>('/warehouses');
      return response.data.data;
    },
  });
}

export function useAllWarehouses() {
  return useQuery({
    queryKey: ['all-warehouses'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: any[] }>('/warehouses/all');
      return response.data.data;
    },
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: WarehouseFormValues) => {
      const response = await apiClient.post<{ data: Warehouse }>('/warehouses', data);
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses'] }),
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WarehouseFormValues> }) => {
      const response = await apiClient.put<{ data: Warehouse }>(`/warehouses/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses'] }),
  });
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/warehouses/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses'] }),
  });
}
