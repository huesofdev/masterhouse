import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useGetWallets } from '../api';
import { Link } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { DataTable } from '../../../components/DataTable';
import type { WalletListItem } from '../types';
import { PermissionGuard } from '../../../components/PermissionGuard';
import { useTableUrlState } from '../../../hooks/useTableUrlState';

export const WalletsList = () => {
  const { search, pageIndex, pageSize, setFilters, setPagination } = useTableUrlState({
    defaultValues: {
      search: '',
    },
    defaultPageSize: 20,
  });

  const { data: result, isLoading } = useGetWallets(pageIndex + 1, pageSize, search);
  const users = result?.data || [];
  const meta = result?.meta;

  const columns = useMemo<ColumnDef<WalletListItem, any>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Staff Member',
      cell: (info) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600 }}>{info.getValue()}</span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{info.row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: 'balance',
      header: 'Ledger Balance',
      cell: (info) => {
        const balance = parseFloat(info.getValue());
        const isNegative = balance < 0;
        return (
          <div style={{ 
            fontWeight: 700, 
            color: isNegative ? 'var(--status-error)' : 'var(--status-success)',
            textAlign: 'right'
          }}>
            Rs. {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            {isNegative && (
              <div style={{ fontSize: '10px', color: 'var(--status-error)', opacity: 0.8, textTransform: 'uppercase' }}>
                Owes Company
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: (info) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Link
            to={`/wallets/${info.row.original.user_id}`}
            style={{
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '6px 12px',
              background: 'var(--bg-tertiary)',
              color: 'var(--brand-cta)',
              textDecoration: 'none',
              borderRadius: 'var(--border-radius-sm)',
              fontWeight: 600,
              fontSize: 'var(--font-size-sm)'
            }}
          >
            <Wallet size={16} />
            View Ledger
          </Link>
        </div>
      ),
    },
  ], []);

  return (
    <PermissionGuard permission="wallets:read">
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wallet size={24} color="var(--brand-primary)" />
            Staff Wallets
          </h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
            Monitor ledger balances and discrepancies across your branch.
          </p>
        </div>
        <div>
          <input
            type="text"
            placeholder="Search staff..."
            value={search}
            onChange={(e) => setFilters({ search: e.target.value })}
            style={{
              padding: '10px 16px',
              borderRadius: 'var(--border-radius-sm)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              width: '250px'
            }}
          />
        </div>
      </div>

      <div style={{ 
        background: 'var(--bg-secondary)', 
        borderRadius: 'var(--border-radius-md)', 
        border: '1px solid var(--border-color)',
        overflow: 'hidden'
      }}>
        <DataTable
          columns={columns}
          data={users}
          isLoading={isLoading}
          serverPagination={meta ? {
            pageIndex,
            pageSize,
            pageCount: meta.total_pages,
            total: meta.total_records,
            setPagination
          } : undefined}
        />
      </div>
    </div>
    </PermissionGuard>
  );
};
