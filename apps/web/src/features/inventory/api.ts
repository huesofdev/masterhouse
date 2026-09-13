import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient as api } from "../../lib/axios";
import { useBranchStore } from "../../hooks/useBranchStore";

export interface IntakeItemPayload {
  product_id: string;
  quantity: number;
  unit_cost: number;
  serials?: string[];
}

export interface CreateIntakePayload {
  branch_id: string;
  warehouse_id: string;
  supplier_id?: string;
  supplier_name: string;
  invoice_number?: string;
  items: IntakeItemPayload[];
}

export function useCreateIntake() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateIntakePayload) => {
      const res = await api.post("/inventory/intake", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intakes"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-balances"] });
    },
  });
}

export function useDeleteIntake() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/inventory/intake/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["intakes"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-balances"] });
    },
  });
}

export function useIntakes(page: number = 1, limit: number = 100, search: string = '') {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  
  return useQuery({
    queryKey: ["intakes", activeBranchId, page, limit, search],
    queryFn: async () => {
      const res = await api.get("/inventory/intake", {
        headers: {
          'x-branch-id': activeBranchId
        },
        params: { page, limit, search }
      });
      return { data: res.data.data, meta: res.data.meta };
    },
    enabled: !!activeBranchId,
  });
}

export function useInventoryBalances(warehouseId?: string) {
  return useQuery({
    queryKey: ["inventory-balances", warehouseId],
    queryFn: async () => {
      const res = await api.get(`/inventory/balances/${warehouseId}`);
      return res.data.data;
    },
    enabled: !!warehouseId,
  });
}

export function useIntakeById(id: string) {
  return useQuery({
    queryKey: ["intakes", id],
    queryFn: async () => {
      const res = await api.get(`/inventory/intake/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useTransfers(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ["stock-transfers", page, limit],
    queryFn: async () => {
      const res = await api.get("/inventory/transfers", {
        params: { page, limit }
      });
      return { data: res.data.data, meta: res.data.meta };
    },
  });
}

export function useTransferById(id: string) {
  return useQuery({
    queryKey: ["stock-transfer", id],
    queryFn: async () => {
      const res = await api.get(`/inventory/transfers/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/inventory/transfers", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-balances"] });
      queryClient.invalidateQueries({ queryKey: ["serials"] });
    },
  });
}

export function useLookupBarcodes() {
  return useMutation({
    mutationFn: async (payload: { serials?: string[]; skus?: string[] }) => {
      const res = await api.post("/inventory/barcodes/lookup", payload);
      return res.data.data;
    }
  });
}
