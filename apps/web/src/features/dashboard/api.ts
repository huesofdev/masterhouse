import { useQuery } from '@tanstack/react-query';
import { apiClient as api } from '../../lib/axios';
import { useBranchStore } from '../../hooks/useBranchStore';

export function useGetDashboardSummary() {
  const activeBranchId = useBranchStore(state => state.activeBranchId);

  return useQuery({
    queryKey: ['dashboard', 'summary', activeBranchId],
    queryFn: async () => {
      const res = await api.get('/dashboard/summary', {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data.data;
    },
    enabled: !!activeBranchId,
  });
}
