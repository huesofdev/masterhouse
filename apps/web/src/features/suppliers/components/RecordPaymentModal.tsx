import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Receipt } from 'lucide-react';
import { recordPaymentSchema, type RecordPaymentValues } from '../types';
import { useRecordPayment } from '../api';

interface Props {
  supplierId: string;
  balanceDue: number;
  onClose: () => void;
}

export function RecordPaymentModal({ supplierId, balanceDue, onClose }: Props) {
  const mutation = useRecordPayment();
  
  const { register, handleSubmit, formState: { errors } } = useForm<RecordPaymentValues>({
    resolver: zodResolver(recordPaymentSchema as any),
    defaultValues: { amount: balanceDue > 0 ? balanceDue : 0, notes: '' }
  });

  const onSubmit = async (data: RecordPaymentValues) => {
    await mutation.mutateAsync({ id: supplierId, data });
    onClose();
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

        <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Receipt size={20} color="var(--brand-primary)" />
          Record Payment
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Payment Amount (Rs) *</label>
            <input type="number" step="0.01" {...register('amount', { valueAsNumber: true })} autoFocus style={inputStyle(!!errors.amount)} />
            {errors.amount && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.amount.message}</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Notes / Reference</label>
            <textarea {...register('notes')} placeholder="e.g. Bank Transfer Ref #12345" style={{ ...inputStyle(!!errors.notes), resize: 'vertical' }} rows={3} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{
              padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)',
              color: 'var(--text-primary)', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer'
            }}>Cancel</button>
            <button type="submit" disabled={mutation.isPending} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 20px', background: 'var(--status-success)', color: 'white',
              border: 'none', borderRadius: 'var(--border-radius-sm)', fontWeight: 600, cursor: 'pointer'
            }}>
              {mutation.isPending ? 'Processing...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
