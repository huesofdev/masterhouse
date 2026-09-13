import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '../../lib/axios';
import { useBranchStore } from '../../hooks/useBranchStore';

// ─── Returns ──────────────────────────────────────────────────────────────────

export function useGetSaleForReturn(saleId: string) {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  return useQuery({
    queryKey: ['sale-for-return', saleId],
    queryFn: async () => {
      const res = await api.get(`/service/returns/sale/${saleId}`, {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data.data;
    },
    enabled: !!saleId && saleId.length > 5,
    retry: false,
  });
}

export function useListReturns(page: number = 1, limit: number = 20, search: string = '') {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  return useQuery({
    queryKey: ['returns', activeBranchId, page, limit, search],
    queryFn: async () => {
      const res = await api.get('/service/returns', {
        headers: { 'x-branch-id': activeBranchId },
        params: { page, limit, search }
      });
      return { data: res.data.data, meta: res.data.meta };
    },
    enabled: !!activeBranchId,
  });
}

export function useProcessReturn() {
  const queryClient = useQueryClient();
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/service/returns', payload, {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['available-serials'] });
    }
  });
}

// ─── Warranty Claims ──────────────────────────────────────────────────────────

export function useListWarrantyClaims(status?: string, page: number = 1, limit: number = 20, search: string = '') {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  return useQuery({
    queryKey: ['warranty-claims', activeBranchId, status, page, limit, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (search) params.append('search', search);

      const res = await api.get(`/service/warranty?${params.toString()}`, {
        headers: { 'x-branch-id': activeBranchId }
      });
      return { data: res.data.data, meta: res.data.meta };
    },
    enabled: !!activeBranchId,
  });
}

export function useCreateWarrantyClaim() {
  const queryClient = useQueryClient();
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/service/warranty', payload, {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranty-claims'] });
    }
  });
}

export function useUpdateWarrantyStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.put(`/service/warranty/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranty-claims'] });
    }
  });
}

export function useCloseWarrantyClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.post(`/service/warranty/${id}/close`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranty-claims'] });
      queryClient.invalidateQueries({ queryKey: ['available-serials'] });
    }
  });
}
