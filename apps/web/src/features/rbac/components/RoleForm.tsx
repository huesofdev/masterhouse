import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { roleSchema } from '../types';
import type { RoleFormValues, Role } from '../types';
import { useCreateRole, useUpdateRole } from '../api';
import { X } from 'lucide-react';

interface RoleFormProps {
  role?: Role | null;
  onClose: () => void;
}

export function RoleForm({ role, onClose }: RoleFormProps) {
  const isEditing = !!role;
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema as any),
    defaultValues: {
      name: role?.name || '',
      description: role?.description || '',
      level: role?.level ?? 10,
    }
  });

  useEffect(() => {
    if (role) {
      reset({
        name: role.name,
        description: role.description || '',
        level: role.level ?? 10,
      });
    }
  }, [role, reset]);

  const onSubmit = async (data: RoleFormValues) => {
    try {
      if (isEditing && role) {
        await updateMutation.mutateAsync({ id: role.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save role', error);
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
        maxWidth: '400px',
        padding: 'var(--spacing-5)',
        position: 'relative'
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
          {isEditing ? 'Edit Role' : 'Create Role'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Role Name *</label>
            <input 
              {...register('name')}
              placeholder="e.g. Sales Manager"
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
            <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Description</label>
            <input 
              {...register('description')}
              placeholder="Can manage sales team..."
              style={{
                width: '100%', padding: '10px 12px',
                background: 'var(--bg-tertiary)',
                border: `1px solid ${errors.description ? 'var(--status-error)' : 'var(--border-color)'}`,
                borderRadius: 'var(--border-radius-sm)',
                color: 'var(--text-primary)', outline: 'none',
              }}
            />
            {errors.description && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.description.message}</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Rank Level (0-100)</label>
            <input 
              type="number"
              {...register('level')}
              style={{
                width: '100%', padding: '10px 12px',
                background: 'var(--bg-tertiary)',
                border: `1px solid ${errors.level ? 'var(--status-error)' : 'var(--border-color)'}`,
                borderRadius: 'var(--border-radius-sm)',
                color: 'var(--text-primary)', outline: 'none',
              }}
            />
            {errors.level && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.level.message}</span>}
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
              {isSubmitting || createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
