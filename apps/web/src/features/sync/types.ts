export interface SyncConflict {
  id: string;
  branch_id: string;
  user_id: string;
  error_type: 'DOUBLE_SALE' | 'PHANTOM_STOCK' | 'OVER_COLLECTION' | 'OTHER';
  error_message: string;
  raw_payload: any;
  status: 'PENDING' | 'RESOLVED' | 'DISCARDED';
  created_at: string;
  resolved_at: string | null;
}
