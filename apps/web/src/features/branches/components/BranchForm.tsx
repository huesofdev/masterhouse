import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { branchSchema } from '../types';
import type { BranchFormValues, Branch } from '../types';
import { useCreateBranch, useUpdateBranch } from '../api';
import { X, Plus, Trash2 } from 'lucide-react';

interface BranchFormProps {
  branch?: Branch | null;
  onClose: () => void;
}

export function BranchForm({ branch, onClose }: BranchFormProps) {
  const isEditing = !!branch;
  const createMutation = useCreateBranch();
  const updateMutation = useUpdateBranch();

  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema as any),
    defaultValues: {
      name: branch?.name || '',
      address: branch?.address || '',
      isActive: branch?.isActive ?? true,
      phones: branch?.phones?.map(p => ({ value: p.phone_number })) || [],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'phones'
  });

  useEffect(() => {
    if (branch) {
      reset({
        name: branch.name,
        address: branch.address || '',
        isActive: branch.isActive,
        phones: branch.phones?.map(p => ({ value: p.phone_number })) || [],
      });
    }
  }, [branch, reset]);

  const onSubmit = async (data: BranchFormValues) => {
    try {
      const payload = {
        ...data,
        phones: data.phones.map(p => p.value).filter(v => v.trim() !== '')
      };

      if (isEditing && branch) {
        await updateMutation.mutateAsync({ id: branch.id, data: payload as any });
      } else {
        await createMutation.mutateAsync(payload as any);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save branch', error);
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
          {isEditing ? 'Edit Branch' : 'Create Branch'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Branch Name *</label>
            <input 
              {...register('name')}
              placeholder="e.g. Main Headquarters"
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
            <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Address</label>
            <input 
              {...register('address')}
              placeholder="123 Industrial Ave"
              style={{
                width: '100%', padding: '10px 12px',
                background: 'var(--bg-tertiary)',
                border: `1px solid ${errors.address ? 'var(--status-error)' : 'var(--border-color)'}`,
                borderRadius: 'var(--border-radius-sm)',
                color: 'var(--text-primary)', outline: 'none',
              }}
            />
            {errors.address && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.address.message}</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Phone Numbers</label>
              <button 
                type="button"
                onClick={() => append({ value: '' })}
                style={{
                  background: 'transparent', border: 'none', color: 'var(--brand-primary)',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                <Plus size={14} /> Add Phone
              </button>
            </div>
            
            {fields.map((field, index) => (
              <div key={field.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <input
                    {...register(`phones.${index}.value`)}
                    placeholder="0771234567"
                    maxLength={10}
                    style={{
                      width: '100%', padding: '8px 12px',
                      background: 'var(--bg-tertiary)',
                      border: `1px solid ${errors.phones?.[index]?.value ? 'var(--status-error)' : 'var(--border-color)'}`,
                      borderRadius: 'var(--border-radius-sm)',
                      color: 'var(--text-primary)', outline: 'none',
                    }}
                  />
                  {errors.phones?.[index]?.value && <span style={{ color: 'var(--status-error)', fontSize: '11px', marginTop: '2px' }}>{errors.phones[index]?.value?.message}</span>}
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  style={{
                    background: 'transparent', border: 'none', color: 'var(--status-error)', cursor: 'pointer', padding: '8px'
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {fields.length === 0 && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No phone numbers added.</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <input 
              type="checkbox"
              id="isActive"
              {...register('isActive')}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="isActive" style={{ fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>Active Branch</label>
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
              {isSubmitting || createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Branch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
