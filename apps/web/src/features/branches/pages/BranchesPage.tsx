import { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useBranches } from '../api';
import { BranchForm } from '../components/BranchForm';
import { DataTable } from '../../../components/DataTable';
import type { Branch } from '../types';
import { Plus, Edit2 } from 'lucide-react';

export function BranchesPage() {
  const { data: branches, isLoading, error } = useBranches();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const handleCreate = () => {
    setEditingBranch(null);
    setIsFormOpen(true);
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setIsFormOpen(true);
  };

  const columns = useMemo<ColumnDef<Branch>[]>(() => [
    {
      accessorKey: 'name',
      header: 'NAME',
      cell: (info) => <div style={{ fontWeight: 500 }}>{info.getValue() as string}</div>,
    },
    {
      accessorKey: 'address',
      header: 'ADDRESS',
      cell: (info) => <div style={{ color: 'var(--text-secondary)' }}>{(info.getValue() as string) || '-'}</div>,
    },
    {
      id: 'phones',
      header: 'PHONES',
      cell: ({ row }) => {
        const phones = row.original.phones || [];
        if (phones.length === 0) return <div style={{ color: 'var(--text-muted)' }}>-</div>;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {phones.map(p => (
              <span key={p.id} style={{ 
                fontSize: '12px', 
                color: 'var(--text-secondary)',
                background: 'var(--bg-tertiary)',
                padding: '2px 6px',
                borderRadius: 'var(--border-radius-sm)',
                display: 'inline-block',
                width: 'fit-content'
              }}>
                {p.phone_number}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'STATUS',
      cell: (info) => {
        const isActive = info.getValue() as boolean;
        return (
          <span style={{ 
            padding: '4px 8px', 
            borderRadius: 'var(--border-radius-sm)', 
            fontSize: '12px', 
            fontWeight: 600,
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
        <div style={{ textAlign: 'right' }}>
          <button 
            onClick={() => handleEdit(row.original)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--brand-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <Edit2 size={18} />
          </button>
        </div>
      ),
    },
  ], []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: '4px' }}>Branches</h1>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>Manage your organization's branches and locations.</p>
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
          Add Branch
        </button>
      </div>

      <DataTable 
        columns={columns} 
        data={branches || []} 
        isLoading={isLoading} 
        emptyMessage={error ? "Failed to load branches." : "No branches found. Create one to get started."} 
      />

      {isFormOpen && (
        <BranchForm 
          branch={editingBranch} 
          onClose={() => setIsFormOpen(false)} 
        />
      )}
    </div>
  );
}
