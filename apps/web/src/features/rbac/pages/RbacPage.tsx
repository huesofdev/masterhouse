import { useState, useEffect, useMemo } from 'react';
import { useRoles, usePermissions, useSyncPermissions, useDeleteRole } from '../api';
import { RoleForm } from '../components/RoleForm';
import type { Role } from '../types';
import { Plus, Shield, Check, Trash2, Edit2 } from 'lucide-react';
import { PermissionGuard } from '../../../components/PermissionGuard';

export function RbacPage() {
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const { data: allPermissions, isLoading: permissionsLoading } = usePermissions();
  const syncMutation = useSyncPermissions();
  const deleteMutation = useDeleteRole();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  
  // Local state for checkboxes
  const [localPermissions, setLocalPermissions] = useState<Set<string>>(new Set());

  const selectedRole = roles?.find(r => r.id === selectedRoleId);

  // Sync local state when selected role changes
  useEffect(() => {
    if (selectedRole) {
      setLocalPermissions(new Set((selectedRole.permissions || []).map(p => p.permission_id)));
    } else {
      setLocalPermissions(new Set());
    }
  }, [selectedRole]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!selectedRole) return false;
    const original = new Set((selectedRole.permissions || []).map(p => p.permission_id));
    if (original.size !== localPermissions.size) return true;
    for (const perm of localPermissions) {
      if (!original.has(perm)) return true;
    }
    return false;
  }, [selectedRole, localPermissions]);

  const handleCreate = () => {
    setEditingRole(null);
    setIsFormOpen(true);
  };

  const handleEdit = (role: Role, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRole(role);
    setIsFormOpen(true);
  };

  const handleDelete = async (roleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this role?')) {
      await deleteMutation.mutateAsync(roleId);
      if (selectedRoleId === roleId) setSelectedRoleId(null);
    }
  };

  const togglePermission = (permissionId: string) => {
    if (!selectedRole) return;
    setLocalPermissions(prev => {
      const next = new Set(prev);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  };

  const handleSelectAll = (permsInModule: typeof allPermissions) => {
    if (!selectedRole || !permsInModule) return;
    setLocalPermissions(prev => {
      const next = new Set(prev);
      permsInModule.forEach(p => next.add(p.id));
      return next;
    });
  };

  const handleDeselectAll = (permsInModule: typeof allPermissions) => {
    if (!selectedRole || !permsInModule) return;
    setLocalPermissions(prev => {
      const next = new Set(prev);
      permsInModule.forEach(p => next.delete(p.id));
      return next;
    });
  };

  const handleSaveChanges = async () => {
    if (!selectedRole) return;
    await syncMutation.mutateAsync({ 
      roleId: selectedRole.id, 
      permissionIds: Array.from(localPermissions) 
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: '4px' }}>Roles & Permissions</h1>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>Manage access control via roles and fine-grained permissions.</p>
        </div>
        <PermissionGuard permission="roles:create" behavior="disable">
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
            Add Role
          </button>
        </PermissionGuard>
      </div>

      <div style={{ display: 'flex', gap: 'var(--spacing-4)', flex: 1, minHeight: '500px' }}>
        
        {/* LEFT: Roles List */}
        <div className="glass-panel" style={{ width: '300px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 'var(--spacing-3)', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
            <h3 style={{ fontSize: 'var(--font-size-base)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} color="var(--brand-primary)" />
              Roles
            </h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {rolesLoading ? (
              <div style={{ padding: 'var(--spacing-4)', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
            ) : roles?.map((role) => (
              <div 
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  background: selectedRoleId === role.id ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                  borderLeft: selectedRoleId === role.id ? '3px solid var(--brand-primary)' : '3px solid transparent',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
                onMouseEnter={(e) => {
                  if (selectedRoleId !== role.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                }}
                onMouseLeave={(e) => {
                  if (selectedRoleId !== role.id) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: selectedRoleId === role.id ? 'var(--brand-primary)' : 'var(--text-primary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {role.name}
                    <span style={{ 
                      fontSize: '10px', 
                      background: 'var(--bg-secondary)', 
                      color: 'var(--text-secondary)',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)'
                    }}>Rank {role.level}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {role.permissions.length} permissions
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <PermissionGuard permission="roles:update" behavior="disable">
                    <button onClick={(e) => handleEdit(role, e)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}><Edit2 size={14} /></button>
                  </PermissionGuard>
                  <PermissionGuard permission="roles:delete" behavior="disable">
                    <button onClick={(e) => handleDelete(role.id, e)} style={{ background: 'transparent', border: 'none', color: 'var(--status-error)' }}><Trash2 size={14} /></button>
                  </PermissionGuard>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Permissions for Selected Role */}
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 'var(--spacing-3)', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 'var(--font-size-base)', margin: 0 }}>
              {selectedRole ? `Permissions for ${selectedRole.name}` : 'Select a role to manage permissions'}
            </h3>
            {selectedRole && (
              <PermissionGuard permission="roles:update" behavior="disable">
                <button 
                  onClick={handleSaveChanges}
                  disabled={!hasUnsavedChanges || syncMutation.isPending}
                  style={{
                    background: hasUnsavedChanges ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                    color: hasUnsavedChanges ? '#000' : 'var(--text-muted)',
                    border: 'none',
                    padding: '6px 16px',
                    borderRadius: 'var(--border-radius-sm)',
                    fontWeight: 600,
                    cursor: hasUnsavedChanges ? 'pointer' : 'not-allowed',
                    opacity: syncMutation.isPending ? 0.7 : 1
                  }}
                >
                  {syncMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </PermissionGuard>
            )}
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-4)' }}>
            {!selectedRole ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 'var(--spacing-8)' }}>
                Please select a role from the sidebar to view and edit its permissions.
              </div>
            ) : permissionsLoading ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading permissions...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                {Object.entries(
                  (allPermissions || []).reduce((acc: Record<string, typeof allPermissions>, perm) => {
                    const [module] = perm.name.split(':');
                    if (!acc[module]) acc[module] = [];
                    acc[module].push(perm);
                    return acc;
                  }, {})
                ).map(([moduleName, perms]) => {
                  const allAssigned = perms?.every(p => localPermissions.has(p.id));
                  return (
                    <div key={moduleName} style={{ 
                      background: 'var(--bg-secondary)', 
                      borderRadius: 'var(--border-radius-md)', 
                      border: '1px solid var(--border-color)',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        padding: '12px 16px', 
                        background: 'rgba(0,0,0,0.2)', 
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <h4 style={{ textTransform: 'capitalize', margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>{moduleName} Module</h4>
                        <button 
                          onClick={() => allAssigned ? handleDeselectAll(perms) : handleSelectAll(perms)}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--border-color)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer'
                          }}
                        >
                          {allAssigned ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', padding: '16px' }}>
                        {perms?.map(perm => {
                          const hasPerm = localPermissions.has(perm.id);
                          const isPending = syncMutation.isPending;

                          return (
                            <div 
                              key={perm.id}
                              onClick={() => !isPending && togglePermission(perm.id)}
                              style={{
                                padding: '12px',
                                borderRadius: 'var(--border-radius-sm)',
                                border: `1px solid ${hasPerm ? 'var(--brand-primary)' : 'var(--border-color)'}`,
                                background: hasPerm ? 'var(--bg-gradient-1)' : 'var(--bg-tertiary)',
                                cursor: isPending ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                transition: 'all var(--transition-fast)',
                                opacity: isPending ? 0.6 : 1
                              }}
                            >
                              <div style={{ 
                                width: '20px', height: '20px', borderRadius: '4px',
                                border: `1px solid ${hasPerm ? 'var(--brand-primary)' : 'var(--text-muted)'}`,
                                background: hasPerm ? 'var(--brand-primary)' : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginTop: '2px'
                              }}>
                                {hasPerm && <Check size={14} color="var(--bg-primary)" strokeWidth={3} />}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{perm.name.split(':')[1]}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{perm.description || 'No description'}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {isFormOpen && (
        <RoleForm role={editingRole} onClose={() => setIsFormOpen(false)} />
      )}
    </div>
  );
}
