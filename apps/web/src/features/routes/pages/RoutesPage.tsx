import { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useRoutes, useDeleteRoute } from '../api';
import { RouteForm } from '../components/RouteForm';
import { DataTable } from '../../../components/DataTable';
import type { Route } from '../types';
import { Plus, Edit2, Trash2, Map } from 'lucide-react';
import { useBranchStore } from '../../../hooks/useBranchStore';

export function RoutesPage() {
  const { data: routes, isLoading, error } = useRoutes();
  const deleteMutation = useDeleteRoute();
  const { activeBranchId } = useBranchStore();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);

  const handleCreate = () => {
    setEditingRoute(null);
    setIsFormOpen(true);
  };

  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    setIsFormOpen(true);
  };

  const handleDelete = async (routeId: string) => {
    if (confirm('Are you sure you want to delete this route?')) {
      await deleteMutation.mutateAsync(routeId);
    }
  };

  if (!activeBranchId) {
    return (
      <div style={{ padding: 'var(--spacing-6)', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Please select an active branch from the sidebar to manage its delivery routes.
      </div>
    );
  }

  const columns = useMemo<ColumnDef<Route>[]>(() => [
    {
      accessorKey: 'code',
      header: 'CODE',
      cell: (info) => <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', letterSpacing: '0.05em' }}>{info.getValue() as string}</div>,
    },
    {
      id: 'name_desc',
      header: 'NAME & DESCRIPTION',
      cell: ({ row }) => (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '15px' }}>
            <Map size={14} color="var(--brand-primary)" /> {row.original.name}
          </div>
          {row.original.description && (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {row.original.description}
            </div>
          )}
        </>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'STATUS',
      cell: (info) => {
        const isActive = info.getValue() as boolean;
        return (
          <span style={{ 
            padding: '4px 8px', borderRadius: 'var(--border-radius-sm)', fontSize: '12px', fontWeight: 600,
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
          <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: '4px' }}>Delivery Routes</h1>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>Manage geographical paths and territories for sales and distribution.</p>
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
          Add Route
        </button>
      </div>

      <DataTable 
        columns={columns} 
        data={routes || []} 
        isLoading={isLoading} 
        emptyMessage={error ? "Failed to load routes." : "No routes found for this branch. Create one to get started."} 
      />

      {isFormOpen && (
        <RouteForm 
          routeData={editingRoute} 
          onClose={() => setIsFormOpen(false)} 
        />
      )}
    </div>
  );
}
