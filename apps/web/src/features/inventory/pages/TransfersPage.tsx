import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useTransfers } from '../api';
import { Plus, ArrowRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../../../components/DataTable';
import { format } from 'date-fns';
import { PermissionGuard } from '../../../components/PermissionGuard';
import { useTableUrlState } from '../../../hooks/useTableUrlState';

export function TransfersPage() {
  const { pageIndex, pageSize, setPagination } = useTableUrlState({
    defaultValues: {},
    defaultPageSize: 20,
  });
  const navigate = useNavigate();

  const { data: result, isLoading } = useTransfers(pageIndex + 1, pageSize);
  const transfers = result?.data || [];
  const meta = result?.meta;

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'reference_number',
        header: 'Transfer ID',
        cell: (info) => <span style={{ fontWeight: 600 }}>{info.getValue() as string}</span>,
      },
      {
        accessorKey: 'transferred_at',
        header: 'Date',
        cell: (info) => format(new Date(info.getValue() as string), 'PPP p'),
      },
      {
        id: 'route',
        header: 'Route',
        cell: ({ row }) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{row.original.sourceWarehouse?.name}</span>
            <ArrowRight size={14} color="var(--text-muted)" />
            <span>{row.original.destinationWarehouse?.name}</span>
          </div>
        )
      },
      {
        id: 'items',
        header: 'Total Items',
        cell: ({ row }) => {
          const totalQty = row.original.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
          return <span>{totalQty} Items</span>;
        }
      },
      {
        accessorKey: 'transferredBy.name',
        header: 'Transferred By',
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn-secondary" 
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/inventory/transfers/${row.original.id}`);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '13px' }}
              title="View Details"
            >
              <ExternalLink size={14} /> Details
            </button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: '4px' }}>Stock Transfers</h1>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>View history of instant inventory transfers between warehouses.</p>
        </div>
        <PermissionGuard permission="inventory:transfer" behavior="disable">
          <button onClick={() => navigate('/inventory/transfers/new')} style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            background: 'var(--brand-primary)', color: 'white', 
            padding: '10px 16px', borderRadius: '8px', 
            border: 'none', fontWeight: 600, cursor: 'pointer' 
          }}>
            <Plus size={18} /> New Transfer
          </button>
        </PermissionGuard>
      </div>

      <DataTable 
        columns={columns} 
        data={transfers} 
        serverPagination={{
          pageIndex,
          pageSize,
          pageCount: meta?.total_pages || 1,
          total: meta?.total || 0,
          setPagination
        }}
        isLoading={isLoading}
        onRowClick={(row) => navigate(`/inventory/transfers/${row.id}`)}
      />
    </div>
  );
}
