import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Save } from 'lucide-react';
import { supplierSchema, type SupplierFormValues, type Supplier } from '../types';
import { useCreateSupplier, useUpdateSupplier } from '../api';

interface SupplierFormModalProps {
  supplier?: Supplier;
  onClose: () => void;
  onSuccess: () => void;
}

export function SupplierFormModal({ supplier, onClose, onSuccess }: SupplierFormModalProps) {
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();
  const isEditing = !!supplier;
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema as any),
    defaultValues: {
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      is_active: true,
    }
  });

  useEffect(() => {
    if (supplier) {
      reset({
        name: supplier.name,
        contact_person: supplier.contact_person || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        is_active: supplier.is_active,
      });
    }
  }, [supplier, reset]);

  const onSubmit = async (data: SupplierFormValues) => {
    if (isEditing) {
      await updateMutation.mutateAsync({ id: supplier!.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    onSuccess();
  };

  const inputStyle = (hasError?: boolean) => ({
    width: '100%', padding: '10px 12px',
    background: 'var(--bg-tertiary)',
    border: `1px solid ${hasError ? 'var(--status-error)' : 'var(--border-color)'}`,
    borderRadius: 'var(--border-radius-sm)',
    color: 'var(--text-primary)', outline: 'none',
    fontSize: 'var(--font-size-sm)',
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 110, padding: 'var(--spacing-4)'
    }}>
      <div className="glass-panel" style={{
        width: '100%', maxWidth: '500px', padding: 'var(--spacing-5)', position: 'relative'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 'var(--spacing-4)', right: 'var(--spacing-4)',
          background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer'
        }}>
          <X size={20} />
        </button>

        <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-4)' }}>
          {isEditing ? 'Edit Supplier' : 'Add Supplier'}
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Supplier Name *</label>
            <input {...register('name')} placeholder="e.g. Apple Inc." style={inputStyle(!!errors.name)} autoFocus />
            {errors.name && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.name.message}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Contact Person</label>
              <input {...register('contact_person')} placeholder="e.g. John Doe" style={inputStyle(!!errors.contact_person)} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Phone Number</label>
              <input {...register('phone')} placeholder="e.g. +1 800 555 1234" style={inputStyle(!!errors.phone)} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Email</label>
            <input {...register('email')} type="email" placeholder="e.g. info@supplier.com" style={inputStyle(!!errors.email)} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Address</label>
            <textarea {...register('address')} placeholder="Full address" style={{ ...inputStyle(!!errors.address), resize: 'vertical' }} rows={2} />
          </div>

          {!isEditing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(59, 130, 246, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand-primary)' }}>Opening Balance for Current Branch</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Rs</span>
                <input 
                  type="number" 
                  step="0.01" 
                  {...register('opening_balance', { valueAsNumber: true })} 
                  placeholder="0.00" 
                  style={inputStyle(!!errors.opening_balance)} 
                />
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>How much does this branch owe them before starting to use the system?</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{
              padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)',
              color: 'var(--text-primary)', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer'
            }}>Cancel</button>
            <button type="submit" disabled={isPending} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 20px', background: 'var(--brand-primary)', color: 'var(--bg-primary)',
              border: 'none', borderRadius: 'var(--border-radius-sm)', fontWeight: 600, cursor: 'pointer'
            }}>
              <Save size={16} />
              {isPending ? 'Saving...' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
