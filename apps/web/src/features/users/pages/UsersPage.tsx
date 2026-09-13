import { useState, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useUsers } from '../api';
import { useRoles } from '../../rbac/api';
import { useBranches } from '../../branches/api';
import { UserForm } from '../components/UserForm';
import { DataTable } from '../../../components/DataTable';
import type { User } from '../types';
import { Plus, Edit2, Mail, Key, CheckCircle, Phone } from 'lucide-react';
import { useResetUserPassword } from '../api';
import { PermissionGuard } from '../../../components/PermissionGuard';
import { useTableUrlState } from '../../../hooks/useTableUrlState';

export function UsersPage() {
  const { search, pageIndex, pageSize, setPagination } = useTableUrlState({
    defaultValues: {
      search: '',
    },
    defaultPageSize: 20,
  });
  const { data: result, isLoading: usersLoading, error } = useUsers(pageIndex + 1, pageSize, search);
  const users = result?.data || [];
  const meta = result?.meta;

  const { data: roles } = useRoles();
  const { data: branches } = useBranches();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [tempPasswordModal, setTempPasswordModal] = useState<{isOpen: boolean, password: string | null}>({ isOpen: false, password: null });
  const resetPassword = useResetUserPassword();

  const handleCreate = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleResetPassword = async (userId: string) => {
    if (!window.confirm("Are you sure you want to reset this user's password?")) return;
    try {
      const result = await resetPassword.mutateAsync(userId);
      setTempPasswordModal({ isOpen: true, password: result.temporaryPassword });
    } catch (e) {
      alert("Failed to reset password.");
    }
  };


  const getRoleName = (roleId: string | null) => {
    if (!roleId) return 'No Role';
    return roles?.find(r => r.id === roleId)?.name || 'Unknown Role';
  };

  const getBranchNames = (branchIds: string[]) => {
    if (!branchIds.length) return 'None';
    return branchIds
      .map(id => branches?.find(b => b.id === id)?.name || 'Unknown')
      .join(', ');
  };

  const columns = useMemo<ColumnDef<User>[]>(() => [
    {
      id: 'user',
      header: 'USER',
      cell: ({ row }) => (
        <>
          <div style={{ fontWeight: 600, fontSize: '14px' }}>{row.original.name || 'Unnamed User'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <Mail size={12} /> {row.original.email}
            </div>
            {row.original.phone_number && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--brand-primary)' }}>
                <Phone size={12} /> {row.original.phone_number}
              </div>
            )}
          </div>
        </>
      ),
    },
    {
      accessorKey: 'role_id',
      header: 'ROLE',
      cell: (info) => (
        <span style={{ 
          padding: '4px 8px', borderRadius: 'var(--border-radius-sm)', fontSize: '12px',
          background: 'rgba(245, 158, 11, 0.1)', color: 'var(--brand-primary)', border: '1px solid rgba(245, 158, 11, 0.2)'
        }}>
          {getRoleName(info.getValue() as string)}
        </span>
      ),
    },
    {
      accessorKey: 'branch_ids',
      header: 'BRANCHES',
      cell: (info) => {
        const branchNames = getBranchNames(info.getValue() as string[]);
        return (
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={branchNames}>
            {branchNames}
          </div>
        );
      },
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
          <PermissionGuard permission="users:update" behavior="disable">
            <button 
              onClick={() => handleResetPassword(row.original.id)}
              disabled={resetPassword.isPending}
              title="Reset Password"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', opacity: resetPassword.isPending ? 0.5 : 1 }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--status-warning)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              <Key size={16} />
            </button>
          </PermissionGuard>
          <PermissionGuard permission="users:update" behavior="disable">
            <button 
              onClick={() => handleEdit(row.original)}
              title="Edit User"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--brand-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              <Edit2 size={16} />
            </button>
          </PermissionGuard>
        </div>
      ),
    },
  ], [roles, branches]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: '4px' }}>User Management</h1>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>Manage staff accounts, assign roles, and allocate branches.</p>
        </div>
        <PermissionGuard permission="users:create" behavior="disable">
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
            Add User
          </button>
        </PermissionGuard>
      </div>

      <DataTable 
        columns={columns} 
        data={users} 
        isLoading={usersLoading}
        emptyMessage={error ? "Failed to load users." : "No users found. Create one to get started."}
        serverPagination={meta ? {
          pageIndex,
          pageSize,
          pageCount: meta.total_pages,
          total: meta.total_records,
          setPagination
        } : undefined}
      />

      {isFormOpen && (
        <UserForm 
          user={editingUser} 
          onClose={() => setIsFormOpen(false)}
          onSuccess={(pw) => {
            if (pw) setTempPasswordModal({ isOpen: true, password: pw });
          }}
        />
      )}

      {tempPasswordModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--bg-primary)', padding: '32px', borderRadius: '16px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ width: '64px', height: '64px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle size={32} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Password Generated!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
              Please copy the temporary password below. The user must use this to log in and change their password.
            </p>
            <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', fontSize: '24px', fontWeight: 700, letterSpacing: '2px', color: 'var(--text-primary)', userSelect: 'all', marginBottom: '24px', border: '1px dashed var(--border-color)' }}>
              {tempPasswordModal.password}
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(tempPasswordModal.password || '');
                setTempPasswordModal({ isOpen: false, password: null });
              }}
              style={{ width: '100%', padding: '12px', background: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            >
              Copy & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
