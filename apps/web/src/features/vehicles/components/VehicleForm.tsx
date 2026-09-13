import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { vehicleSchema, vehicleTypeEnum, vehicleStatusEnum } from '../types';
import type { VehicleFormValues, Vehicle } from '../types';
import { useCreateVehicle, useUpdateVehicle } from '../api';
import { X } from 'lucide-react';

interface VehicleFormProps {
  vehicle?: Vehicle | null;
  onClose: () => void;
}

export function VehicleForm({ vehicle, onClose }: VehicleFormProps) {
  const isEditing = !!vehicle;
  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema as any),
    defaultValues: {
      type: vehicle?.type || 'LORRY',
      license_plate: vehicle?.license_plate || '',
      model: vehicle?.model || '',
      status: vehicle?.status || 'ACTIVE',
    }
  });

  useEffect(() => {
    if (vehicle) {
      reset({
        type: vehicle.type,
        license_plate: vehicle.license_plate,
        model: vehicle.model,
        status: vehicle.status,
      });
    }
  }, [vehicle, reset]);

  const onSubmit = async (data: VehicleFormValues) => {
    try {
      if (isEditing && vehicle) {
        await updateMutation.mutateAsync({ id: vehicle.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save vehicle', error);
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
          {isEditing ? 'Edit Vehicle' : 'Register Vehicle'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          
          <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>License Plate *</label>
              <input 
                {...register('license_plate')}
                placeholder="e.g. WP-ABC-1234"
                style={{
                  width: '100%', padding: '10px 12px',
                  background: 'var(--bg-tertiary)',
                  border: `1px solid ${errors.license_plate ? 'var(--status-error)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--border-radius-sm)',
                  color: 'var(--text-primary)', outline: 'none',
                }}
              />
              {errors.license_plate && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.license_plate.message}</span>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Type *</label>
              <select 
                {...register('type')}
                style={{
                  width: '100%', padding: '10px 12px',
                  background: 'var(--bg-tertiary)',
                  border: `1px solid ${errors.type ? 'var(--status-error)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--border-radius-sm)',
                  color: 'var(--text-primary)', outline: 'none',
                }}
              >
                {vehicleTypeEnum.options.map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
              </select>
              {errors.type && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.type.message}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Make & Model *</label>
            <input 
              {...register('model')}
              placeholder="e.g. Isuzu Elf"
              style={{
                width: '100%', padding: '10px 12px',
                background: 'var(--bg-tertiary)',
                border: `1px solid ${errors.model ? 'var(--status-error)' : 'var(--border-color)'}`,
                borderRadius: 'var(--border-radius-sm)',
                color: 'var(--text-primary)', outline: 'none',
              }}
            />
            {errors.model && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.model.message}</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Status *</label>
            <select 
              {...register('status')}
              style={{
                width: '100%', padding: '10px 12px',
                background: 'var(--bg-tertiary)',
                border: `1px solid ${errors.status ? 'var(--status-error)' : 'var(--border-color)'}`,
                borderRadius: 'var(--border-radius-sm)',
                color: 'var(--text-primary)', outline: 'none',
              }}
            >
              {vehicleStatusEnum.options.map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
            </select>
            {errors.status && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.status.message}</span>}
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
              {isSubmitting || createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
