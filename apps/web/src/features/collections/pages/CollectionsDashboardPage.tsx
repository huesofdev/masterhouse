import { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import { useCollectionSchedules, useScheduleCounts } from '../api';
import { useRoutes } from '../../routes/api';
import { ReceivePaymentModal } from '../components/ReceivePaymentModal';
import { ContractAdjustmentModal } from '../components/ContractAdjustmentModal';
import { ReceiptHistoryModal } from '../components/ReceiptHistoryModal';
import { Calendar, AlertCircle, Clock, Filter, Map, Package, CheckCircle2, History, Printer } from 'lucide-react';
import { DataTable } from '../../../components/DataTable';
import { PermissionGuard } from '../../../components/PermissionGuard';
import { useAuth } from '../../../hooks/useAuth';
import { useTableUrlState } from '../../../hooks/useTableUrlState';
import { useBranchStore } from '../../../hooks/useBranchStore';
import { useBranches } from '../../branches/api';
import { printReportDocument, formatDateGB } from '../../../lib/printReport';
import { apiClient as api } from '../../../lib/axios';

export function CollectionsDashboardPage() {
  const {
    activeTab,
    search,
    routeId,
    areaId,
    status,
    startDate,
    endDate,
    pageIndex,
    pageSize,
    setFilters,
    setPagination,
  } = useTableUrlState({
    defaultValues: {
      activeTab: 'overdue' as 'overdue' | 'today' | 'upcoming' | 'custom' | 'paid',
      search: '',
      routeId: '',
      areaId: '',
      status: 'PENDING_OVERDUE',
      startDate: '',
      endDate: '',
    },
    defaultPageSize: 100,
  });

  const [collectingContract, setCollectingContract] = useState<any>(null);
  const [adjustingContract, setAdjustingContract] = useState<any>(null);
  const [historyContractId, setHistoryContractId] = useState<string | null>(null);
  
  const { hasPermission } = useAuth();
  const hasAdjustPermission = hasPermission('collections:adjust');

  const { data: routesData } = useRoutes();
  const selectedRoute = routesData?.find((r: any) => r.id === routeId);
  const selectedRouteAreas = selectedRoute?.areas || [];

  const { data: counts } = useScheduleCounts(routeId || undefined, areaId || undefined);

  // Method 2 Overdue Ratio: Overdue vs (Due Today + Upcoming Pipeline)
  const futureDues = (counts?.todayAmount ?? 0) + (counts?.upcomingAmount ?? 0);
  const overduePercentage = futureDues > 0 
    ? (((counts?.overdueAmount ?? 0) / futureDues) * 100).toFixed(1) 
    : '0.0';

  const { data: result, isLoading } = useCollectionSchedules(
    activeTab, 
    pageIndex + 1, 
    pageSize, 
    search,
    routeId || undefined,
    areaId || undefined,
    startDate || undefined,
    endDate || undefined,
    status !== 'PENDING_OVERDUE' ? status : undefined
  );
  const schedules = result?.data || [];
  const meta = result?.meta;
  
  const navigate = useNavigate();

  const handleTabChange = (tab: 'overdue' | 'today' | 'upcoming' | 'custom' | 'paid') => {
    if (tab !== 'custom') {
      setFilters({ activeTab: tab, startDate: '', endDate: '' });
    } else {
      setFilters({ activeTab: tab });
    }
  };

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'customer_name',
      header: 'CUSTOMER',
      cell: ({ row }) => (
        <div>
          <div 
            onClick={(e) => { e.stopPropagation(); navigate(`/customers/${row.original.customer_id}`); }}
            style={{ fontWeight: 600, color: 'var(--brand-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {row.original.customer_name}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
            <span>{row.original.customer_mobile}</span>
            {row.original.customer_route && (
              <>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--text-muted)' }}>
                  <Map size={10} /> {row.original.customer_route}
                </span>
              </>
            )}
            {row.original.gps_lat && row.original.gps_lng && (
              <>
                <span>•</span>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${row.original.gps_lat},${row.original.gps_lng}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  🗺️ Navigate
                </a>
              </>
            )}
          </div>
          {row.original.product_name && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <Package size={10} /> {row.original.product_name}
            </div>
          )}
        </div>
      )
    },
    {
      accessorKey: 'due_date',
      header: 'DUE DATE',
      cell: (info) => (
        <span style={{ color: activeTab === 'overdue' ? 'var(--status-error)' : 'inherit', fontWeight: activeTab === 'overdue' ? 600 : 400 }}>
          {new Date(info.getValue() as string).toLocaleDateString('en-GB')}
        </span>
      ),
    },
    {
      accessorKey: 'installment_number',
      header: 'INSTALLMENT',
      cell: (info) => {
        const val = Number(info.getValue());
        return <span>{val === 0 ? 'Downpayment Recovery' : `#${val}`}</span>;
      },
    },
    {
      id: 'pending_amount',
      header: 'PENDING AMOUNT',
      cell: ({ row }) => {
        const due = Math.max(0, parseFloat(row.original.amount_due) - parseFloat(row.original.amount_paid));
        return <span style={{ fontWeight: 700 }}>Rs. {due.toLocaleString('en-GB')}</span>;
      }
    },
    {
      accessorKey: 'status',
      header: 'STATUS',
      cell: (info) => {
        const status = info.getValue() as string;
        return (
          <span style={{ 
            padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
            background: status === 'PARTIALLY_PAID' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
            color: status === 'PARTIALLY_PAID' ? '#f59e0b' : '#3b82f6'
          }}>
            {status.replace('_', ' ')}
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: () => <div style={{ textAlign: 'right' }}>ACTIONS</div>,
      cell: ({ row }) => {
        const due = Math.max(0, parseFloat(row.original.amount_due) - parseFloat(row.original.amount_paid));
        return (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setHistoryContractId(row.original.contract_id);
              }}
              style={{ padding: '8px 12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <History size={14} /> History
            </button>
            {due > 0 && (
              <>
                <PermissionGuard permission="collections:create" behavior="disable">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCollectingContract({ id: row.original.contract_id, balance: row.original.contract_balance, status: row.original.contract_status, dueAmount: due });
                    }}
                    style={{ padding: '8px 12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Collect
                  </button>
                </PermissionGuard>
                {hasAdjustPermission && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setAdjustingContract({ 
                        id: row.original.contract_id, 
                        balance: row.original.contract_balance, 
                        status: row.original.contract_status, 
                        dueAmount: due,
                        schedule: {
                          id: row.original.schedule_id,
                          installment_number: row.original.installment_number,
                          due_date: row.original.due_date,
                          amount_due: row.original.amount_due,
                          amount_paid: row.original.amount_paid,
                          dueAmount: due,
                        }
                      });
                    }}
                    style={{ padding: '8px 12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Adjust
                  </button>
                )}
              </>
            )}
          </div>
        );
      },
    }
  ], [activeTab, navigate]);

  const activeBranchId = useBranchStore(state => state.activeBranchId);
  const { data: branches } = useBranches();
  const activeBranch = branches?.find((b: any) => b.id === activeBranchId);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrintCustomRangeSheet = async () => {
    setIsPrinting(true);
    try {
      const res = await api.get('/collections/schedules', {
        headers: { 'x-branch-id': activeBranchId },
        params: {
          filter: 'custom',
          page: 1,
          limit: 5000,
          search: search || undefined,
          routeId: routeId || undefined,
          areaId: areaId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          status: status !== 'PENDING_OVERDUE' ? status : undefined,
        }
      });

      const fullData = res.data?.data || [];
      const fullMeta = res.data?.meta;

      if (!fullData || fullData.length === 0) {
        alert("No schedules found matching the selected custom range filters.");
        return;
      }

      const statusLabels: Record<string, string> = {
        'PENDING_OVERDUE': 'All Unpaid (Pending, Overdue, Partial)',
        'OVERDUE': 'Overdue Only',
        'PENDING': 'Pending Only',
        'PARTIALLY_PAID': 'Partially Paid Only',
        'PAID': 'Paid Only',
        'ALL': 'All Statuses'
      };

      const selectedArea = selectedRouteAreas.find((a: any) => a.id === areaId);
      const filterParts: string[] = [];
      if (activeBranch?.name) filterParts.push(`Branch: ${activeBranch.name}`);
      if (selectedRoute?.name) filterParts.push(`Route: ${selectedRoute.name}`);
      if (selectedArea?.name) filterParts.push(`Area: ${selectedArea.name}`);
      if (startDate || endDate) {
        filterParts.push(`Date Range: ${startDate ? formatDateGB(startDate) : 'Start'} to ${endDate ? formatDateGB(endDate) : 'End'}`);
      } else {
        filterParts.push('Date Range: All Dates');
      }
      filterParts.push(`Status: ${statusLabels[status] || status}`);
      if (search) filterParts.push(`Search: "${search}"`);
      if (fullMeta?.total_pending_amount != null) {
        filterParts.push(`Total Pending: Rs. ${Number(fullMeta.total_pending_amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`);
      }
      if (fullMeta?.total_paid_amount != null && (status === 'PAID' || status === 'ALL')) {
        filterParts.push(`Total Collected: Rs. ${Number(fullMeta.total_paid_amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`);
      }

      const columns = [
        {
          header: '#',
          cell: (item: any) => item._index || '-',
          width: '56px',
          align: 'center' as const,
          nowrap: true
        },
        {
          header: 'Customer',
          cell: (item: any) => item.customer_name || '-',
          width: '20%'
        },
        {
          header: 'Mobile',
          cell: (item: any) => item.customer_mobile || '-',
          width: '11%',
          align: 'center' as const,
          nowrap: true
        },
        {
          header: 'Address',
          cell: (item: any) => item.customer_address || '-',
          width: '25%'
        },
        {
          header: 'Product / Agreement',
          cell: (item: any) => {
            const prod = item.product_name || 'Item';
            const inst = Number(item.installment_number) === 0 ? 'DP Recovery' : `#${item.installment_number}`;
            return `${prod} (${inst})`;
          },
          width: '14%'
        },
        {
          header: 'Due Date',
          cell: (item: any) => item.due_date ? formatDateGB(item.due_date) : '-',
          width: '10%',
          align: 'center' as const,
          nowrap: true
        },
        {
          header: 'Pending (Rs.)',
          cell: (item: any) => {
            const due = Math.max(0, parseFloat(item.amount_due || 0) - parseFloat(item.amount_paid || 0));
            return due.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          },
          width: '10%',
          align: 'right' as const,
          nowrap: true
        },
        {
          header: 'Contract Bal. (Rs.)',
          cell: (item: any) => {
            const bal = parseFloat(item.contract_balance || 0);
            return bal.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          },
          width: '10%',
          align: 'right' as const,
          nowrap: true
        }
      ];

      const indexedData = fullData.map((item: any, i: number) => ({ ...item, _index: i + 1 }));

      printReportDocument(
        'COLLECTIONS RUN SHEET (CUSTOM RANGE)',
        filterParts.join(' | '),
        columns,
        indexedData,
        { orientation: 'landscape' }
      );
    } catch (err: any) {
      console.error('Failed to print collection sheet:', err);
      alert(err.response?.data?.message || err.message || 'Failed to generate print sheet.');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: '4px' }}>Collections</h1>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>Track daily collections and follow up with defaulters.</p>
        </div>
      </div>

      {/* Top Interactive KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <CollectionSummaryCard 
          title="Total Overdue"
          amount={counts?.overdueAmount ?? 0}
          count={counts?.overdue ?? 0}
          customersCount={counts?.overdueCustomersCount}
          icon={<AlertCircle size={20} />}
          accentColor="#ef4444"
          active={activeTab === 'overdue'}
          onClick={() => handleTabChange('overdue')}
          badgeText={`${overduePercentage}% vs Pipeline`}
        />
        <CollectionSummaryCard 
          title="Due Today"
          amount={counts?.todayAmount ?? 0}
          count={counts?.today ?? 0}
          customersCount={counts?.todayCustomersCount}
          icon={<Calendar size={20} />}
          accentColor="#f59e0b"
          active={activeTab === 'today'}
          onClick={() => handleTabChange('today')}
          badgeText="Daily Target"
        />
        <CollectionSummaryCard 
          title="Upcoming Pipeline"
          amount={counts?.upcomingAmount ?? 0}
          count={counts?.upcoming ?? 0}
          customersCount={counts?.upcomingCustomersCount}
          icon={<Clock size={20} />}
          accentColor="#3b82f6"
          active={activeTab === 'upcoming'}
          onClick={() => handleTabChange('upcoming')}
          badgeText="Future Dues"
        />
      </div>

      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-color)', overflowX: 'auto', paddingBottom: '2px' }}>
        <TabButton 
          active={activeTab === 'overdue'} 
          onClick={() => handleTabChange('overdue')}
          icon={<AlertCircle size={18} />}
          label="Overdue"
          color="#ef4444"
          count={counts?.overdue}
        />
        <TabButton 
          active={activeTab === 'today'} 
          onClick={() => handleTabChange('today')}
          icon={<Calendar size={18} />}
          label="Due Today"
          color="#f59e0b"
          count={counts?.today}
        />
        <TabButton 
          active={activeTab === 'upcoming'} 
          onClick={() => handleTabChange('upcoming')}
          icon={<Clock size={18} />}
          label="Upcoming"
          color="#3b82f6"
          count={counts?.upcoming}
        />
        <TabButton 
          active={activeTab === 'paid'} 
          onClick={() => handleTabChange('paid')}
          icon={<CheckCircle2 size={18} />}
          label="Paid"
          color="#10b981"
        />
        <TabButton 
          active={activeTab === 'custom'} 
          onClick={() => handleTabChange('custom')}
          icon={<Filter size={18} />}
          label="Custom Range"
          color="var(--brand-primary)"
        />
      </div>

      {/* Advanced Filters Toolbar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Search</label>
          <input 
            type="text" 
            placeholder="Name, Phone, Route..." 
            className="input-field" 
            value={search}
            onChange={(e) => setFilters({ search: e.target.value })}
          />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '160px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Route</label>
          <select 
            className="input-field" 
            value={routeId} 
            onChange={(e) => setFilters({ routeId: e.target.value, areaId: '' })}
          >
            <option value="">All Routes</option>
            {routesData?.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        {routeId && selectedRouteAreas.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '160px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Area</label>
            <select 
              className="input-field" 
              value={areaId} 
              onChange={(e) => setFilters({ areaId: e.target.value })}
            >
              <option value="">All Areas</option>
              {selectedRouteAreas.map((area: any) => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
          </div>
        )}

        {activeTab === 'custom' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '200px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Payment Status</label>
            <select 
              className="input-field" 
              value={status} 
              onChange={(e) => setFilters({ status: e.target.value })}
            >
              <option value="PENDING_OVERDUE">All Unpaid (Pending, Overdue, Partial)</option>
              <option value="OVERDUE">Overdue Only</option>
              <option value="PENDING">Pending Only</option>
              <option value="PARTIALLY_PAID">Partially Paid Only</option>
              <option value="PAID">Paid Only</option>
              <option value="ALL">All Statuses</option>
            </select>
          </div>
        )}

        {activeTab === 'custom' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Start Date</label>
              <input type="date" className="input-field" value={startDate} onChange={(e) => setFilters({ startDate: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>End Date</label>
              <input type="date" className="input-field" value={endDate} onChange={(e) => setFilters({ endDate: e.target.value })} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'flex-end', marginLeft: 'auto' }}>
              <button
                type="button"
                onClick={handlePrintCustomRangeSheet}
                disabled={isPrinting || (meta?.total_records ?? 0) === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  background: 'var(--brand-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: (isPrinting || (meta?.total_records ?? 0) === 0) ? 'not-allowed' : 'pointer',
                  opacity: (isPrinting || (meta?.total_records ?? 0) === 0) ? 0.6 : 1,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  transition: 'all 0.15s ease'
                }}
                title="Print unpaginated collection run sheet or export to PDF"
              >
                <Printer size={16} />
                <span>{isPrinting ? 'Preparing Sheet...' : 'Print Sheet (PDF)'}</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Active Tab View Summary Banner for Custom / Paid / Search */}
      {activeTab === 'custom' && meta && (
        <div style={{ background: 'var(--bg-secondary)', padding: '12px 18px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Custom Range Summary: <strong style={{ color: 'var(--text-primary)' }}>{meta.total_records}</strong> schedules across <strong style={{ color: 'var(--text-primary)' }}>{meta.unique_customers_count || 0}</strong> accounts
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            {status === 'PAID' ? (
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>
                Total Collected: Rs. {(meta.total_paid_amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            ) : status === 'ALL' ? (
              <>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--brand-primary)' }}>
                  Total Pending: Rs. {(meta.total_pending_amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>
                  Total Collected: Rs. {(meta.total_paid_amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </>
            ) : (
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--brand-primary)' }}>
                Total Pending: Rs. {(meta.total_pending_amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'paid' && meta && (
        <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '12px 18px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 600 }}>
            Paid Schedules: <strong>{meta.total_records}</strong> installments collected
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>
            Total Collected: Rs. {(meta.total_paid_amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      )}

      {search.trim() !== '' && (activeTab === 'overdue' || activeTab === 'today' || activeTab === 'upcoming') && meta && (
        <div style={{ background: 'var(--bg-secondary)', padding: '10px 16px', borderRadius: '8px', border: '1px dashed var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            Filtered by &ldquo;<strong>{search}</strong>&rdquo;: {meta.total_records} schedules matching
          </span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            Total Filtered Pending: Rs. {(meta.total_pending_amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}

      <DataTable 
        columns={columns} 
        data={schedules} 
        isLoading={isLoading}
        emptyMessage={`No ${activeTab} schedules found.`}
        serverPagination={meta ? {
          pageIndex,
          pageSize,
          pageCount: meta.total_pages,
          total: meta.total_records,
          setPagination
        } : undefined}
      />

      {collectingContract && (
        <ReceivePaymentModal 
          contract={collectingContract}
          onClose={() => setCollectingContract(null)}
        />
      )}

      {adjustingContract && (
        <ContractAdjustmentModal 
          contract={adjustingContract}
          onClose={() => setAdjustingContract(null)}
        />
      )}

      {historyContractId && (
        <ReceiptHistoryModal 
          contractId={historyContractId}
          customerLat={schedules.find((s: any) => s.contract_id === historyContractId)?.gps_lat}
          customerLng={schedules.find((s: any) => s.contract_id === historyContractId)?.gps_lng}
          onClose={() => setHistoryContractId(null)}
        />
      )}
    </div>
  );
}

function CollectionSummaryCard({
  title,
  amount,
  count,
  customersCount,
  icon,
  accentColor,
  active,
  onClick,
  badgeText
}: {
  title: string;
  amount: number;
  count: number;
  customersCount?: number;
  icon: React.ReactNode;
  accentColor: string;
  active: boolean;
  onClick: () => void;
  badgeText?: string;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-primary)',
        borderRadius: '14px',
        border: active ? `2px solid ${accentColor}` : '1px solid var(--border-color)',
        padding: '18px 20px',
        boxShadow: active ? `0 6px 20px ${accentColor}25` : '0 2px 8px rgba(0,0,0,0.04)',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.borderColor = `${accentColor}80`;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.borderColor = 'var(--border-color)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              background: `${accentColor}15`,
              color: accentColor,
              padding: '8px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {title}
          </span>
        </div>
        {badgeText && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '12px',
              background: `${accentColor}15`,
              color: accentColor,
            }}
          >
            {badgeText}
          </span>
        )}
      </div>

      <div>
        <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          Rs. {Number(amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{count}</span> installments
          {customersCount !== undefined && (
            <>
              <span>•</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{customersCount}</span> accounts
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, color, count }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, color: string, count?: number }) {
  return (
    <button 
      onClick={onClick}
      style={{ 
        padding: '12px 16px', background: 'transparent', border: 'none', 
        borderBottom: `3px solid ${active ? color : 'transparent'}`,
        color: active ? color : 'var(--text-secondary)',
        fontWeight: 600, cursor: 'pointer', marginBottom: '-1px',
        display: 'flex', alignItems: 'center', gap: '8px',
        opacity: active ? 1 : 0.7
      }}
    >
      {icon} {label}
      {count !== undefined && (
        <span style={{ 
          background: active ? color : 'var(--bg-tertiary)', 
          color: active ? 'white' : 'var(--text-secondary)',
          padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, marginLeft: '4px',
          minWidth: '20px', textAlign: 'center', display: 'inline-block'
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

