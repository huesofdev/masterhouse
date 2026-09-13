import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/axios';
import type { Vehicle, VehicleFormValues } from '../types';

export function useVehicles(page: number = 1, limit: number = 20, search: string = '') {
  return useQuery({
    queryKey: ['vehicles', page, limit, search],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Vehicle[], meta?: any }>('/vehicles', {
        params: { page, limit, search }
      });
      return { data: response.data.data, meta: response.data.meta };
    },
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: VehicleFormValues) => {
      const response = await apiClient.post<{ data: Vehicle }>('/vehicles', data);
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VehicleFormValues> }) => {
      const response = await apiClient.put<{ data: Vehicle }>(`/vehicles/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/vehicles/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}
