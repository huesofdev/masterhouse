import { useMemo, useState, useEffect } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useListSales } from '../api';
import { useNavigate } from 'react-router-dom';
import { Plus, Package } from 'lucide-react';
import { DataTable } from '../../../components/DataTable';
import { PermissionGuard } from '../../../components/PermissionGuard';
import { apiClient } from '../../../lib/axios';
import { useTableUrlState } from '../../../hooks/useTableUrlState';

export function SalesPage() {
  const navigate = useNavigate();

  const {
    search,
    startDate,
    endDate,
    saleType,
    paymentMode,
    status,
    source,
    routeId,
    userId,
    pageIndex,
    pageSize,
    setFilters,
    setPagination,
  } = useTableUrlState({
    defaultValues: {
      search: '',
      startDate: '',
      endDate: '',
      saleType: 'ALL',
      paymentMode: 'ALL',
      status: 'ALL',
      source: 'ALL',
      routeId: 'ALL',
      userId: 'ALL',
    },
    defaultPageSize: 100,
  });

  const [users, setUsers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, routesRes] = await Promise.all([
          apiClient.get('/users'),
          apiClient.get('/routes')
        ]);
        setUsers(usersRes.data.data || usersRes.data || []);
        setRoutes(routesRes.data.data || routesRes.data || []);
      } catch (err) {
        console.error('Failed to load filter data', err);
      }
    };
    fetchData();
  }, []);

  const { data: result, isLoading, error } = useListSales(
    pageIndex + 1, 
    pageSize, 
    search,
    startDate || undefined,
    endDate || undefined,
    saleType !== 'ALL' ? saleType : undefined,
    paymentMode !== 'ALL' ? paymentMode : undefined,
    status !== 'ALL' ? status : undefined,
    source !== 'ALL' ? source : undefined,
    routeId !== 'ALL' ? routeId : undefined,
    userId !== 'ALL' ? userId : undefined
  );
  const sales = result?.data || [];
  const meta = result?.meta;

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'reference_number',
      header: 'INVOICE NO',
      cell: (info) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--brand-primary)' }}>
            {info.getValue() as string || info.row.original.id?.slice(0, 8).toUpperCase() || 'N/A'}
          </span>
          {info.row.original.offline_receipt_number && (
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Offline Ref: {info.row.original.offline_receipt_number}
            </span>
          )}
          {info.row.original.creator?.name && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Sold By: {info.row.original.creator.name}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorFn: (row) => row.customer?.full_name || 'Walk-in Customer',
      id: 'customer',
      header: 'CUSTOMER',
      cell: ({ row, getValue }) => (
        <div>
          <span style={{ fontWeight: 500 }}>{getValue() as string}</span>
          {row.original.product_name && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <Package size={10} /> {row.original.product_name}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'sale_type',
      header: 'TYPE',
      cell: (info) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
          <span style={{ 
            padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, 
            background: info.getValue() === 'INSTALLMENT' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
            color: info.getValue() === 'INSTALLMENT' ? '#3b82f6' : '#10b981' 
          }}>
            {info.getValue() as string}
          </span>
          {info.row.original.trip_id ? (
            <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              TRIP
            </span>
          ) : (
            <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: 'rgba(156, 163, 175, 0.1)', color: '#6b7280' }}>
              OFFICE
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'total',
      header: 'TOTAL AMOUNT',
      cell: (info) => (
        <span style={{ fontWeight: 600 }}>
          Rs. {Number(info.getValue()).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'STATUS',
      cell: ({ row }) => {
        const status = row.original.status;
        const isFullyReturned = row.original.is_fully_returned || status === 'RETURNED';
        const isPartiallyReturned = row.original.is_partially_returned;
        const totalRefunded = row.original.total_refunded || 0;

        if (isFullyReturned) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
              <span style={{ 
                padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, 
                background: 'rgba(239, 68, 68, 0.12)', 
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                REFUNDED
              </span>
              {totalRefunded > 0 && (
                <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>
                  Rs {Number(totalRefunded).toLocaleString('en-GB')}
                </span>
              )}
            </div>
          );
        }

        if (isPartiallyReturned) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
              <span style={{ 
                padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, 
                background: 'rgba(245, 158, 11, 0.12)', 
                color: '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                PARTIAL RETURN
              </span>
              {totalRefunded > 0 && (
                <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 600 }}>
                  Rs {Number(totalRefunded).toLocaleString('en-GB')}
                </span>
              )}
            </div>
          );
        }

        if (status === 'CANCELLED') {
          return (
            <span style={{ 
              padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, 
              background: 'rgba(156, 163, 175, 0.12)', 
              color: '#6b7280' 
            }}>
              CANCELLED
            </span>
          );
        }

        return (
          <span style={{ 
            padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, 
            background: 'rgba(16, 185, 129, 0.12)', 
            color: '#10b981' 
          }}>
            COMPLETED
          </span>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'DATE',
      cell: (info) => <span style={{ color: 'var(--text-secondary)' }}>{new Date(info.getValue() as string).toLocaleString('en-GB')}</span>,
    },
  ], []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: '4px' }}>Sales History</h1>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>View past transactions and receipts.</p>
        </div>
        <PermissionGuard permission="sales:create" behavior="disable">
          <button 
            onClick={() => navigate('/pos')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 16px',
              background: 'var(--brand-primary)',
              color: 'var(--bg-primary)',
              border: 'none',
              borderRadius: 'var(--border-radius-sm)',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Plus size={18} />
            New POS Sale
          </button>
        </PermissionGuard>
      </div>

      {/* Advanced Filters Toolbar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '280px', flex: 1 }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Multi-Attribute Search</label>
          <input 
            type="text" 
            placeholder="Search Invoice #, Serial #, Customer Name, Mobile, NIC, or Product..." 
            className="input-field" 
            value={search}
            onChange={(e) => setFilters({ search: e.target.value })}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>From Date</label>
          <input type="date" className="input-field" value={startDate} onChange={(e) => setFilters({ startDate: e.target.value })} />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>To Date</label>
          <input type="date" className="input-field" value={endDate} onChange={(e) => setFilters({ endDate: e.target.value })} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '130px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Sale Type</label>
          <select 
            className="input-field" 
            value={saleType} 
            onChange={(e) => setFilters({ saleType: e.target.value })}
          >
            <option value="ALL">All Types</option>
            <option value="DIRECT">Direct Sale</option>
            <option value="INSTALLMENT">Installment</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '130px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Payment Mode</label>
          <select 
            className="input-field" 
            value={paymentMode} 
            onChange={(e) => setFilters({ paymentMode: e.target.value })}
          >
            <option value="ALL">All Modes</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="TRANSFER">Transfer</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '130px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</label>
          <select 
            className="input-field" 
            value={status} 
            onChange={(e) => setFilters({ status: e.target.value })}
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="RETURNED">Returned</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '130px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Source</label>
          <select 
            className="input-field" 
            value={source} 
            onChange={(e) => setFilters({ source: e.target.value })}
          >
            <option value="ALL">All Sources</option>
            <option value="OFFICE">Office</option>
            <option value="TRIP">Trip</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '130px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Route</label>
          <select 
            className="input-field" 
            value={routeId} 
            onChange={(e) => setFilters({ routeId: e.target.value })}
          >
            <option value="ALL">All Routes</option>
            {routes.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '130px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Sold By</label>
          <select 
            className="input-field" 
            value={userId} 
            onChange={(e) => setFilters({ userId: e.target.value })}
          >
            <option value="ALL">All Users</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={sales} 
        isLoading={isLoading}
        onRowClick={(row) => navigate(`/sales/${row.id}`)}
        emptyMessage={error ? "Failed to load sales." : "No sales found."}
        serverPagination={meta ? {
          pageIndex,
          pageSize,
          pageCount: meta.total_pages,
          total: meta.total_records,
          setPagination
        } : undefined}
      />
    </div>
  );
}
