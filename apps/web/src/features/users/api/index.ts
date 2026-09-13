import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/axios';
import type { User, UserFormValues } from '../types';

export function useUsers(page: number = 1, limit: number = 20, search: string = '') {
  return useQuery({
    queryKey: ['users', page, limit, search],
    queryFn: async () => {
      const response = await apiClient.get<{ data: User[], meta?: any }>('/users', {
        params: { page, limit, search }
      });
      return { data: response.data.data, meta: response.data.meta };
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: UserFormValues) => {
      // API expects role_id to be undefined or string (not empty string)
      const payload = {
        ...data,
        role_id: data.role_id || undefined,
        name: data.name || undefined,
      };
      const response = await apiClient.post<{ data: User, temporaryPassword?: string }>('/users', payload);
      return { user: response.data.data, temporaryPassword: response.data.temporaryPassword };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UserFormValues> }) => {
      const payload = {
        ...data,
        role_id: data.role_id || undefined,
        name: data.name || undefined,
      };
      const response = await apiClient.put<{ data: User }>(`/users/${id}`, payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<{ temporaryPassword: string }>(`/users/${id}/reset-password`);
      return response.data;
    },
  });
}
