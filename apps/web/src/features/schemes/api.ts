import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '../../lib/axios';
import { useBranchStore } from '../../hooks/useBranchStore';

export function useSchemes() {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  return useQuery({
    queryKey: ['schemes', activeBranchId],
    queryFn: async () => {
      const res = await api.get('/collections/schemes', {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data.data;
    },
    enabled: !!activeBranchId,
  });
}

export function useCreateScheme() {
  const queryClient = useQueryClient();
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/collections/schemes', { ...payload, branch_id: activeBranchId }, {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemes'] });
    }
  });
}

export function useUpdateScheme() {
  const queryClient = useQueryClient();
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const res = await api.put(`/collections/schemes/${id}`, data, {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemes'] });
    }
  });
}
