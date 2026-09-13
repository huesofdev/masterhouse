export interface WalletListItem {
  user_id: string;
  name: string;
  email: string;
  role_id: string;
  balance: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  trip_id: string | null;
  discrepancy_id: string | null;
  type: 'CASH_SHORTAGE' | 'STOCK_SHORTAGE' | 'REPAYMENT' | 'SALARY_DEDUCTION' | 'OTHER';
  amount: string;
  description: string;
  snapshot_data: any | null;
  created_at: string;
}

export interface WalletDetails {
  balance: string;
  transactions: WalletTransaction[];
}

export interface AddRepaymentPayload {
  branchId: string;
  amount: number;
  description: string;
  type: 'REPAYMENT' | 'SALARY_DEDUCTION';
}
