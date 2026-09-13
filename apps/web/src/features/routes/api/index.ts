import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/axios';
import type { Route, RouteFormValues } from '../types';

export function useRoutes() {
  return useQuery({
    queryKey: ['routes'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Route[] }>('/routes');
      return response.data.data;
    },
  });
}

export function useCreateRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: RouteFormValues) => {
      const response = await apiClient.post<{ data: Route }>('/routes', data);
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routes'] }),
  });
}

export function useUpdateRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RouteFormValues> }) => {
      const response = await apiClient.put<{ data: Route }>(`/routes/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routes'] }),
  });
}

export function useDeleteRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/routes/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routes'] }),
  });
}
