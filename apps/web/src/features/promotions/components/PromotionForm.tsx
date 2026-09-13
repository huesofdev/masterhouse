import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { promotionFormSchema } from '../types';
import type { PromotionFormValues, Promotion } from '../types';
import { useCreatePromotion, useUpdatePromotion } from '../api';
import { X } from 'lucide-react';

interface PromotionFormProps {
  promotion?: Promotion | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PromotionForm({ promotion, onClose, onSuccess }: PromotionFormProps) {
  const isEditing = !!promotion;
  const createMutation = useCreatePromotion();
  const updateMutation = useUpdatePromotion();

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionFormSchema as any),
    defaultValues: {
      name: promotion?.name || '',
      description: promotion?.description || '',
      start_date: promotion?.start_date ? new Date(promotion.start_date).toISOString().slice(0, 16) : '',
      end_date: promotion?.end_date ? new Date(promotion.end_date).toISOString().slice(0, 16) : '',
      discount_type: promotion?.discount_type || 'PERCENTAGE',
      discount_value: promotion?.discount_value ? Number(promotion.discount_value) : 0,
      is_active: promotion?.is_active ?? true,
    }
  });

  const discountType = watch('discount_type');

  useEffect(() => {
    if (promotion) {
      reset({
        name: promotion.name,
        description: promotion.description || '',
        start_date: new Date(promotion.start_date).toISOString().slice(0, 16),
        end_date: new Date(promotion.end_date).toISOString().slice(0, 16),
        discount_type: promotion.discount_type,
        discount_value: Number(promotion.discount_value),
        is_active: promotion.is_active,
      });
    }
  }, [promotion, reset]);

  const onSubmit = async (data: PromotionFormValues) => {
    try {
      if (isEditing && promotion) {
        await updateMutation.mutateAsync({ id: promotion.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save promotion', error);
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
          {isEditing ? 'Edit Promotion' : 'Create Promotion'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Promotion Name *</label>
            <input 
              {...register('name')}
              placeholder="e.g. Summer Sale 2026"
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
              placeholder="Optional description"
              style={{
                width: '100%', padding: '10px 12px',
                background: 'var(--bg-tertiary)',
                border: `1px solid ${errors.description ? 'var(--status-error)' : 'var(--border-color)'}`,
                borderRadius: 'var(--border-radius-sm)',
                color: 'var(--text-primary)', outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Start Date *</label>
              <input 
                type="datetime-local"
                {...register('start_date')}
                style={{
                  width: '100%', padding: '10px 12px',
                  background: 'var(--bg-tertiary)',
                  border: `1px solid ${errors.start_date ? 'var(--status-error)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--border-radius-sm)',
                  color: 'var(--text-primary)', outline: 'none',
                }}
              />
              {errors.start_date && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.start_date.message}</span>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>End Date *</label>
              <input 
                type="datetime-local"
                {...register('end_date')}
                style={{
                  width: '100%', padding: '10px 12px',
                  background: 'var(--bg-tertiary)',
                  border: `1px solid ${errors.end_date ? 'var(--status-error)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--border-radius-sm)',
                  color: 'var(--text-primary)', outline: 'none',
                }}
              />
              {errors.end_date && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.end_date.message}</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Discount Type *</label>
              <select 
                {...register('discount_type')}
                style={{
                  width: '100%', padding: '10px 12px',
                  background: 'var(--bg-tertiary)',
                  border: `1px solid ${errors.discount_type ? 'var(--status-error)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--border-radius-sm)',
                  color: 'var(--text-primary)', outline: 'none',
                }}
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount (Rs)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Discount Value *</label>
              <input 
                type="number"
                step="0.01"
                {...register('discount_value')}
                placeholder={discountType === 'PERCENTAGE' ? "e.g. 15" : "e.g. 500"}
                style={{
                  width: '100%', padding: '10px 12px',
                  background: 'var(--bg-tertiary)',
                  border: `1px solid ${errors.discount_value ? 'var(--status-error)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--border-radius-sm)',
                  color: 'var(--text-primary)', outline: 'none',
                }}
              />
              {errors.discount_value && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.discount_value.message}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <input 
              type="checkbox"
              id="is_active"
              {...register('is_active')}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="is_active" style={{ fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>Active</label>
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
              {isSubmitting || createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Promotion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
