import { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useCustomers } from '../api';
import { Plus, Edit2, Image as ImageIcon, Eye, Search, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CustomerFormModal } from '../components/CustomerFormModal';
import { useRoutes } from '../../routes/api';
import { NICViewModal } from '../components/NICViewModal';
import { DataTable } from '../../../components/DataTable';
import { PermissionGuard } from '../../../components/PermissionGuard';
import { useTableUrlState } from '../../../hooks/useTableUrlState';

export function CustomersPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [viewingNic, setViewingNic] = useState<{ customerId: string, side: 'front' | 'back' } | null>(null);
  
  const {
    search,
    routeFilter,
    activeStatus,
    contractCount,
    pageIndex,
    pageSize,
    setFilters,
    setPagination,
  } = useTableUrlState({
    defaultValues: {
      search: '',
      routeFilter: '',
      activeStatus: 'ALL',
      contractCount: '',
    },
    defaultPageSize: 100,
  });
  
  const navigate = useNavigate();

  const { data: routesData } = useRoutes();
  const routes = routesData || [];

  const { data: result, isLoading } = useCustomers(pageIndex + 1, pageSize, search, routeFilter, activeStatus, contractCount);
  const customers = result?.data || [];
  const meta = result?.meta;

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'full_name',
      header: 'CUSTOMER NAME',
      cell: ({ row }) => {
        const name = row.original.full_name;
        const r = parseFloat(row.original.rating ?? '0');
        const isOverride = row.original.rating_override;
        const activeContracts = Number(row.original.active_contracts_count || 0);

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{name}</span>

            {/* Star Rating Line */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              {r > 0 ? (
                <>
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star
                      key={s}
                      size={11}
                      fill={s <= Math.round(r) ? 'var(--brand-primary)' : 'none'}
                      color={s <= Math.round(r) ? 'var(--brand-primary)' : 'var(--text-muted)'}
                    />
                  ))}
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--brand-primary)', marginLeft: '3px' }}>
                    {r.toFixed(1)}
                  </span>
                  {isOverride && (
                    <span style={{ fontSize: '8px', background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', padding: '0 3px', borderRadius: '2px', fontWeight: 600, marginLeft: '2px' }}>
                      M
                    </span>
                  )}
                </>
              ) : (
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>No rating</span>
              )}
            </div>

            {/* Active Contracts Label (Below Ratings) */}
            <div style={{ marginTop: '2px' }}>
              {activeContracts > 0 ? (
                <span style={{ 
                  fontSize: '10px', 
                  fontWeight: 600, 
                  padding: '1px 6px', 
                  borderRadius: '4px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  display: 'inline-block',
                  lineHeight: '1.3'
                }}>
                  {activeContracts} Active {activeContracts === 1 ? 'Contract' : 'Contracts'}
                </span>
              ) : (
                <span style={{ 
                  fontSize: '10px', 
                  color: 'var(--text-muted)', 
                  display: 'inline-block',
                  lineHeight: '1.3'
                }}>
                  0 Active Contracts
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'nic',
      header: 'NIC',
      cell: (info) => <span style={{ fontFamily: 'monospace' }}>{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'mobile',
      header: 'MOBILE',
    },
    {
      id: 'route_area',
      header: 'ROUTE / AREA',
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontWeight: 500, fontSize: '13px' }}>{c.route_name || '-'}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{c.area_name || '-'}</span>
          </div>
        );
      }
    },
    {
      accessorKey: 'address',
      header: 'ADDRESS',
      cell: (info) => (
        <span style={{ color: 'var(--text-secondary)', fontSize: '13px', display: 'block', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {info.getValue() as string}
        </span>
      ),
    },
    {
      id: 'documents',
      header: () => <div style={{ textAlign: 'center' }}>DOCUMENTS</div>,
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button 
              onClick={() => setViewingNic({ customerId: customer.id, side: 'front' })}
              disabled={!customer.nic_front_url}
              style={{ background: 'transparent', border: 'none', cursor: customer.nic_front_url ? 'pointer' : 'not-allowed', color: customer.nic_front_url ? 'var(--brand-primary)' : 'var(--text-secondary)', opacity: customer.nic_front_url ? 1 : 0.4 }}
              title="Front Side"
            >
              <ImageIcon size={18} /> Front
            </button>
            <button 
              onClick={() => setViewingNic({ customerId: customer.id, side: 'back' })}
              disabled={!customer.nic_back_url}
              style={{ background: 'transparent', border: 'none', cursor: customer.nic_back_url ? 'pointer' : 'not-allowed', color: customer.nic_back_url ? 'var(--brand-primary)' : 'var(--text-secondary)', opacity: customer.nic_back_url ? 1 : 0.4 }}
              title="Back Side"
            >
              <ImageIcon size={18} /> Back
            </button>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div style={{ textAlign: 'right' }}>ACTIONS</div>,
      cell: ({ row }) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button 
            onClick={() => navigate(`/customers/${row.original.id}`)}
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
          >
            <Eye size={14} /> Profile
          </button>
          <PermissionGuard permission="customers:update" behavior="disable">
            <button 
              onClick={() => {
                setEditingCustomer(row.original);
                setShowForm(true);
              }}
              style={{ background: 'rgba(59, 130, 246, 0.1)', border: 'none', color: 'var(--brand-primary)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
            >
              <Edit2 size={14} /> Edit
            </button>
          </PermissionGuard>
        </div>
      ),
    },
  ], [navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: '4px' }}>Customers</h1>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>Manage walk-in and installment customers</p>
        </div>
        <PermissionGuard permission="customers:create" behavior="disable">
          <button onClick={() => setShowForm(true)} style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            background: 'var(--brand-primary)', color: 'white', 
            padding: '10px 16px', borderRadius: '8px', 
            border: 'none', fontWeight: 600, cursor: 'pointer' 
          }}>
            <Plus size={18} /> Add Customer
          </button>
        </PermissionGuard>
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '400px' }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search by name, NIC, or mobile..." 
            value={search}
            onChange={(e) => setFilters({ search: e.target.value })}
            style={{ 
              width: '100%', padding: '10px 12px 10px 38px', 
              borderRadius: '8px', border: '1px solid var(--border-color)', 
              background: 'var(--bg-primary)', color: 'var(--text-primary)',
              outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>
        <select
          value={routeFilter}
          onChange={(e) => setFilters({ routeFilter: e.target.value })}
          style={{
            padding: '10px 16px',
            borderRadius: '8px', border: '1px solid var(--border-color)', 
            background: 'var(--bg-primary)', color: 'var(--text-primary)',
            outline: 'none', cursor: 'pointer', minWidth: '180px'
          }}
        >
          <option value="">All Routes</option>
          {routes.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <select
          value={activeStatus}
          onChange={(e) => setFilters({ activeStatus: e.target.value })}
          style={{
            padding: '10px 16px',
            borderRadius: '8px', border: '1px solid var(--border-color)', 
            background: 'var(--bg-primary)', color: 'var(--text-primary)',
            outline: 'none', cursor: 'pointer', minWidth: '140px'
          }}
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active Only</option>
          <option value="INACTIVE">Inactive Only</option>
        </select>
        <select
          value={contractCount}
          onChange={(e) => setFilters({ contractCount: e.target.value })}
          style={{
            padding: '10px 16px',
            borderRadius: '8px', border: '1px solid var(--border-color)', 
            background: 'var(--bg-primary)', color: 'var(--text-primary)',
            outline: 'none', cursor: 'pointer', minWidth: '150px'
          }}
        >
          <option value="">All Contracts</option>
          <option value="0">0 Contracts</option>
          <option value="1">1 Contract</option>
          <option value="2">2 Contracts</option>
          <option value="3">3 Contracts</option>
          <option value="4">4 Contracts</option>
          <option value="5">5 Contracts</option>
          <option value="6">6 Contracts</option>
          <option value="7">7 Contracts</option>
          <option value="8">8 Contracts</option>
          <option value="9">9 Contracts</option>
          <option value="10+">10+ Contracts</option>
        </select>
      </div>

      <DataTable 
        columns={columns} 
        data={customers} 
        isLoading={isLoading}
        emptyMessage="No customers found."
        serverPagination={meta ? {
          pageIndex,
          pageSize,
          pageCount: meta.total_pages,
          total: meta.total_records,
          setPagination
        } : undefined}
      />

      {showForm && (
        <CustomerFormModal 
          customer={editingCustomer}
          onClose={() => {
            setShowForm(false);
            setEditingCustomer(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingCustomer(null);
          }}
        />
      )}

      {viewingNic && (
        <NICViewModal 
          customerId={viewingNic.customerId}
          side={viewingNic.side}
          onClose={() => setViewingNic(null)}
        />
      )}
    </div>
  );
}
