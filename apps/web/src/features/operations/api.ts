import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient as api } from '../../lib/axios';
import { useBranchStore } from '../../hooks/useBranchStore';

export function useTrips(page: number = 1, limit: number = 20, search: string = '', status?: string, routeId?: string) {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  return useQuery({
    queryKey: ['trips', activeBranchId, page, limit, search, status, routeId],
    queryFn: async () => {
      const res = await api.get('/operations/trips', {
        headers: { 'x-branch-id': activeBranchId },
        params: { page, limit, search, status, route_id: routeId === 'ALL' ? undefined : routeId }
      });
      return { data: res.data.data, meta: res.data.meta };
    },
    enabled: !!activeBranchId,
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/operations/trips', payload, {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    }
  });
}

export function useGetTrip(id: string) {
  return useQuery({
    queryKey: ['trips', id],
    queryFn: async () => {
      const res = await api.get(`/operations/trips/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useGetTripSummary(id: string) {
  return useQuery({
    queryKey: ['trips', id, 'summary'],
    queryFn: async () => {
      const res = await api.get(`/operations/trips/${id}/summary`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useLoadTripStock() {
  const queryClient = useQueryClient();
  const activeBranchId = useBranchStore(state => state.activeBranchId);

  return useMutation({
    mutationFn: async ({ tripId, payload }: { tripId: string, payload: any }) => {
      const res = await api.post(`/operations/trips/${tripId}/stock`, payload, {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trip', variables.tripId] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      // Invalidate POS searches in case they search for the loaded stock again
      queryClient.invalidateQueries({ queryKey: ['pos-search'] });
      queryClient.invalidateQueries({ queryKey: ['available-serials'] });
    }
  });
}

export function useUnloadTripStock() {
  const queryClient = useQueryClient();
  const activeBranchId = useBranchStore(state => state.activeBranchId);

  return useMutation({
    mutationFn: async ({ tripId, stockId }: { tripId: string, stockId: string }) => {
      const res = await api.delete(`/operations/trips/${tripId}/stock/${stockId}`, {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trip', variables.tripId] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['pos-search'] });
      queryClient.invalidateQueries({ queryKey: ['available-serials'] });
    }
  });
}

export function useCancelTrip() {
  const queryClient = useQueryClient();
  const activeBranchId = useBranchStore(state => state.activeBranchId);

  return useMutation({
    mutationFn: async (tripId: string) => {
      const res = await api.post(`/operations/trips/${tripId}/cancel`, {}, {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data;
    },
    onSuccess: (_, tripId) => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['available-serials'] });
      queryClient.invalidateQueries({ queryKey: ['pos-search'] });
    }
  });
}

export function useCloseTrip() {
  const queryClient = useQueryClient();
  const activeBranchId = useBranchStore(state => state.activeBranchId);

  return useMutation({
    mutationFn: async ({ tripId, payload }: { tripId: string; payload: any }) => {
      const res = await api.post(`/operations/trips/${tripId}/close`, payload, {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trip', variables.tripId] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['available-serials'] });
      queryClient.invalidateQueries({ queryKey: ['pos-search'] });
    }
  });
}

export function useUpdateTripStatus() {
  const queryClient = useQueryClient();
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  return useMutation({
    mutationFn: async ({ tripId, status, start_km, end_km }: { tripId: string, status: string, start_km?: number | null, end_km?: number | null }) => {
      const res = await api.put(`/operations/trips/${tripId}/status`, { status, start_km, end_km }, {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trips', variables.tripId] });
    }
  });
}

export function useGetDiscrepancies(status?: string, page: number = 1, limit: number = 20, search: string = '') {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  return useQuery({
    queryKey: ['discrepancies', activeBranchId, status, page, limit, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (search) params.append('search', search);

      const res = await api.get(`/operations/discrepancies?${params.toString()}`, {
        headers: { 'x-branch-id': activeBranchId }
      });
      return { data: res.data.data, meta: res.data.meta };
    },
    enabled: !!activeBranchId,
  });
}

export function useResolveDiscrepancy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, notes, refund_amount, return_to_warehouse, warehouse_id }: { id: string; status: 'RESOLVED' | 'WAIVED' | 'CHARGED_TO_WALLET'; notes?: string; refund_amount?: number; return_to_warehouse?: boolean; warehouse_id?: string }) => {
      const res = await api.put(`/operations/discrepancies/${id}/status`, { status, notes, refund_amount, return_to_warehouse, warehouse_id });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discrepancies'] });
    }
  });
}

export interface TripAgreementItem {
  product_id: string;
  product_name: string;
  sku: string;
  serial_number: string | null;
  quantity: number;
  unit_price: string;
  line_total: string;
  warranty_type: string;
  warranty_period_years: number | null;
  warranty_period_months: number | null;
}

export interface TripAgreementSchedule {
  installment_number: number;
  due_date: string;
  amount_due: string;
  amount_paid: string;
  status: string;
}

export interface TripAgreement {
  sale: {
    id: string;
    reference_number: string;
    created_at: string;
    total: string;
    downpayment: string;
    payment_mode: string;
    creator_name: string;
    creator_phone: string;
    items: TripAgreementItem[];
  };
  contract: {
    id: string;
    principal: string;
    interest_rate: string;
    interest_amount: string;
    total_payable: string;
    downpayment: string;
    balance: string;
    schedule_frequency: string;
    status: string;
    signature_signed_url: string | null;
    guarantor_signature_signed_url: string | null;
    scheme_name: string;
    terms: number;
    schedules: TripAgreementSchedule[];
  };
  customer: {
    id: string;
    full_name: string;
    nic: string;
    mobile: string;
    address: string;
  } | null;
  guarantor: {
    id: string;
    full_name: string;
    nic: string;
    mobile: string;
    address: string;
  } | null;
}

export interface TripAgreementsData {
  trip: {
    id: string;
    planned_date: string;
    type: string;
    status: string;
    route_name: string;
    incharge_name: string;
    vehicle_plate: string;
  };
  company: {
    name: string;
    logo_url: string;
    address: string;
    phone: string;
  };
  branch: {
    id: string;
    name: string;
    address: string;
    phones: string[];
  };
  agreements: TripAgreement[];
  total_agreements: number;
}

export function useGetTripAgreements(tripId: string) {
  return useQuery({
    queryKey: ['trip-agreements', tripId],
    queryFn: async () => {
      const res = await api.get(`/operations/trips/${tripId}/agreements`);
      return res.data.data as TripAgreementsData;
    },
    enabled: !!tripId,
  });
}
