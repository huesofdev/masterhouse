import { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useProducts, useCategories, useCreateProduct, useUpdateProduct, useDeleteProduct } from '../api';
import { ProductForm } from '../components/ProductForm';
import { ImportProductsModal } from '../components/ImportProductsModal';
import { DataTable } from '../../../components/DataTable';
import type { Product, ProductFormValues } from '../types';
import { Plus, Edit2, Play, Pause, Upload, X, Trash2, Search } from 'lucide-react';
import { PermissionGuard } from '../../../components/PermissionGuard';
import { useTableUrlState } from '../../../hooks/useTableUrlState';

export function ProductsPage() {
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const {
    search,
    categoryFilter,
    typeFilter,
    statusFilter,
    pageIndex,
    pageSize,
    setFilters,
    setPagination,
  } = useTableUrlState({
    defaultValues: {
      search: '',
      categoryFilter: '',
      typeFilter: '',
      statusFilter: '',
    },
    defaultPageSize: 100,
  });

  const { data: categories } = useCategories();
  
  const filters = useMemo(() => ({
    categoryId: categoryFilter || undefined,
    type: typeFilter || undefined,
    status: statusFilter || undefined,
  }), [categoryFilter, typeFilter, statusFilter]);

  const { data: result, isLoading, error } = useProducts(pageIndex + 1, pageSize, search, filters);
  const products = result?.data || [];
  const meta = result?.meta;

  const handleCreate = () => {
    setEditingProduct(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleToggleActive = async (product: Product) => {
    await updateMutation.mutateAsync({ 
      id: product.id, 
      data: { is_active: !product.is_active } 
    });
  };

  const handleDelete = async (product: Product) => {
    if (window.confirm(`Are you sure you want to delete the product "${product.name}"?`)) {
      try {
        await deleteMutation.mutateAsync(product.id);
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to delete product');
      }
    }
  };

  const handleSubmit = async (data: ProductFormValues) => {
    if (editingProduct) {
      await updateMutation.mutateAsync({ id: editingProduct.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    setIsFormOpen(false);
  };

  const columns = useMemo<ColumnDef<Product>[]>(() => [
    {
      accessorKey: 'image_signed_url',
      header: 'IMAGE',
      cell: (info) => {
        const url = info.getValue() as string;
        return url ? (
          <img 
            src={url} 
            alt="Product" 
            onClick={() => setPreviewImageUrl(url)}
            style={{ 
              width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)',
              cursor: 'pointer', transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s' 
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}
          />
        ) : (
          <div style={{ width: '48px', height: '48px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>No Img</div>
        );
      },
    },
    {
      accessorKey: 'sku',
      header: 'SKU',
      cell: (info) => <span style={{ fontWeight: 600, color: 'var(--brand-primary)', fontSize: '12px' }}>{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'name',
      header: 'PRODUCT NAME',
      cell: (info) => <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'category',
      header: 'CATEGORY',
      cell: ({ row }) => (
        <span style={{ 
          background: 'rgba(59,130,246,0.08)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px',
          color: 'var(--brand-primary)'
        }}>
          {row.original.category?.name || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'base_price',
      header: 'RETAIL PRICE',
      cell: (info) => (
        <span style={{ fontWeight: 600 }}>
          {Number(info.getValue()).toLocaleString('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 })}
        </span>
      ),
    },
    {
      accessorKey: 'is_serialized',
      header: 'TRACKING',
      cell: (info) => (
        <span style={{ 
          background: info.getValue() ? 'rgba(59, 130, 246, 0.1)' : 'rgba(107, 114, 128, 0.1)',
          color: info.getValue() ? 'var(--brand-primary)' : 'var(--text-secondary)',
          padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500,
          textTransform: 'uppercase'
        }}>
          {info.getValue() ? 'SERIAL' : 'BULK'}
        </span>
      ),
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
          <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: '4px' }}>Products Catalog</h1>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>Manage the global master list of products.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <PermissionGuard permission="catalog:create" behavior="disable">
            <button 
              onClick={() => setIsImportModalOpen(true)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 16px', background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)', border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-sm)', fontWeight: 600, cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--text-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <Upload size={18} />
              Bulk Import
            </button>
          </PermissionGuard>
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
              Add Product
            </button>
          </PermissionGuard>
        </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 250px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-secondary)' }} size={18} />
            <input 
              type="text" 
              placeholder="Search by name or SKU..." 
              value={search}
              onChange={e => setFilters({ search: e.target.value })}
              className="input-field"
              style={{ width: '100%', paddingLeft: '38px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <select className="input-field" value={categoryFilter} onChange={e => setFilters({ categoryFilter: e.target.value })} style={{ width: '160px' }}>
              <option value="">All Categories</option>
              {categories?.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            
            <select className="input-field" value={typeFilter} onChange={e => setFilters({ typeFilter: e.target.value })} style={{ width: '150px' }}>
              <option value="">All Types</option>
              <option value="BULK">Bulk Items</option>
              <option value="SERIAL">Serialized Items</option>
            </select>
            
            <select className="input-field" value={statusFilter} onChange={e => setFilters({ statusFilter: e.target.value })} style={{ width: '130px' }}>
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
  
      <DataTable 
        columns={columns} 
        data={products} 
        isLoading={isLoading}
        emptyMessage={error ? "Failed to load products." : "No products found in the catalog. Create one to get started."}
        serverPagination={meta ? {
          pageIndex,
          pageSize,
          pageCount: meta.total_pages,
          total: meta.total_records,
          setPagination
        } : undefined}
      />

      {isFormOpen && (
        <ProductForm 
          product={editingProduct}
          onSubmit={handleSubmit}
          onCancel={() => setIsFormOpen(false)}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {isImportModalOpen && (
        <ImportProductsModal 
          onClose={() => setIsImportModalOpen(false)} 
          onSuccess={() => window.location.reload()} 
        />
      )}

      {previewImageUrl && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 130, padding: '24px' }} onClick={() => setPreviewImageUrl(null)}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '600px', display: 'flex', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewImageUrl(null)} style={{ position: 'absolute', top: '-48px', right: 0, background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px' }}>
              <X size={32} />
            </button>
            <img 
              src={previewImageUrl} 
              alt="Preview" 
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 12px 48px rgba(0,0,0,0.5)' }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
