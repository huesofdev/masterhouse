import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useCreateAsset, useUpdateAsset, useGetAssetCategories } from '../api';
import { useWarehouses } from '../../warehouses/api';
import { useUsers } from '../../users/api';
import type { FixedAsset } from '../types';

interface Props {
  asset?: FixedAsset | null;
  onClose: () => void;
}

export function AssetFormModal({ asset, onClose }: Props) {
  const isEditing = !!asset;
  
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  
  const { data: categories } = useGetAssetCategories();
  const { data: warehouses } = useWarehouses();
  const { data: usersData } = useUsers(1, 100); // Fetch up to 100 users for dropdown

  const [formData, setFormData] = useState<Partial<FixedAsset>>({
    asset_code: '',
    name: '',
    category_id: '',
    warehouse_id: '',
    assigned_to: '',
    status: 'ACTIVE',
    purchase_price: '',
    purchase_date: '',
    supplier: '',
    warranty_expiry: '',
    notes: ''
  });

  useEffect(() => {
    if (asset) {
      setFormData({
        asset_code: asset.asset_code,
        name: asset.name,
        category_id: asset.category_id,
        warehouse_id: asset.warehouse_id || '',
        assigned_to: asset.assigned_to || '',
        status: asset.status,
        purchase_price: asset.purchase_price || '',
        purchase_date: asset.purchase_date ? new Date(asset.purchase_date).toISOString().split('T')[0] : '',
        supplier: asset.supplier || '',
        warranty_expiry: asset.warranty_expiry ? new Date(asset.warranty_expiry).toISOString().split('T')[0] : '',
        notes: asset.notes || ''
      });
    } else {
      // Auto-generate code
      setFormData(prev => ({
        ...prev,
        asset_code: `FA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      }));
    }
  }, [asset]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && asset) {
        await updateAsset.mutateAsync({ id: asset.id, data: formData });
      } else {
        await createAsset.mutateAsync(formData);
      }
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'An error occurred while saving the asset');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="glass-panel" style={{ width: '600px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {isEditing ? 'Edit Asset' : 'Register New Asset'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Asset Code *</label>
              <input
                required
                name="asset_code"
                value={formData.asset_code}
                onChange={handleChange}
                placeholder="FA-0001"
                style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Asset Name *</label>
              <input
                required
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Dell Optiplex 3080"
                style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Category *</label>
              <select
                required
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
              >
                <option value="">Select Category</option>
                {categories?.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</label>
              <select
                required
                name="status"
                value={formData.status}
                onChange={handleChange}
                style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
              >
                <option value="ACTIVE">Active</option>
                <option value="IN_REPAIR">In Repair</option>
                <option value="DISPOSED">Disposed</option>
                <option value="LOST">Lost / Stolen</option>
              </select>
            </div>
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '12px 0 0 0', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Assignment (Optional)</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Assigned User / Custodian</label>
              <select
                name="assigned_to"
                value={formData.assigned_to}
                onChange={handleChange}
                style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
              >
                <option value="">None</option>
                {usersData?.data?.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Location (Warehouse)</label>
              <select
                name="warehouse_id"
                value={formData.warehouse_id}
                onChange={handleChange}
                style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
              >
                <option value="">Branch Floor (Default)</option>
                {warehouses?.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '12px 0 0 0', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Purchase & Warranty</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Purchase Price (Rs)</label>
              <input
                type="number"
                step="0.01"
                name="purchase_price"
                value={formData.purchase_price}
                onChange={handleChange}
                placeholder="50000"
                style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Supplier</label>
              <input
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                placeholder="TechCorp Ltd"
                style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Purchase Date</label>
              <input
                type="date"
                name="purchase_date"
                value={formData.purchase_date}
                onChange={handleChange}
                style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Warranty Expiry</label>
              <input
                type="date"
                name="warranty_expiry"
                value={formData.warranty_expiry}
                onChange={handleChange}
                style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Serial numbers, condition details, etc..."
              style={{ padding: '10px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '10px 16px', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createAsset.isPending || updateAsset.isPending}
              style={{ padding: '10px 16px', background: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Save size={18} /> {isEditing ? 'Save Changes' : 'Register Asset'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
