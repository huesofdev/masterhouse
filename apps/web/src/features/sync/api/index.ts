import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/axios';
import type { SyncConflict } from '../types';

export function useConflicts() {
  return useQuery({
    queryKey: ['sync-conflicts'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: SyncConflict[] }>('/sync/conflicts');
      return response.data.data;
    },
  });
}

export function useDiscardConflict() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.put(`/sync/conflicts/${id}/discard`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-conflicts'] });
    },
  });
}

export function useResolveConflict() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, resolved_payload }: { id: string; resolved_payload?: any }) => {
      await apiClient.put(`/sync/conflicts/${id}/resolve`, { resolved_payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-conflicts'] });
    },
  });
}
