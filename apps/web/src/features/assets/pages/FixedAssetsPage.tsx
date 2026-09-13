import { useState } from 'react';
import { Search, Plus, Monitor, Wrench, Trash2, CheckCircle, AlertTriangle, Building, User } from 'lucide-react';
import { useGetAssets, useDeleteAsset } from '../api';
import { useBranchStore } from '../../../hooks/useBranchStore';
import { AssetFormModal } from '../components/AssetFormModal';
import { PermissionGuard } from '../../../components/PermissionGuard';

export function FixedAssetsPage() {
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  const { data: assets, isLoading } = useGetAssets();
  const deleteAsset = useDeleteAsset();

  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  // Stats
  const activeCount = assets?.filter(a => a.status === 'ACTIVE').length || 0;
  const repairCount = assets?.filter(a => a.status === 'IN_REPAIR').length || 0;
  const totalValue = assets?.reduce((acc, a) => acc + (parseFloat(a.purchase_price || '0') || 0), 0) || 0;

  const filteredAssets = assets?.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.asset_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <span className="status-badge status-success"><CheckCircle size={12} /> Active</span>;
      case 'IN_REPAIR': return <span className="status-badge status-warning"><Wrench size={12} /> In Repair</span>;
      case 'DISPOSED': return <span className="status-badge status-error"><Trash2 size={12} /> Disposed</span>;
      case 'LOST': return <span className="status-badge status-error"><AlertTriangle size={12} /> Lost/Stolen</span>;
      default: return <span className="status-badge">{status}</span>;
    }
  };

  const handleEdit = (asset: any) => {
    setSelectedAsset(asset);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      try {
        await deleteAsset.mutateAsync(id);
      } catch (err) {
        alert('Failed to delete asset');
      }
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Fixed Assets</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Manage branch equipment, fixtures, and machinery</p>
        </div>
        <PermissionGuard permission="assets:create" behavior="disable">
          <button
            onClick={() => { setSelectedAsset(null); setShowModal(true); }}
            disabled={!activeBranchId}
            style={{
              padding: '10px 16px', background: 'var(--brand-primary)', color: 'white', border: 'none',
              borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)'
            }}
          >
            <Plus size={18} /> Register Asset
          </button>
        </PermissionGuard>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--brand-primary)', borderRadius: '12px' }}>
            <Monitor size={24} />
          </div>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>Active Assets</p>
            <h3 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{activeCount}</h3>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '12px' }}>
            <Wrench size={24} />
          </div>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>In Repair</p>
            <h3 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{repairCount}</h3>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '12px' }}>
            <Building size={24} />
          </div>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>Total Asset Value</p>
            <h3 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Rs. {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', gap: '16px' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
          <input
            placeholder="Search by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px 10px 36px', boxSizing: 'border-box',
              background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
              borderRadius: '8px', color: 'var(--text-primary)', outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: 'var(--bg-tertiary)', position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Asset Details</th>
                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Category</th>
                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Assignment</th>
                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading assets...</td></tr>
              ) : filteredAssets?.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>No assets found.</td></tr>
              ) : (
                filteredAssets?.map((asset) => (
                  <tr key={asset.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>{asset.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'monospace' }}>{asset.asset_code}</div>
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {asset.category?.name || 'Uncategorized'}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {asset.custodian && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-primary)' }}>
                          <User size={14} style={{ color: 'var(--text-secondary)' }} />
                          {asset.custodian.name}
                        </div>
                      )}
                      {asset.warehouse && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px' }}>
                          <Building size={14} style={{ color: 'var(--text-secondary)' }} />
                          {asset.warehouse.name}
                        </div>
                      )}
                      {!asset.custodian && !asset.warehouse && <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Unassigned</span>}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {getStatusBadge(asset.status)}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleEdit(asset)}
                        style={{ padding: '6px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, marginRight: '8px' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(asset.id)}
                        style={{ padding: '6px', background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '6px', color: 'var(--status-error)', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <AssetFormModal
          asset={selectedAsset}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
