import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/axios';
import { useBranchStore } from '../../../hooks/useBranchStore';

export const useGetMe = () => {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await apiClient.get('/users/me');
      return data.data;
    },
  });
};

export const useUpdateMe = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name?: string; email?: string }) => {
      const { data } = await apiClient.put('/users/me', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
};

export const useUpdateMyPassword = () => {
  return useMutation({
    mutationFn: async (payload: { old_password: string; new_password: string }) => {
      const { data } = await apiClient.put('/users/me/password', payload);
      return data;
    },
  });
};

export const useUploadProfilePicture = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await apiClient.post('/users/me/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
};

export const useGetSettings = () => {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await apiClient.get('/settings');
      return data.data as Record<string, string>;
    },
  });
};

export const useGetPublicSettings = () => {
  return useQuery({
    queryKey: ['publicSettings'],
    queryFn: async () => {
      const { data } = await apiClient.get('/settings/public');
      return data.data as Record<string, string>;
    },
  });
};

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Record<string, string>) => {
      const { data } = await apiClient.put('/settings', settings);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
};

export const useUploadLogo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      const { data } = await apiClient.post('/settings/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
};

export const useGetSmsTemplates = () => {
  return useQuery({
    queryKey: ['smsTemplates'],
    queryFn: async () => {
      const { data } = await apiClient.get('/notifications/templates');
      return data.data;
    },
  });
};

export const useUpdateSmsTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { body_template: string; is_active: boolean } }) => {
      const { data } = await apiClient.put(`/notifications/templates/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smsTemplates'] });
    },
  });
};

// --- TAXES API ---

export const useGetTaxes = () => {
  return useQuery({
    queryKey: ['taxes'],
    queryFn: async () => {
      const { data } = await apiClient.get('/settings/taxes');
      return data.data;
    },
  });
};

export const useCreateTax = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taxData: { name: string; rate: string | number; type: 'EXCLUSIVE' | 'INCLUSIVE'; is_active?: boolean }) => {
      const { data } = await apiClient.post('/settings/taxes', taxData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxes'] });
    },
  });
};

export const useUpdateTax = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data } = await apiClient.put(`/settings/taxes/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxes'] });
    },
  });
};

export const useDeleteTax = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete(`/settings/taxes/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxes'] });
    },
  });
};

// --- SEQUENCES API ---

export const useGetSequences = () => {
  const activeBranchId = useBranchStore((s) => s.activeBranchId);
  return useQuery({
    queryKey: ['sequences', activeBranchId],
    queryFn: async () => {
      const { data } = await apiClient.get('/settings/sequences');
      return data.data;
    },
    enabled: !!activeBranchId,
  });
};

export const useUpdateSequence = () => {
  const queryClient = useQueryClient();
  const activeBranchId = useBranchStore((s) => s.activeBranchId);
  return useMutation({
    mutationFn: async (payload: { documentType: string; prefixFormat: string; currentSequence: number }) => {
      const { data } = await apiClient.put('/settings/sequences', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences', activeBranchId] });
    },
  });
};
