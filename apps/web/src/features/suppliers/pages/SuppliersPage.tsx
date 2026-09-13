import { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import { useSuppliers } from '../api';
import { Plus, Edit2, Play, Pause } from 'lucide-react';
import { SupplierFormModal } from '../components/SupplierFormModal';
import { useUpdateSupplier } from '../api';
import { DataTable } from '../../../components/DataTable';
import type { Supplier } from '../types';
import { useTableUrlState } from '../../../hooks/useTableUrlState';

export function SuppliersPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>();
  const { search, pageIndex, pageSize, setPagination } = useTableUrlState({
    defaultValues: {
      search: '',
    },
    defaultPageSize: 20,
  });
  const navigate = useNavigate();
  
  const { data: result, isLoading } = useSuppliers(pageIndex + 1, pageSize, search);
  const suppliers = result?.data || [];
  const meta = result?.meta;
  
  const updateMutation = useUpdateSupplier();

  const handleToggleStatus = async (supplier: Supplier) => {
    await updateMutation.mutateAsync({
      id: supplier.id,
      data: { is_active: !supplier.is_active }
    });
  };

  const columns = useMemo<ColumnDef<Supplier>[]>(() => [
    {
      accessorKey: 'name',
      header: 'SUPPLIER NAME',
      cell: (info) => <span style={{ fontWeight: 600 }}>{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'contact_person',
      header: 'CONTACT PERSON',
    },
    {
      accessorKey: 'email',
      header: 'EMAIL',
    },
    {
      accessorKey: 'phone',
      header: 'PHONE',
    },
    {
      accessorKey: 'balance_due',
      header: () => <div style={{ textAlign: 'right' }}>BALANCE DUE</div>,
      cell: (info) => (
        <div style={{ textAlign: 'right', fontWeight: 600, color: 'var(--status-error)' }}>
          Rs {parseFloat(info.getValue() as string || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'STATUS',
      cell: ({ row }) => {
        const isActive = row.original.is_active;
        return (
          <span style={{ 
            padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
            background: isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
            color: isActive ? 'var(--status-success)' : 'var(--status-error)'
          }}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: () => <div style={{ textAlign: 'right' }}>ACTIONS</div>,
      cell: ({ row }) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); handleToggleStatus(row.original); }}
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
          >
            {row.original.is_active ? <><Pause size={14} /> Suspend</> : <><Play size={14} /> Activate</>}
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setEditingSupplier(row.original);
              setShowForm(true);
            }}
            style={{ background: 'rgba(59, 130, 246, 0.1)', border: 'none', color: 'var(--brand-primary)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
          >
            <Edit2 size={14} /> Edit
          </button>
        </div>
      ),
    },
  ], []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: '4px' }}>Suppliers</h1>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>Manage your vendors and distributors</p>
        </div>
        <button onClick={() => { setEditingSupplier(undefined); setShowForm(true); }} style={{ 
          display: 'flex', alignItems: 'center', gap: '8px', 
          background: 'var(--brand-primary)', color: 'white', 
          padding: '10px 16px', borderRadius: '8px', 
          border: 'none', fontWeight: 600, cursor: 'pointer' 
        }}>
          <Plus size={18} /> Add Supplier
        </button>
      </div>

      <DataTable 
        columns={columns} 
        data={suppliers} 
        isLoading={isLoading}
        emptyMessage="No suppliers found."
        serverPagination={meta ? {
          pageIndex,
          pageSize,
          pageCount: meta.total_pages,
          total: meta.total_records,
          setPagination
        } : undefined}
        onRowClick={(row) => navigate(`/suppliers/${row.id}`)}
      />

      {showForm && (
        <SupplierFormModal 
          supplier={editingSupplier}
          onClose={() => {
            setShowForm(false);
            setEditingSupplier(undefined);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingSupplier(undefined);
          }}
        />
      )}
    </div>
  );
}
