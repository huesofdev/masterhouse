import { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useBrands, useCreateBrand, useUpdateBrand, useDeleteBrand } from '../api';
import { BrandForm } from '../components/BrandForm';
import { DataTable } from '../../../components/DataTable';
import type { Brand, BrandFormValues } from '../types';
import { Plus, Edit2, Play, Pause, Trash2 } from 'lucide-react';
import { PermissionGuard } from '../../../components/PermissionGuard';

export function BrandsPage() {
  const { data: brands, isLoading, error } = useBrands();
  const createMutation = useCreateBrand();
  const updateMutation = useUpdateBrand();
  const deleteMutation = useDeleteBrand();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | undefined>();

  const handleCreate = () => {
    setEditingBrand(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setIsFormOpen(true);
  };

  const handleToggleActive = async (brand: Brand) => {
    await updateMutation.mutateAsync({ 
      id: brand.id, 
      data: { is_active: !brand.is_active } 
    });
  };

  const handleDelete = async (brand: Brand) => {
    if (window.confirm(`Are you sure you want to delete the Brand "${brand.name}"?`)) {
      try {
        await deleteMutation.mutateAsync(brand.id);
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to delete Brand');
      }
    }
  };

  const handleSubmit = async (data: BrandFormValues) => {
    if (editingBrand) {
      await updateMutation.mutateAsync({ id: editingBrand.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setIsFormOpen(false);
  };

  const columns = useMemo<ColumnDef<Brand>[]>(() => [
    {
      accessorKey: 'name',
      header: 'NAME',
      cell: (info) => <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'description',
      header: 'DESCRIPTION',
      cell: (info) => <span style={{ color: 'var(--text-secondary)' }}>{info.getValue() as string || '-'}</span>,
    },
    {
      accessorKey: 'status',
      header: 'STATUS',
      cell: ({ row }) => {
        const isActive = row.original.is_active;
        return (
          <span style={{ 
            padding: '4px 8px', borderRadius: 'var(--border-radius-sm)', fontSize: '12px',
            background: isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
            color: isActive ? 'var(--status-success)' : 'var(--status-error)', 
            border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
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
          <PermissionGuard permission="catalog:update" behavior="disable">
            <button 
              onClick={() => handleToggleActive(row.original)}
              disabled={updateMutation.isPending}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              title={row.original.is_active ? "Pause (Deactivate)" : "Play (Activate)"}
            >
              {row.original.is_active ? <Pause size={16} /> : <Play size={16} />}
            </button>
          </PermissionGuard>
          <PermissionGuard permission="catalog:update" behavior="disable">
            <button 
              onClick={() => handleEdit(row.original)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--brand-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              title="Edit"
            >
              <Edit2 size={16} />
            </button>
          </PermissionGuard>
          <PermissionGuard permission="catalog:delete" behavior="disable">
            <button 
              onClick={() => handleDelete(row.original)}
              disabled={deleteMutation.isPending}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--status-error)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </PermissionGuard>
        </div>
      ),
    },
  ], [updateMutation.isPending, deleteMutation.isPending]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: '4px' }}>Brands</h1>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>Manage product Brands across your catalog.</p>
        </div>
        <PermissionGuard permission="catalog:create" behavior="disable">
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
              cursor: 'pointer'
            }}
          >
            <Plus size={18} />
            Add Brand
          </button>
        </PermissionGuard>
      </div>

      <DataTable 
        columns={columns} 
        data={brands || []} 
        isLoading={isLoading}
        emptyMessage={error ? "Failed to load Brands." : "No Brands found. Create one to get started."}
      />

      {isFormOpen && (
        <BrandForm 
          brand={editingBrand}
          onSubmit={handleSubmit}
          onCancel={() => setIsFormOpen(false)}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}
