import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { useGetDiscrepancies, useResolveDiscrepancy } from '../api';
import { useWarehouses } from '../../warehouses/api';
import { AlertTriangle, CheckCircle2, XCircle, Clock, DollarSign, Package, ExternalLink } from 'lucide-react';
import { DataTable } from '../../../components/DataTable';
import { useTableUrlState } from '../../../hooks/useTableUrlState';

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  CASH_SHORTAGE:  { label: 'Cash Shortage',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: DollarSign },
  CASH_EXCESS:    { label: 'Cash Excess',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: DollarSign },
  STOCK_MISSING:  { label: 'Stock Missing',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: Package },
  STOCK_EXCESS:   { label: 'Stock Excess',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: Package },
  OTHER:          { label: 'Other',          color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: AlertTriangle },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  OPEN:     { label: 'Open',     color: '#ef4444', icon: Clock },
  RESOLVED: { label: 'Resolved', color: '#10b981', icon: CheckCircle2 },
  WAIVED:   { label: 'Waived',   color: '#6b7280', icon: XCircle },
  CHARGED_TO_WALLET: { label: 'Charged', color: '#8b5cf6', icon: CheckCircle2 },
};

interface ResolveModal {
  id: string;
  type: string;
  description: string;
  snapshotData?: any;
}

export function DiscrepanciesPage() {
  const navigate = useNavigate();
  const {
    activeFilter,
    search,
    pageIndex,
    pageSize,
    setFilters,
    setPagination,
  } = useTableUrlState({
    defaultValues: {
      activeFilter: 'OPEN',
      search: '',
    },
    defaultPageSize: 20,
  });

  const [modal, setModal] = useState<ResolveModal | null>(null);
  const [resolveStatus, setResolveStatus] = useState<'RESOLVED' | 'WAIVED'>('RESOLVED');
  const [notes, setNotes] = useState('');
  const [returnToWarehouse, setReturnToWarehouse] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');

  const { data: warehouses } = useWarehouses();
  
  const { data: result, isLoading } = useGetDiscrepancies(activeFilter === 'ALL' ? undefined : (activeFilter || undefined), pageIndex + 1, pageSize, search);
  const discrepancies = result?.data || [];
  const meta = result?.meta;
  
  const resolve = useResolveDiscrepancy();

  const handleResolve = async () => {
    if (!modal) return;
    try {
      await resolve.mutateAsync({ 
        id: modal.id, 
        status: resolveStatus, 
        notes,
        refund_amount: refundAmount ? parseFloat(refundAmount) : undefined,
        return_to_warehouse: returnToWarehouse,
        warehouse_id: returnToWarehouse ? warehouseId : undefined
      });
      setModal(null);
      setNotes('');
      setReturnToWarehouse(false);
      setWarehouseId('');
      setRefundAmount('');
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to update discrepancy');
    }
  };


  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
          Discrepancy Management
        </h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
          Review and resolve cash or stock discrepancies flagged during trip reconciliation.
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Open Issues', filter: 'OPEN',              color: '#ef4444', icon: Clock },
          { label: 'Charged',     filter: 'CHARGED_TO_WALLET', color: '#8b5cf6', icon: CheckCircle2 },
          { label: 'Resolved',    filter: 'RESOLVED',          color: '#10b981', icon: CheckCircle2 },
          { label: 'Waived',      filter: 'WAIVED',            color: '#6b7280', icon: XCircle },
        ].map(({ label, filter, color, icon: Icon }) => (
          <button
            key={filter}
            onClick={() => setFilters({ activeFilter: filter })}
            style={{
              background: activeFilter === filter ? `${color}15` : 'var(--bg-primary)',
              border: `1px solid ${activeFilter === filter ? color : 'var(--border-color)'}`,
              borderRadius: '12px',
              padding: '16px 20px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Icon size={18} color={color} />
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>{label}</span>
            </div>
          </button>
        ))}
      </div>

      {/* All filter tab */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[
          { label: 'All',      value: 'ALL' },
          { label: 'Open',     value: 'OPEN' },
          { label: 'Charged',  value: 'CHARGED_TO_WALLET' },
          { label: 'Resolved', value: 'RESOLVED' },
          { label: 'Waived',   value: 'WAIVED' },
        ].map(({ label, value }) => (
          <button
            key={label}
            onClick={() => setFilters({ activeFilter: value })}
            style={{
              padding: '6px 16px',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              background: (activeFilter === value || (!activeFilter && value === 'ALL')) ? 'var(--brand-primary)' : 'var(--bg-primary)',
              color: (activeFilter === value || (!activeFilter && value === 'ALL')) ? 'white' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <DataTable 
        columns={useMemo<ColumnDef<any>[]>(() => [
          {
            accessorKey: 'type',
            header: 'TYPE',
            cell: ({ row }) => {
              const d = row.original;
              const typeCfg = TYPE_CONFIG[d.type] || TYPE_CONFIG.OTHER;
              const TypeIcon = typeCfg.icon;
              return (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '4px 10px', borderRadius: '20px',
                  background: typeCfg.bg, color: typeCfg.color,
                  fontSize: '12px', fontWeight: 600,
                }}>
                  <TypeIcon size={12} />
                  {typeCfg.label}
                </span>
              );
            }
          },
          {
            accessorKey: 'trip',
            header: 'TRIP / IN-CHARGE',
            cell: ({ row }) => {
              const d = row.original;
              return (
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                    {d.trip?.incharge_name || '—'}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/trips/${d.trip_id}`); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'var(--brand-primary)', fontSize: '12px', cursor: 'pointer', padding: 0, marginTop: '2px' }}
                  >
                    View Trip <ExternalLink size={10} />
                  </button>
                </div>
              );
            }
          },
          {
            accessorKey: 'date',
            header: 'DATE',
            cell: ({ row }) => (
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                {row.original.trip?.planned_date ? new Date(row.original.trip.planned_date).toLocaleDateString('en-GB') : '—'}
              </span>
            )
          },
          {
            accessorKey: 'expected_value',
            header: 'EXPECTED',
            cell: (info) => <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>{info.getValue() as string || '—'}</span>,
          },
          {
            accessorKey: 'actual_value',
            header: 'ACTUAL',
            cell: ({ row }) => {
              const typeCfg = TYPE_CONFIG[row.original.type] || TYPE_CONFIG.OTHER;
              return <span style={{ fontFamily: 'monospace', fontWeight: 600, color: typeCfg.color }}>{row.original.actual_value || '—'}</span>;
            }
          },
          {
            accessorKey: 'status',
            header: 'STATUS',
            cell: (info) => {
              const val = (info.getValue() as string)?.toUpperCase() || 'OPEN';
              const statusCfg = STATUS_CONFIG[val] || STATUS_CONFIG.OPEN;
              const StatusIcon = statusCfg.icon;
              return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: statusCfg.color, fontSize: '13px', fontWeight: 600 }}>
                  <StatusIcon size={14} />
                  {statusCfg.label}
                </span>
              );
            }
          },
          {
            id: 'actions',
            header: 'ACTIONS',
            cell: ({ row }) => {
              const d = row.original;
              const status = d.status?.toUpperCase();
              if (status === 'OPEN' || status === 'CHARGED_TO_WALLET') {
                return (
                  <button
                    onClick={(e) => { 
                      e.stopPropagation();
                      let autoAmount = '';
                      let snap = null;
                      try {
                        snap = typeof d.snapshot_data === 'string' ? JSON.parse(d.snapshot_data) : d.snapshot_data;
                        if (d.type === 'STOCK_MISSING' && snap?.expectedQty !== undefined && snap?.actualQty !== undefined && snap?.priceAtTime) {
                          autoAmount = String((snap.expectedQty - snap.actualQty) * snap.priceAtTime);
                        } else if (snap?.amount) {
                          autoAmount = String(snap.amount);
                        }
                      } catch (err) {}
                      
                      setRefundAmount(autoAmount);
                      setModal({ id: d.id, type: d.type, description: d.description, snapshotData: snap }); 
                    }}
                    style={{
                      padding: '6px 14px', background: 'var(--brand-primary)', color: 'white',
                      border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Resolve
                  </button>
                );
              }
              return <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>—</span>;
            }
          }
        ], [navigate])}
        data={discrepancies}
        isLoading={isLoading}
        emptyMessage="No discrepancies found. All trips are reconciled cleanly."
        serverPagination={meta ? {
          pageIndex,
          pageSize,
          pageCount: meta.total_pages,
          total: meta.total_records,
          setPagination
        } : undefined}
      />

      {/* Resolve Modal */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div style={{
            background: 'var(--bg-primary)', borderRadius: '16px',
            padding: '24px', width: '480px', maxWidth: '90vw',
            maxHeight: '90vh', overflowY: 'auto',
            border: '1px solid var(--border-color)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Resolve Discrepancy
            </h3>
            <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
              {modal.description}
            </p>

            {/* Snapshot Details */}
            {modal.snapshotData && (
              <div style={{ marginBottom: '20px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Discrepancy Details</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                  {modal.type === 'STOCK_MISSING' && modal.snapshotData.productName && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Product:</span>
                        <span style={{ fontWeight: 500 }}>{modal.snapshotData.productName}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Unit Price:</span>
                        <span style={{ fontWeight: 500 }}>Rs. {modal.snapshotData.priceAtTime?.toLocaleString() || 'N/A'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Missing Qty:</span>
                        <span style={{ fontWeight: 500, color: 'var(--danger-color)' }}>
                          {(modal.snapshotData.expectedQty || 0) - (modal.snapshotData.actualQty || 0)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed var(--border-color)' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Total Value:</span>
                        <span style={{ fontWeight: 700, color: 'var(--danger-color)' }}>
                          Rs. {(((modal.snapshotData.expectedQty || 0) - (modal.snapshotData.actualQty || 0)) * (modal.snapshotData.priceAtTime || 0)).toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                  {modal.type === 'CASH_SHORTAGE' && modal.snapshotData.amount && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Missing Cash:</span>
                      <span style={{ fontWeight: 700, color: 'var(--danger-color)' }}>Rs. {parseFloat(modal.snapshotData.amount).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Resolution type toggle */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Resolution Type
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['RESOLVED', 'WAIVED'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setResolveStatus(s)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
                      border: `1px solid ${resolveStatus === s ? (s === 'RESOLVED' ? '#10b981' : '#6b7280') : 'var(--border-color)'}`,
                      background: resolveStatus === s ? (s === 'RESOLVED' ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)') : 'transparent',
                      color: resolveStatus === s ? (s === 'RESOLVED' ? '#10b981' : '#6b7280') : 'var(--text-secondary)',
                    }}
                  >
                    {s === 'RESOLVED' ? '✓ Resolved' : '○ Waived'}
                  </button>
                ))}
              </div>
            </div>

            {/* Refund Amount */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Refund Amount <span style={{ fontWeight: 400 }}>(optional, to credit staff wallet)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={refundAmount}
                onChange={e => setRefundAmount(e.target.value)}
                style={{
                  width: '100%', padding: '10px', border: '1px solid var(--border-color)',
                  borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                  fontSize: '14px', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Warehouse Return (only for Stock Missing) */}
            {modal.type === 'STOCK_MISSING' && (
              <div style={{ marginBottom: '16px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={returnToWarehouse}
                    onChange={(e) => setReturnToWarehouse(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  Return missing stock to warehouse
                </label>

                {returnToWarehouse && (
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Select Warehouse
                    </label>
                    <select
                      value={warehouseId}
                      onChange={e => setWarehouseId(e.target.value)}
                      style={{
                        width: '100%', padding: '8px', border: '1px solid var(--border-color)',
                        borderRadius: '6px', background: 'var(--bg-primary)', color: 'var(--text-primary)',
                        fontSize: '13px', boxSizing: 'border-box',
                      }}
                    >
                      <option value="">-- Select Warehouse --</option>
                      {warehouses?.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Resolution Notes <span style={{ fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                placeholder={resolveStatus === 'RESOLVED' ? 'e.g. Driver returned Rs. 500 cash shortfall' : 'e.g. Approved by Branch Manager'}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                style={{
                  width: '100%', padding: '10px', border: '1px solid var(--border-color)',
                  borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                  fontSize: '14px', resize: 'vertical', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setModal(null)}
                style={{ flex: 1, padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={resolve.isPending}
                style={{
                  flex: 1, padding: '12px',
                  background: resolveStatus === 'RESOLVED' ? '#10b981' : '#6b7280',
                  color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600,
                  cursor: resolve.isPending ? 'not-allowed' : 'pointer', opacity: resolve.isPending ? 0.7 : 1,
                }}
              >
                {resolve.isPending ? 'Saving...' : `Mark as ${resolveStatus}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
