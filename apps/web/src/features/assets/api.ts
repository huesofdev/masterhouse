import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/axios';
import { useBranchStore } from '../../hooks/useBranchStore';
import type { FixedAsset, FixedAssetCategory } from './types';

// =======================
// CATEGORIES (Global)
// =======================
export function useGetAssetCategories() {
  return useQuery({
    queryKey: ['fixed-asset-categories'],
    queryFn: async () => {
      const res = await apiClient.get('/assets/categories');
      return res.data.data as FixedAssetCategory[];
    }
  });
}

export function useCreateAssetCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await apiClient.post('/assets/categories', { name });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-asset-categories'] });
    }
  });
}

export function useDeleteAssetCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/assets/categories/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-asset-categories'] });
    }
  });
}

// =======================
// ASSETS (Branch Scoped)
// =======================
export function useGetAssets() {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  return useQuery({
    queryKey: ['fixed-assets', activeBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/assets', { headers: { 'x-branch-id': activeBranchId } });
      return res.data.data as FixedAsset[];
    },
    enabled: !!activeBranchId,
  });
}

export function useCreateAsset() {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<FixedAsset>) => {
      const res = await apiClient.post('/assets', data, { headers: { 'x-branch-id': activeBranchId } });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-assets', activeBranchId] });
    }
  });
}

export function useUpdateAsset() {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Partial<FixedAsset> }) => {
      const res = await apiClient.put(`/assets/${id}`, data, { headers: { 'x-branch-id': activeBranchId } });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-assets', activeBranchId] });
    }
  });
}

export function useDeleteAsset() {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/assets/${id}`, { headers: { 'x-branch-id': activeBranchId } });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-assets', activeBranchId] });
    }
  });
}
