import { useState, useEffect, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useListWarrantyClaims, useCreateWarrantyClaim, useUpdateWarrantyStatus, useCloseWarrantyClaim } from '../api';
import { useGetSaleForReturn } from '../api';
import { ShieldAlert, Search, Package, CheckCircle2, Wrench, Clock } from 'lucide-react';
import { DataTable } from '../../../components/DataTable';
import { useTableUrlState } from '../../../hooks/useTableUrlState';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  OPEN: { label: 'Open', color: '#ef4444', icon: Clock },
  ITEM_COLLECTED: { label: 'Collected', color: '#f59e0b', icon: Package },
  SENT_TO_SUPPLIER: { label: 'At Supplier', color: '#3b82f6', icon: Wrench },
  IN_REPAIR: { label: 'In Repair', color: '#8b5cf6', icon: Wrench },
  REPAIRED: { label: 'Repaired', color: '#10b981', icon: CheckCircle2 },
  CLOSED: { label: 'Closed', color: '#6b7280', icon: CheckCircle2 },
};

export function WarrantyClaimsPage() {
  const {
    activeTab,
    activeFilter,
    searchQuery,
    pageIndex,
    pageSize,
    setFilters,
    setPagination,
    searchParams,
  } = useTableUrlState({
    defaultValues: {
      activeTab: 'LIST' as 'LIST' | 'NEW',
      activeFilter: '',
      searchQuery: '',
    },
    defaultPageSize: 20,
  });

  const { data: result, isLoading } = useListWarrantyClaims(activeFilter || undefined, pageIndex + 1, pageSize, searchQuery);
  const claims = result?.data || [];
  const meta = result?.meta;
  const updateStatus = useUpdateWarrantyStatus();
  const closeClaim = useCloseWarrantyClaim();

  // New Claim State
  const [searchSaleId, setSearchSaleId] = useState('');
  const [saleIdToFetch, setSaleIdToFetch] = useState('');
  const { data: sale, isLoading: searching } = useGetSaleForReturn(saleIdToFetch);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [issueDesc, setIssueDesc] = useState('');
  const createClaim = useCreateWarrantyClaim();

  // Resolution Modal State
  const [resolveModal, setResolveModal] = useState<string | null>(null); // holds claim ID
  const [resolution, setResolution] = useState<'REPAIRED' | 'REPLACED' | 'REJECTED'>('REPAIRED');
  const [replacementSerial, setReplacementSerial] = useState('');

  useEffect(() => {
    const saleId = searchParams.get('saleId');
    if (saleId) {
      setFilters({ activeTab: 'NEW' });
      setSearchSaleId(saleId);
      setSaleIdToFetch(saleId);
    }
  }, [searchParams, setFilters]);

  const listColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'created_at',
      header: 'DATE',
      cell: (info) => <span style={{ color: 'var(--text-secondary)' }}>{new Date(info.getValue() as string).toLocaleDateString('en-GB')}</span>,
    },
    {
      accessorKey: 'customer_name',
      header: 'CUSTOMER',
      cell: ({ row }) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.original.customer_name}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{row.original.customer_mobile}</div>
        </div>
      ),
    },
    {
      accessorKey: 'serial_number',
      header: 'ITEM & SERIAL',
      cell: (info) => <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{info.getValue() as string || 'Bulk Item'}</div>,
    },
    {
      accessorKey: 'issue_description',
      header: 'ISSUE',
      cell: (info) => <div style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.getValue() as string}</div>,
    },
    {
      accessorKey: 'status',
      header: 'STATUS',
      cell: (info) => {
        const statusCfg = STATUS_CONFIG[info.getValue() as string] || STATUS_CONFIG.OPEN;
        const StatusIcon = statusCfg.icon;
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', background: `${statusCfg.color}15`, color: statusCfg.color, fontSize: '12px', fontWeight: 600 }}>
            <StatusIcon size={12} /> {statusCfg.label}
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: 'ACTIONS',
      cell: ({ row }) => {
        const claim = row.original;
        return (
          <div style={{ display: 'flex', gap: '8px' }}>
            {claim.status === 'OPEN' && (
              <button onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: claim.id, status: 'ITEM_COLLECTED' }); }} style={{ padding: '6px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Collect Item</button>
            )}
            {claim.status === 'ITEM_COLLECTED' && (
              <button onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: claim.id, status: 'SENT_TO_SUPPLIER' }); }} style={{ padding: '6px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Send to Supplier</button>
            )}
            {claim.status === 'SENT_TO_SUPPLIER' && (
              <button onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: claim.id, status: 'REPAIRED' }); }} style={{ padding: '6px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Received (Repaired)</button>
            )}
            {['ITEM_COLLECTED', 'REPAIRED'].includes(claim.status) && (
              <button onClick={(e) => { e.stopPropagation(); setResolveModal(claim.id); }} style={{ padding: '6px 12px', background: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Close Claim</button>
            )}
          </div>
        );
      }
    }
  ], [updateStatus]);

  const handleCreate = async () => {
    if (!selectedItem || !sale) return;
    try {
      await createClaim.mutateAsync({
        sale_item_id: selectedItem.id,
        customer_id: sale.customer_id,
        issue_description: issueDesc,
      });
      alert('Warranty claim opened successfully');
      setSelectedItem(null);
      setSaleIdToFetch('');
      setIssueDesc('');
      setFilters({ activeTab: 'LIST' });
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to create claim');
    }
  };

  const handleCloseClaim = async () => {
    if (!resolveModal) return;
    try {
      await closeClaim.mutateAsync({
        id: resolveModal,
        payload: {
          resolution,
          replacement_serial_id: resolution === 'REPLACED' ? replacementSerial : undefined,
        }
      });
      setResolveModal(null);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to close claim');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Warranty Claims</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Manage repairs, supplier returns, and replacements.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button onClick={() => setFilters({ activeTab: 'LIST' })} style={{ padding: '8px 16px', background: activeTab === 'LIST' ? 'var(--brand-primary)' : 'transparent', color: activeTab === 'LIST' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Active Claims</button>
        <button onClick={() => setFilters({ activeTab: 'NEW' })} style={{ padding: '8px 16px', background: activeTab === 'NEW' ? 'var(--brand-primary)' : 'transparent', color: activeTab === 'NEW' ? 'white' : 'var(--text-secondary)', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Open New Claim</button>
      </div>

      {activeTab === 'NEW' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ background: 'var(--bg-primary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>Find Sale</h3>
              <form onSubmit={e => { e.preventDefault(); setSaleIdToFetch(searchSaleId); }} style={{ display: 'flex', gap: '8px' }}>
                <input type="text" placeholder="Enter Sale ID..." value={searchSaleId} onChange={e => setSearchSaleId(e.target.value)} style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                <button type="submit" disabled={searching} style={{ padding: '10px 20px', background: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}><Search size={18} /></button>
              </form>
            </div>

            {sale && (
              <div style={{ background: 'var(--bg-primary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Select Item for Warranty</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sale.items.map((item: any) => (
                    <div key={item.id} onClick={() => setSelectedItem(item)} style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${selectedItem?.id === item.id ? 'var(--brand-primary)' : 'var(--border-color)'}`, background: selectedItem?.id === item.id ? 'rgba(var(--brand-primary-rgb), 0.1)' : 'var(--bg-secondary)', cursor: 'pointer' }}>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.product.name}</div>
                      {item.serialItem && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>S/N: {item.serialItem.serial_number}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selectedItem && (
            <div style={{ background: 'var(--bg-primary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}><ShieldAlert size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }}/> Open Claim</h3>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Issue Description</label>
                <textarea rows={4} value={issueDesc} onChange={e => setIssueDesc(e.target.value)} placeholder="Describe the fault or customer complaint..." style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', resize: 'vertical' }} />
              </div>
              <button onClick={handleCreate} disabled={createClaim.isPending || issueDesc.trim().length < 5} style={{ width: '100%', padding: '14px', background: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}>
                {createClaim.isPending ? 'Opening...' : 'Submit Claim'}
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'LIST' && (
        <DataTable 
          columns={listColumns}
          data={claims}
          isLoading={isLoading}
          emptyMessage="No active warranty claims."
          serverPagination={meta ? {
            pageIndex,
            pageSize,
            pageCount: meta.total_pages,
            total: meta.total_records,
            setPagination
          } : undefined}
        />
      )}

      {/* Close Claim Modal */}
      {resolveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-primary)', padding: '24px', borderRadius: '16px', width: '400px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700 }}>Close Warranty Claim</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Resolution</label>
              <select value={resolution} onChange={e => setResolution(e.target.value as any)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                <option value="REPAIRED">Item Repaired (Returned to Customer)</option>
                <option value="REPLACED">Item Replaced with New Unit</option>
                <option value="REJECTED">Claim Rejected (Returned as-is)</option>
              </select>
            </div>

            {resolution === 'REPLACED' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Replacement Serial ID (UUID)</label>
                <input type="text" value={replacementSerial} onChange={e => setReplacementSerial(e.target.value)} placeholder="Paste new serial_item_id..." style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setResolveModal(null)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-primary)' }}>Cancel</button>
              <button onClick={handleCloseClaim} disabled={closeClaim.isPending || (resolution === 'REPLACED' && !replacementSerial)} style={{ flex: 1, padding: '10px', background: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Confirm Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
