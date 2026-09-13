import { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { useConflicts, useResolveConflict, useDiscardConflict } from '../api';
import { DataTable } from '../../../components/DataTable';
import type { SyncConflict } from '../types';
import { AlertCircle, CheckCircle, Trash2, Code, X } from 'lucide-react';

export function SyncConflictsPage() {
  const { data: conflicts, isLoading, error } = useConflicts();
  const resolveMutation = useResolveConflict();
  const discardMutation = useDiscardConflict();
  const [selectedConflict, setSelectedConflict] = useState<SyncConflict | null>(null);

  const handleResolve = (id: string) => {
    if (window.confirm('Are you sure you want to mark this conflict as resolved?')) {
      resolveMutation.mutate({ id });
    }
  };

  const handleDiscard = (id: string) => {
    if (window.confirm('Are you sure you want to discard this conflict? This cannot be undone.')) {
      discardMutation.mutate(id);
    }
  };

  const columns = useMemo<ColumnDef<SyncConflict>[]>(() => [
    {
      accessorKey: 'created_at',
      header: 'DATE',
      cell: (info) => (
        <div style={{ color: 'var(--text-secondary)' }}>
          {format(new Date(info.getValue() as string), 'MMM dd, yyyy HH:mm')}
        </div>
      ),
    },
    {
      accessorKey: 'error_type',
      header: 'ERROR TYPE',
      cell: (info) => {
        const type = info.getValue() as string;
        let color = 'var(--text-secondary)';
        if (type === 'DOUBLE_SALE') color = '#ef4444';
        if (type === 'PHANTOM_STOCK') color = '#f59e0b';
        if (type === 'OVER_COLLECTION') color = '#3b82f6';
        
        return (
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center',
            padding: '2px 8px',
            borderRadius: '12px',
            background: `${color}20`,
            color,
            fontSize: '12px',
            fontWeight: 600
          }}>
            {type}
          </div>
        );
      },
    },
    {
      accessorKey: 'error_message',
      header: 'MESSAGE',
      cell: (info) => (
        <div style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {info.getValue() as string}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'ACTIONS',
      cell: (info) => {
        const conflict = info.row.original;
        return (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setSelectedConflict(conflict)}
              title="View Raw Data"
              style={{
                background: 'var(--surface-secondary)',
                border: 'none',
                padding: '6px',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              <Code size={16} />
            </button>
            <button
              onClick={() => handleResolve(conflict.id)}
              disabled={resolveMutation.isPending}
              title="Mark as Resolved"
              style={{
                background: '#10b98120',
                border: 'none',
                padding: '6px',
                borderRadius: '4px',
                color: '#10b981',
                cursor: 'pointer'
              }}
            >
              <CheckCircle size={16} />
            </button>
            <button
              onClick={() => handleDiscard(conflict.id)}
              disabled={discardMutation.isPending}
              title="Discard Permanently"
              style={{
                background: '#ef444420',
                border: 'none',
                padding: '6px',
                borderRadius: '4px',
                color: '#ef4444',
                cursor: 'pointer'
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        );
      }
    }
  ], [resolveMutation.isPending, discardMutation.isPending]);

  return (
    <div style={{ padding: 'var(--spacing-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-6)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <AlertCircle color="#ef4444" size={24} />
            <h1 style={{ fontSize: 'var(--font-size-2xl)', margin: 0 }}>Sync Conflicts</h1>
          </div>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
            Review and resolve offline synchronization errors from mobile devices.
          </p>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={conflicts || []} 
        isLoading={isLoading} 
        emptyMessage={error ? "Failed to load conflicts." : "No pending conflicts found! All synced up."} 
      />

      {/* JSON Viewer Modal */}
      {selectedConflict && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 'var(--spacing-4)'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '600px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}>
            <div style={{ padding: 'var(--spacing-5)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 'var(--font-size-xl)', margin: 0 }}>Raw Conflict Data</h2>
              <button 
                onClick={() => setSelectedConflict(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: 'var(--spacing-5)', overflowY: 'auto' }}>
              <pre style={{ 
                background: 'var(--surface-secondary)', 
                padding: '16px', 
                borderRadius: '8px',
                fontSize: '12px',
                overflowX: 'auto',
                color: 'var(--text-primary)'
              }}>
                {JSON.stringify(selectedConflict.raw_payload, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
