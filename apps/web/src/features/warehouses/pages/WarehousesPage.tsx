import { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useWarehouses, useUpdateWarehouse } from '../api';
import { WarehouseForm } from '../components/WarehouseForm';
import { DataTable } from '../../../components/DataTable';
import type { Warehouse } from '../types';
import { Plus, Edit2, MapPin, Play, Pause, Phone } from 'lucide-react';
import { useBranchStore } from '../../../hooks/useBranchStore';

export function WarehousesPage() {
  const { data: warehouses, isLoading, error } = useWarehouses();
  const updateMutation = useUpdateWarehouse();
  const { activeBranchId } = useBranchStore();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  const handleCreate = () => {
    setEditingWarehouse(null);
    setIsFormOpen(true);
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setIsFormOpen(true);
  };

  const handleToggleActive = async (warehouse: Warehouse) => {
    await updateMutation.mutateAsync({ 
      id: warehouse.id, 
      data: { is_active: !warehouse.is_active } 
    });
  };

  if (!activeBranchId) {
    return (
      <div style={{ padding: 'var(--spacing-6)', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Please select an active branch from the sidebar to manage its warehouses.
      </div>
    );
  }

  const columns = useMemo<ColumnDef<Warehouse>[]>(() => [
    {
      accessorKey: 'name',
      header: 'WAREHOUSE',
      cell: ({ row }) => (
        <>
          <div style={{ fontWeight: 600, fontSize: '14px' }}>{row.original.name}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID: {row.original.id.slice(0, 8)}</div>
        </>
      ),
    },
    {
      accessorKey: 'address',
      header: 'CONTACT INFO',
      cell: ({ row }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
            <MapPin size={14} />
            {row.original.address}
          </div>
          {row.original.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '12px' }}>
              <Phone size={12} />
              {row.original.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'STATUS',
      cell: ({ row }) => {
        const isDefault = row.original.is_default;
        const isActive = row.original.is_active;
        return (
          <div style={{ display: 'flex', gap: '8px' }}>
            {isDefault && (
              <span style={{ 
                padding: '4px 8px', borderRadius: 'var(--border-radius-sm)', fontSize: '12px',
                background: 'rgba(139, 92, 246, 0.1)', color: 'var(--brand-cta)', border: '1px solid rgba(139, 92, 246, 0.2)'
              }}>
                Default
              </span>
            )}
            <span style={{ 
              padding: '4px 8px', borderRadius: 'var(--border-radius-sm)', fontSize: '12px',
              background: isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
              color: isActive ? 'var(--status-success)' : 'var(--status-error)', 
              border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
            }}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        );
      }
    },
    {
      id: 'actions',
      header: () => <div style={{ textAlign: 'right' }}>ACTIONS</div>,
      cell: ({ row }) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            onClick={() => handleToggleActive(row.original)}
            disabled={updateMutation.isPending}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            title={row.original.is_active ? "Pause (Deactivate)" : "Play (Activate)"}
          >
            {row.original.is_active ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button 
            onClick={() => handleEdit(row.original)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--brand-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <Edit2 size={16} />
          </button>
        </div>
      ),
    },
  ], [updateMutation.isPending]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: '4px' }}>Warehouses</h1>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>Manage physical storage locations for the current branch.</p>
        </div>
        <button 
          onClick={handleCreate}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 16px',
            background: 'var(--brand-primary)',
            color: 'var(--bg-primary)',
            border: 'none',
            borderRadius: 'var(--border-radius-sm)',
            fontWeight: 600,
          }}
        >
          <Plus size={18} />
          Add Warehouse
        </button>
      </div>

      <DataTable 
        columns={columns} 
        data={warehouses || []} 
        isLoading={isLoading} 
        emptyMessage={error ? "Failed to load warehouses." : "No warehouses found for this branch. Create one to get started."} 
      />

      {isFormOpen && (
        <WarehouseForm 
          warehouse={editingWarehouse} 
          onClose={() => setIsFormOpen(false)} 
        />
      )}
    </div>
  );
}
