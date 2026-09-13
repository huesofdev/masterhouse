import { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useTrips } from '../api';
import { useRoutes } from '../../routes/api';
import { Plus, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CreateTripWizard } from '../components/CreateTripWizard';
import { DataTable } from '../../../components/DataTable';
import { PermissionGuard } from '../../../components/PermissionGuard';
import { useTableUrlState } from '../../../hooks/useTableUrlState';

export function TripsPage() {
  const {
    activeTab,
    routeId,
    search,
    pageIndex,
    pageSize,
    setFilters,
    setPagination,
    searchParams,
  } = useTableUrlState({
    defaultValues: {
      activeTab: 'ACTIVE' as 'ACTIVE' | 'PLANNED' | 'CLOSED',
      routeId: 'ALL',
      search: '',
    },
    defaultPageSize: 20,
  });

  const statusFilter = searchParams.get('status') || undefined;
  
  const { data: routesData } = useRoutes();
  const routes = routesData || [];
  
  const { data: result, isLoading } = useTrips(pageIndex + 1, pageSize, search, statusFilter, routeId);
  const trips = result?.data || [];
  const meta = result?.meta;
  
  const filteredTrips = useMemo(() => {
    if (statusFilter) return trips; // Don't filter if we are in a specific status view like RECONCILING
    return trips.filter((t: any) => {
      if (activeTab === 'PLANNED') return t.status === 'PLANNED';
      if (activeTab === 'CLOSED') return ['CLOSED', 'CLOSED_WITH_DISCREPANCIES', 'CANCELLED'].includes(t.status);
      if (activeTab === 'ACTIVE') return ['LOADING', 'DEPARTED', 'IN_PROGRESS', 'RECONCILING'].includes(t.status);
      return true;
    });
  }, [trips, activeTab, statusFilter]);
  
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const navigate = useNavigate();

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'planned_date',
      header: 'DATE PLANNED',
      cell: ({ row, getValue }) => {
        const plannedDate = new Date(getValue() as string).toLocaleDateString('en-GB');
        const createdAt = new Date(row.original.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span>{plannedDate}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{createdAt}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'route',
      header: 'ROUTE',
      cell: ({ row }) => (
        <span style={{ fontWeight: 600 }}>
          {row.original.route?.name || 'Unknown Route'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'STATUS',
      cell: (info) => {
        const status = info.getValue() as string;
        return (
          <span style={{ 
            padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
            background: status === 'PLANNED' ? 'rgba(59, 130, 246, 0.1)' : status === 'CLOSED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            color: status === 'PLANNED' ? '#3b82f6' : status === 'CLOSED' ? '#10b981' : '#f59e0b'
          }}>
            {status}
          </span>
        );
      }
    },
    {
      accessorKey: 'type',
      header: 'TYPE',
    },
    {
      accessorKey: 'actual_cash',
      header: 'ACTUAL CASH COLLECTED',
      cell: (info) => {
        const cash = parseFloat(info.getValue() as string);
        return (
          <span style={{ fontWeight: 600, color: cash > 0 ? 'var(--status-success)' : 'inherit' }}>
            Rs. {cash.toFixed(2)}
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: () => <div style={{ textAlign: 'right' }}>ACTIONS</div>,
      cell: ({ row }) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={() => navigate(`/trips/${row.original.id}`)} 
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
          >
            <Eye size={14} /> View Details
          </button>
        </div>
      ),
    },
  ], [navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: '4px' }}>
            {statusFilter === 'RECONCILING' ? 'Pending Reconciliations' : 'Trips'}
          </h1>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
            {statusFilter === 'RECONCILING' ? 'Trips waiting for warehouse verification and stock/cash reconciliation.' : 'Manage van field trips for sales and collections.'}
          </p>
        </div>
        {!statusFilter && (
          <PermissionGuard permission="trips:create" behavior="disable">
            <button 
              onClick={() => setIsWizardOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            >
              <Plus size={18} /> New Trip
            </button>
          </PermissionGuard>
        )}
      </div>

      {!statusFilter && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', marginBottom: '8px' }}>
          <div style={{ display: 'flex', gap: '24px' }}>
            {['ACTIVE', 'PLANNED', 'CLOSED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilters({ activeTab: tab as any })}
                style={{
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid var(--brand-primary)' : '2px solid transparent',
                  color: activeTab === tab ? 'var(--brand-primary)' : 'var(--text-secondary)',
                  fontWeight: activeTab === tab ? 600 : 500,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  marginBottom: '-1px'
                }}
              >
                {tab.toLowerCase()}
              </button>
            ))}
          </div>
          <div style={{ paddingBottom: '8px' }}>
            <select
              value={routeId}
              onChange={(e) => setFilters({ routeId: e.target.value })}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Routes</option>
              {routes.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <DataTable 
        columns={columns} 
        data={filteredTrips} 
        isLoading={isLoading}
        onRowClick={(row: any) => navigate(`/trips/${row.id}`)}
        emptyMessage="No trips found. Create one to get started."
        serverPagination={meta ? {
          pageIndex,
          pageSize,
          pageCount: meta.total_pages,
          total: meta.total_records,
          setPagination
        } : undefined}
      />

      {isWizardOpen && <CreateTripWizard onClose={() => setIsWizardOpen(false)} />}
    </div>
  );
}
