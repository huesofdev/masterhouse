import { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useVehicles, useDeleteVehicle } from '../api';
import { VehicleForm } from '../components/VehicleForm';
import { DataTable } from '../../../components/DataTable';
import type { Vehicle } from '../types';
import { Plus, Edit2, Trash2, Truck } from 'lucide-react';
import { useBranchStore } from '../../../hooks/useBranchStore';
import { useTableUrlState } from '../../../hooks/useTableUrlState';

export function VehiclesPage() {
  const { pageIndex, pageSize, setPagination } = useTableUrlState({
    defaultValues: {},
    defaultPageSize: 20,
  });
  const { data: result, isLoading, error } = useVehicles(pageIndex + 1, pageSize, '');
  const vehicles = result?.data || [];
  const meta = result?.meta;
  
  const deleteMutation = useDeleteVehicle();
  const { activeBranchId } = useBranchStore();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const handleCreate = () => {
    setEditingVehicle(null);
    setIsFormOpen(true);
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setIsFormOpen(true);
  };

  const handleDelete = async (vehicleId: string) => {
    if (confirm('Are you sure you want to remove this vehicle?')) {
      await deleteMutation.mutateAsync(vehicleId);
    }
  };

  if (!activeBranchId) {
    return (
      <div style={{ padding: 'var(--spacing-6)', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Please select an active branch from the sidebar to manage its fleet.
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    if (status === 'ACTIVE') return { bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-success)' };
    if (status === 'IN_SERVICE') return { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--status-warning)' };
    return { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-error)' };
  };

  const columns = useMemo<ColumnDef<Vehicle>[]>(() => [
    {
      accessorKey: 'license_plate',
      header: 'LICENSE PLATE',
      cell: (info) => <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', letterSpacing: '0.05em' }}>{info.getValue() as string}</div>,
    },
    {
      id: 'type_model',
      header: 'TYPE & MODEL',
      cell: ({ row }) => (
        <>
          <div style={{ fontWeight: 600, fontSize: '14px' }}>{row.original.type.replace('_', ' ')}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
            <Truck size={12} /> {row.original.model}
          </div>
        </>
      ),
    },
    {
      accessorKey: 'status',
      header: 'STATUS',
      cell: (info) => {
        const status = info.getValue() as string;
        return (
          <span style={{ 
            padding: '4px 8px', borderRadius: 'var(--border-radius-sm)', fontSize: '12px', fontWeight: 600,
            ...getStatusColor(status)
          }}>
            {status.replace('_', ' ')}
          </span>
        );
      }
    },
    {
      id: 'actions',
      header: () => <div style={{ textAlign: 'right' }}>ACTIONS</div>,
      cell: ({ row }) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            onClick={() => handleEdit(row.original)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--brand-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => handleDelete(row.original.id)}
            disabled={deleteMutation.isPending}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--status-error)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ], [deleteMutation.isPending]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: '4px' }}>Fleet Vehicles</h1>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>Manage delivery and sales vehicles for the current branch.</p>
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
          Add Vehicle
        </button>
      </div>

      <DataTable 
        columns={columns} 
        data={vehicles} 
        isLoading={isLoading} 
        emptyMessage={error ? "Failed to load fleet." : "No vehicles found for this branch. Create one to get started."}
        serverPagination={meta ? {
          pageIndex,
          pageSize,
          pageCount: meta.total_pages,
          total: meta.total_records,
          setPagination
        } : undefined}
      />

      {isFormOpen && (
        <VehicleForm 
          vehicle={editingVehicle} 
          onClose={() => setIsFormOpen(false)} 
        />
      )}
    </div>
  );
}
