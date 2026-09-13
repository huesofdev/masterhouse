export interface FixedAssetCategory {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface FixedAsset {
  id: string;
  asset_code: string;
  name: string;
  category_id: string;
  branch_id: string;
  warehouse_id?: string;
  assigned_to?: string;
  status: 'ACTIVE' | 'IN_REPAIR' | 'DISPOSED' | 'LOST';
  purchase_date?: string;
  purchase_price?: string;
  supplier?: string;
  warranty_expiry?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  category?: FixedAssetCategory;
  warehouse?: { id: string; name: string };
  custodian?: { id: string; name: string; email: string };
}
