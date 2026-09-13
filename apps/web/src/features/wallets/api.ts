import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/axios';
import type { WalletListItem, WalletDetails, AddRepaymentPayload } from './types';

interface FetchWalletsResponse {
  success: boolean;
  data: WalletListItem[];
  meta: {
    total_records: number;
    total_pages: number;
    current_page: number;
    page_size: number;
  };
}

export const useGetWallets = (page: number, limit: number, search: string) => {
  return useQuery<FetchWalletsResponse>({
    queryKey: ['wallets', { page, limit, search }],
    queryFn: async () => {
      const response = await apiClient.get('/users/wallets/list', {
        params: { page, limit, search }
      });
      return response.data;
    }
  });
};

export const useGetWalletDetails = (userId: string, branchId: string) => {
  return useQuery<{ success: boolean; data: WalletDetails }>({
    queryKey: ['walletDetails', userId, branchId],
    queryFn: async () => {
      const response = await apiClient.get(`/users/${userId}/wallet`, {
        params: { branchId }
      });
      return response.data;
    },
    enabled: !!userId && !!branchId
  });
};

export const useAddRepayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, payload }: { userId: string, payload: AddRepaymentPayload }) => {
      const response = await apiClient.post(`/users/${userId}/wallet/repayment`, payload);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['walletDetails', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
    }
  });
};
