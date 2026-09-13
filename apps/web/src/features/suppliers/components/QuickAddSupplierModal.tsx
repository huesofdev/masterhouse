
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Save } from 'lucide-react';
import { supplierSchema, type SupplierFormValues } from '../types';
import { useCreateSupplier } from '../api';

interface QuickAddSupplierModalProps {
  onClose: () => void;
  onSuccess: (supplier: { id: string; name: string }) => void;
}

export function QuickAddSupplierModal({ onClose, onSuccess }: QuickAddSupplierModalProps) {
  const createMutation = useCreateSupplier();
  
  const { register, handleSubmit, formState: { errors } } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema as any),
    defaultValues: {
      name: '',
      phone: '',
      is_active: true,
    }
  });

  const onSubmit = async (data: SupplierFormValues) => {
    const newSupplier = await createMutation.mutateAsync(data);
    onSuccess(newSupplier.data);
  };

  const inputStyle = (hasError?: boolean) => ({
    width: '100%', padding: '10px 12px',
    background: 'var(--bg-tertiary)',
    border: `1px solid ${hasError ? 'var(--status-error)' : 'var(--border-color)'}`,
    borderRadius: 'var(--border-radius-sm)',
    color: 'var(--text-primary)', outline: 'none',
    fontSize: 'var(--font-size-sm)',
  });

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 110, padding: 'var(--spacing-4)'
    }}>
      <div className="glass-panel" style={{
        width: '100%', maxWidth: '400px', padding: 'var(--spacing-5)', position: 'relative'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 'var(--spacing-4)', right: 'var(--spacing-4)',
          background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer'
        }}>
          <X size={20} />
        </button>

        <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-4)' }}>Quick Add Supplier</h3>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Supplier Name *</label>
            <input {...register('name')} placeholder="e.g. Apple Inc." style={inputStyle(!!errors.name)} autoFocus />
            {errors.name && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.name.message}</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Phone Number</label>
            <input {...register('phone')} placeholder="e.g. +1 800 555 1234" style={inputStyle(!!errors.phone)} />
          </div>
          
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            You can add more details later from the main Suppliers page.
          </span>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{
              padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)',
              color: 'var(--text-primary)', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer'
            }}>Cancel</button>
            <button type="submit" disabled={createMutation.isPending} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 20px', background: 'var(--brand-primary)', color: 'var(--bg-primary)',
              border: 'none', borderRadius: 'var(--border-radius-sm)', fontWeight: 600, cursor: 'pointer'
            }}>
              <Save size={16} />
              {createMutation.isPending ? 'Saving...' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
