import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '../../lib/axios';
import { useBranchStore } from '../../hooks/useBranchStore';

export interface POSSearchResult {
  type: 'SERIAL_MATCH' | 'PRODUCT_MATCH';
  data: any;
}

export function usePOSSearch(query: string) {
  const activeBranchId = useBranchStore(state => state.activeBranchId);

  return useQuery({
    queryKey: ['pos-search', activeBranchId, query],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any; type: string }>('/sales/pos-search', {
        headers: { 'x-branch-id': activeBranchId },
        params: { q: query }
      });
      return { type: res.data.type, data: res.data.data } as POSSearchResult;
    },
    enabled: !!activeBranchId,
  });
}

export function useAvailableSerials(productId: string | null) {
  const activeBranchId = useBranchStore(state => state.activeBranchId);

  return useQuery({
    queryKey: ['available-serials', activeBranchId, productId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>(`/sales/available-serials/${productId}`, {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data.data;
    },
    enabled: !!activeBranchId && !!productId,
  });
}

export function useCreateSale() {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/sales', payload, {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-search'] });
      queryClient.invalidateQueries({ queryKey: ['available-serials'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    }
  });
}

export function useVoidSale() {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleId: string) => {
      const res = await api.post(`/sales/${saleId}/void`, {}, {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sale-details'] });
    }
  });
}

export function useUpdateSaleNotes() {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, notes }: { saleId: string; notes: string | null }) => {
      const res = await api.patch(`/sales/${saleId}/notes`, { notes }, {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sale-details', activeBranchId, variables.saleId] });
    }
  });
}

export function useListSales(
  page: number = 1, 
  limit: number = 100, 
  search: string = '',
  startDate?: string,
  endDate?: string,
  saleType?: string,
  paymentMode?: string,
  status?: string,
  source?: string,
  routeId?: string,
  userId?: string
) {
  const activeBranchId = useBranchStore(state => state.activeBranchId);

  return useQuery({
    queryKey: ['sales', activeBranchId, page, limit, search, startDate, endDate, saleType, paymentMode, status, source, routeId, userId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[]; meta: any }>('/sales', {
        headers: { 'x-branch-id': activeBranchId },
        params: { page, limit, search, startDate, endDate, saleType, paymentMode, status, source, routeId, userId }
      });
      return res.data;
    },
    enabled: !!activeBranchId,
  });
}

export function useGetSaleDetails(saleId: string) {
  const activeBranchId = useBranchStore(state => state.activeBranchId);

  return useQuery({
    queryKey: ['sale-details', activeBranchId, saleId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any }>(`/sales/${saleId}`, {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data.data;
    },
    enabled: !!activeBranchId && !!saleId,
  });
}

export function useCustomerSearch(query: string) {
  const activeBranchId = useBranchStore(state => state.activeBranchId);

  return useQuery({
    queryKey: ['customer-search', activeBranchId, query],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>('/customers/search', {
        headers: { 'x-branch-id': activeBranchId },
        params: { q: query }
      });
      return res.data.data;
    },
    enabled: !!activeBranchId && query.length >= 2,
  });
}

export function useInstallmentSchemes() {
  const activeBranchId = useBranchStore(state => state.activeBranchId);

  return useQuery({
    queryKey: ['installment-schemes', activeBranchId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>('/collections/schemes', {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data.data;
    },
    enabled: !!activeBranchId,
  });
}

export function useGetQuotations() {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  return useQuery({
    queryKey: ['quotations', activeBranchId],
    queryFn: async () => {
      const res = await api.get('/quotations', { headers: { 'x-branch-id': activeBranchId } });
      return res.data.data;
    },
    enabled: !!activeBranchId,
  });
}

export function useGetQuotation(id: string | null) {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  return useQuery({
    queryKey: ['quotations', id, activeBranchId],
    queryFn: async () => {
      const res = await api.get(`/quotations/${id}`, { headers: { 'x-branch-id': activeBranchId } });
      return res.data.data;
    },
    enabled: !!activeBranchId && !!id,
  });
}

export function useCreateQuotation() {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/quotations', data, { headers: { 'x-branch-id': activeBranchId } });
      return res.data;
    }
  });
}

export function useDeleteQuotation() {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/quotations/${id}`, { headers: { 'x-branch-id': activeBranchId } });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    }
  });
}
