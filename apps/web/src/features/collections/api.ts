import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '../../lib/axios';
import { useBranchStore } from '../../hooks/useBranchStore';

export function useCreateReceipt() {
  const queryClient = useQueryClient();
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  return useMutation({
    mutationFn: async (payload: { contract_id: string; amount: number; payment_mode: string; trip_id?: string }) => {
      const res = await api.post('/collections/receipts', payload, {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-details'] });
      queryClient.invalidateQueries({ queryKey: ['collection-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['contract-history'] });
    }
  });
}

export function useCreateAdjustment() {
  const queryClient = useQueryClient();
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  return useMutation({
    mutationFn: async (payload: { contract_id: string; type: string; amount: number; reason: string; schedule_id?: string; scope?: 'SCHEDULE' | 'CONTRACT' }) => {
      const res = await api.post(`/collections/contracts/${payload.contract_id}/adjustments`, payload, {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-details'] });
      queryClient.invalidateQueries({ queryKey: ['collection-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['contract-history'] });
    }
  });
}

export interface ScheduleCountsResponse {
  overdue: number;
  today: number;
  upcoming: number;
  overdueAmount: number;
  todayAmount: number;
  upcomingAmount: number;
  overdueCustomersCount: number;
  todayCustomersCount: number;
  upcomingCustomersCount: number;
}

export interface CollectionSchedulesMeta {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  total_pending_amount?: number;
  total_due_amount?: number;
  total_paid_amount?: number;
  unique_customers_count?: number;
}

export function useCollectionSchedules(
  filter: 'overdue' | 'today' | 'upcoming' | 'custom' | 'paid', 
  page: number = 1, 
  limit: number = 100, 
  search: string = '',
  routeId?: string,
  areaId?: string,
  startDate?: string,
  endDate?: string,
  status?: string
) {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  return useQuery({
    queryKey: ['collection-schedules', filter, activeBranchId, page, limit, search, routeId, areaId, startDate, endDate, status],
    queryFn: async () => {
      const res = await api.get(`/collections/schedules`, {
        headers: { 'x-branch-id': activeBranchId },
        params: { filter, page, limit, search, routeId, areaId, startDate, endDate, status }
      });
      return { data: res.data.data, meta: res.data.meta as CollectionSchedulesMeta };
    },
    enabled: !!activeBranchId,
  });
}

export function useGetContractHistory(contractId: string) {
  return useQuery({
    queryKey: ['contract-history', contractId],
    queryFn: async () => {
      const res = await api.get(`/collections/contracts/${contractId}/history`);
      return res.data.data;
    },
    enabled: !!contractId,
  });
}

export interface ContractBreakdownSchedule {
  id: string;
  installment_number: number;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  balance_remaining: number;
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
  is_overdue: boolean;
  days_overdue: number;
}

export interface ContractBreakdownAdjustment {
  id: string;
  type: 'PENALTY' | 'DISCOUNT' | 'WRITE_OFF' | 'REBATE';
  amount: number;
  reason: string;
  created_at: string;
  created_by: string;
  created_by_name: string;
}

export interface ContractBreakdownData {
  contract: {
    id: string;
    contract_no: string;
    status: string;
    total_payable: number;
    collected_amount: number;
    balance: number;
    downpayment_amount: number;
    installment_amount: number;
    terms_months: number;
    scheme_name: string;
    customer_name: string;
    customer_nic: string;
    customer_mobile: string;
  };
  summary: {
    overdue_amount: number;
    overdue_count: number;
    total_penalties: number;
    total_discounts: number;
    total_write_offs: number;
    total_rebates: number;
    total_due: number;
    total_paid: number;
    remaining_balance: number;
    is_settled: boolean;
  };
  schedules: ContractBreakdownSchedule[];
  adjustments: ContractBreakdownAdjustment[];
}

export function useGetContractBreakdown(contractId: string | null) {
  return useQuery<ContractBreakdownData>({
    queryKey: ['contract-breakdown', contractId],
    queryFn: async () => {
      const res = await api.get(`/collections/contracts/${contractId}/breakdown`);
      return res.data.data;
    },
    enabled: !!contractId,
  });
}

export function useScheduleCounts(routeId?: string, areaId?: string) {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  return useQuery({
    queryKey: ['schedule-counts', activeBranchId, routeId, areaId],
    queryFn: async () => {
      const res = await api.get('/collections/schedules/counts', {
        headers: { 'x-branch-id': activeBranchId },
        params: { routeId, areaId }
      });
      return res.data.data as ScheduleCountsResponse;
    },
    enabled: !!activeBranchId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useGetMapData(filters?: { from?: string; to?: string; trip_id?: string }) {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  
  return useQuery({
    queryKey: ['map-data', filters, activeBranchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.from) params.append('from', filters.from);
      if (filters?.to) params.append('to', filters.to);
      if (filters?.trip_id) params.append('trip_id', filters.trip_id);
      
      const res = await api.get(`/collections/map-data?${params.toString()}`, {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data.data;
    },
    enabled: !!activeBranchId,
  });
}

