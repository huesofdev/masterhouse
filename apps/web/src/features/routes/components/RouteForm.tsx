import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { routeSchema } from '../types';
import type { RouteFormValues, Route } from '../types';
import { useCreateRoute, useUpdateRoute } from '../api';
import { X, Plus, Trash2 } from 'lucide-react';

interface RouteFormProps {
  routeData?: Route | null;
  onClose: () => void;
}

export function RouteForm({ routeData, onClose }: RouteFormProps) {
  const isEditing = !!routeData;
  const createMutation = useCreateRoute();
  const updateMutation = useUpdateRoute();

  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<RouteFormValues>({
    resolver: zodResolver(routeSchema as any),
    defaultValues: {
      code: routeData?.code || '',
      name: routeData?.name || '',
      description: routeData?.description || '',
      is_active: routeData?.is_active ?? true,
      areas: routeData?.areas || [],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'areas'
  });

  useEffect(() => {
    if (routeData) {
      reset({
        code: routeData.code,
        name: routeData.name,
        description: routeData.description || '',
        is_active: routeData.is_active,
        areas: routeData.areas || [],
      });
    }
  }, [routeData, reset]);

  const onSubmit = async (data: RouteFormValues) => {
    try {
      if (isEditing && routeData) {
        await updateMutation.mutateAsync({ id: routeData.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save route', error);
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
          {isEditing ? 'Edit Route' : 'Create Route'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          
          <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Route Code *</label>
              <input 
                {...register('code')}
                placeholder="e.g. R-COLOMBO-01"
                style={{
                  width: '100%', padding: '10px 12px',
                  background: 'var(--bg-tertiary)',
                  border: `1px solid ${errors.code ? 'var(--status-error)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--border-radius-sm)',
                  color: 'var(--text-primary)', outline: 'none',
                }}
              />
              {errors.code && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.code.message}</span>}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 2 }}>
              <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Route Name *</label>
              <input 
                {...register('name')}
                placeholder="e.g. Colombo South Route"
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
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Description</label>
            <textarea 
              {...register('description')}
              placeholder="Areas covered..."
              rows={3}
              style={{
                width: '100%', padding: '10px 12px',
                background: 'var(--bg-tertiary)',
                border: `1px solid ${errors.description ? 'var(--status-error)' : 'var(--border-color)'}`,
                borderRadius: 'var(--border-radius-sm)',
                color: 'var(--text-primary)', outline: 'none',
                resize: 'none'
              }}
            />
            {errors.description && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.description.message}</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Route Areas</label>
              <button
                type="button"
                onClick={() => append({ name: '' })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--brand-primary)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                <Plus size={14} /> Add Area
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
              {fields.map((field, index) => (
                <div key={field.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    {...register(`areas.${index}.name` as const)}
                    placeholder="Area Name (e.g. Ward Place)"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: 'var(--bg-tertiary)',
                      border: `1px solid ${errors.areas?.[index]?.name ? 'var(--status-error)' : 'var(--border-color)'}`,
                      borderRadius: 'var(--border-radius-sm)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                    }}
                  >
                    <Trash2 size={16} style={{ color: 'var(--status-error)' }} />
                  </button>
                </div>
              ))}
            </div>
            {errors.areas && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.areas.message}</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <input 
              type="checkbox"
              id="is_active"
              {...register('is_active')}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="is_active" style={{ fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>Route is Active</label>
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
              {isSubmitting || createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Route'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
