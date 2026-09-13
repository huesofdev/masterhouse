import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '../../lib/axios';
import { useBranchStore } from '../../hooks/useBranchStore';

export function useCustomers(page: number = 1, limit: number = 100, search: string = '', routeId: string = '', activeStatus: string = 'ALL') {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  return useQuery({
    queryKey: ['customers', activeBranchId, page, limit, search, routeId, activeStatus],
    queryFn: async () => {
      const res = await api.get('/customers', {
        headers: { 'x-branch-id': activeBranchId },
        params: { page, limit, search, route_id: routeId || undefined, activeStatus }
      });
      return { data: res.data.data, meta: res.data.meta };
    },
    enabled: !!activeBranchId,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/customers', payload, {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data.data; // returns { id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-search'] });
    }
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  return useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const res = await api.put(`/customers/${id}`, data, {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-search'] });
    }
  });
}

export function useUploadNic() {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  return useMutation({
    mutationFn: async ({ id, side, file }: { id: string, side: 'front' | 'back', file: File }) => {
      const formData = new FormData();
      formData.append('side', side);
      formData.append('file', file);
      
      const res = await api.post(`/customers/${id}/nic`, formData, {
        headers: { 
          'x-branch-id': activeBranchId,
          'Content-Type': 'multipart/form-data'
        }
      });
      return res.data;
    }
  });
}

export function useNicSignedUrl(customerId: string, side: 'front' | 'back', enabled: boolean = false) {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  return useQuery({
    queryKey: ['customer-nic-url', customerId, side],
    queryFn: async () => {
      const res = await api.get(`/customers/${customerId}/nic/${side}`, {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data.data.url;
    },
    enabled: !!activeBranchId && !!customerId && enabled,
    staleTime: 1000 * 60 * 5, // cache for 5 minutes since signed URLs expire
  });
}

export function useCustomerDetails(customerId: string) {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  return useQuery({
    queryKey: ['customer-details', customerId],
    queryFn: async () => {
      const res = await api.get(`/customers/${customerId}/details`, {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data.data;
    },
    enabled: !!activeBranchId && !!customerId,
  });
}
