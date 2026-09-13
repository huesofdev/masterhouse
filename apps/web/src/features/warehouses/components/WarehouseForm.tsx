import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { warehouseSchema } from '../types';
import type { WarehouseFormValues, Warehouse } from '../types';
import { useCreateWarehouse, useUpdateWarehouse } from '../api';
import { X } from 'lucide-react';

interface WarehouseFormProps {
  warehouse?: Warehouse | null;
  onClose: () => void;
}

export function WarehouseForm({ warehouse, onClose }: WarehouseFormProps) {
  const isEditing = !!warehouse;
  const createMutation = useCreateWarehouse();
  const updateMutation = useUpdateWarehouse();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseSchema as any),
    defaultValues: {
      name: warehouse?.name || '',
      address: warehouse?.address || '',
      phone: warehouse?.phone || '',
      is_default: warehouse?.is_default ?? false,
      is_active: warehouse?.is_active ?? true,
    }
  });

  useEffect(() => {
    if (warehouse) {
      reset({
        name: warehouse.name,
        address: warehouse.address,
        phone: warehouse.phone || '',
        is_default: warehouse.is_default,
        is_active: warehouse.is_active,
      });
    }
  }, [warehouse, reset]);

  const onSubmit = async (data: WarehouseFormValues) => {
    try {
      if (isEditing && warehouse) {
        await updateMutation.mutateAsync({ id: warehouse.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save warehouse', error);
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
          {isEditing ? 'Edit Warehouse' : 'Create Warehouse'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Warehouse Name *</label>
            <input 
              {...register('name')}
              placeholder="e.g. Central Hub"
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
            <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Physical Address *</label>
            <input 
              {...register('address')}
              placeholder="456 Logistics Way"
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Phone Number (Optional)</label>
            <input 
              {...register('phone')}
              placeholder="0112345678"
              style={{
                width: '100%', padding: '10px 12px',
                background: 'var(--bg-tertiary)',
                border: `1px solid ${errors.phone ? 'var(--status-error)' : 'var(--border-color)'}`,
                borderRadius: 'var(--border-radius-sm)',
                color: 'var(--text-primary)', outline: 'none',
              }}
            />
            {errors.phone && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.phone.message}</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <input 
              type="checkbox"
              id="is_default"
              {...register('is_default')}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="is_default" style={{ fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>Set as Default Warehouse for this Branch</label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <input 
              type="checkbox"
              id="is_active"
              {...register('is_active')}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="is_active" style={{ fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>Active (Available for transactions)</label>
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
              {isSubmitting || createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Warehouse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
