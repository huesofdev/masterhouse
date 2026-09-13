import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userFormSchema } from '../types';
import type { UserFormValues, User } from '../types';
import { useCreateUser, useUpdateUser } from '../api';
import { useBranches } from '../../branches/api';
import { useRoles } from '../../rbac/api';
import { X } from 'lucide-react';

interface UserFormProps {
  user?: User | null;
  onClose: () => void;
  onSuccess?: (password?: string) => void;
}

export function UserForm({ user, onClose, onSuccess }: UserFormProps) {
  const isEditing = !!user;
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const { data: branches, isLoading: branchesLoading } = useBranches();
  const { data: roles } = useRoles();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema as any),
    defaultValues: {
      email: user?.email || '',
      name: user?.name || '',
      phone_number: user?.phone_number || '',
      role_id: user?.role_id || '',
      branch_ids: user?.branch_ids || [],
      is_active: user?.is_active ?? true,
      max_discount_percentage: user?.max_discount_percentage ? Number(user.max_discount_percentage) : undefined,
    }
  });

  useEffect(() => {
    if (user) {
      reset({
        email: user.email,
        name: user.name || '',
        phone_number: user.phone_number || '',
        role_id: user.role_id || '',
        branch_ids: user.branch_ids || [],
        is_active: user.is_active,
        max_discount_percentage: user.max_discount_percentage ? Number(user.max_discount_percentage) : undefined,
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: UserFormValues) => {
    try {
      if (isEditing && user) {
        await updateMutation.mutateAsync({ id: user.id, data });
        if (onSuccess) onSuccess();
      } else {
        const result = await createMutation.mutateAsync(data);
        if (onSuccess) onSuccess(result.temporaryPassword);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save user', error);
    }
  };

  return (
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
        maxWidth: '500px',
        padding: 'var(--spacing-5)',
        position: 'relative',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 'var(--spacing-4)',
            right: 'var(--spacing-4)',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>
        
        <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--spacing-4)' }}>
          {isEditing ? 'Edit User' : 'Create User'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Email Address *</label>
            <input 
              {...register('email')}
              placeholder="user@example.com"
              style={{
                width: '100%', padding: '10px 12px',
                background: 'var(--bg-tertiary)',
                border: `1px solid ${errors.email ? 'var(--status-error)' : 'var(--border-color)'}`,
                borderRadius: 'var(--border-radius-sm)',
                color: 'var(--text-primary)', outline: 'none',
              }}
            />
            {errors.email && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.email.message}</span>}
            {!isEditing && <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>A default password will be assigned.</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Full Name</label>
            <input 
              {...register('name')}
              placeholder="John Doe"
              style={{
                width: '100%', padding: '10px 12px',
                background: 'var(--bg-tertiary)',
                border: `1px solid ${errors.name ? 'var(--status-error)' : 'var(--border-color)'}`,
                borderRadius: 'var(--border-radius-sm)',
                color: 'var(--text-primary)', outline: 'none',
              }}
            />
            {errors.name && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.name.message}</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Phone / Mobile Number</label>
            <input 
              {...register('phone_number')}
              placeholder="e.g. 0771234567"
              style={{
                width: '100%', padding: '10px 12px',
                background: 'var(--bg-tertiary)',
                border: `1px solid ${errors.phone_number ? 'var(--status-error)' : 'var(--border-color)'}`,
                borderRadius: 'var(--border-radius-sm)',
                color: 'var(--text-primary)', outline: 'none',
              }}
            />
            {errors.phone_number && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.phone_number.message}</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Role</label>
            <select 
              {...register('role_id')}
              style={{
                width: '100%', padding: '10px 12px',
                background: 'var(--bg-tertiary)',
                border: `1px solid ${errors.role_id ? 'var(--status-error)' : 'var(--border-color)'}`,
                borderRadius: 'var(--border-radius-sm)',
                color: 'var(--text-primary)', outline: 'none',
              }}
            >
              <option value="">-- No Role Assigned --</option>
              {roles?.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            {errors.role_id && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.role_id.message}</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
            <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Branch Assignments *</label>
            {errors.branch_ids && <span style={{ color: 'var(--status-error)', fontSize: '11px', marginBottom: '4px' }}>{errors.branch_ids.message}</span>}
            
            <div style={{ 
              display: 'flex', flexDirection: 'column', gap: '8px',
              background: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--border-radius-sm)',
              maxHeight: '150px', overflowY: 'auto', border: `1px solid ${errors.branch_ids ? 'var(--status-error)' : 'var(--border-color)'}`
            }}>
              {branchesLoading ? (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading branches...</span>
              ) : branches?.map(branch => (
                <label key={branch.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input 
                    type="checkbox"
                    value={branch.id}
                    {...register('branch_ids')}
                  />
                  {branch.name} {!branch.isActive && '(Inactive)'}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Max Discount Allowed (%)</label>
            <input 
              type="number"
              step="0.01"
              {...register('max_discount_percentage')}
              placeholder="e.g. 10.00"
              style={{
                width: '100%', padding: '10px 12px',
                background: 'var(--bg-tertiary)',
                border: `1px solid ${errors.max_discount_percentage ? 'var(--status-error)' : 'var(--border-color)'}`,
                borderRadius: 'var(--border-radius-sm)',
                color: 'var(--text-primary)', outline: 'none',
              }}
            />
            {errors.max_discount_percentage && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.max_discount_percentage.message}</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <input 
              type="checkbox"
              id="is_active"
              {...register('is_active')}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="is_active" style={{ fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>Active User Account</label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-4)' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--border-radius-sm)',
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
              style={{
                padding: '8px 16px',
                background: 'var(--brand-primary)',
                color: 'var(--bg-primary)',
                border: 'none',
                borderRadius: 'var(--border-radius-sm)',
                fontWeight: 600,
              }}
            >
              {isSubmitting || createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
