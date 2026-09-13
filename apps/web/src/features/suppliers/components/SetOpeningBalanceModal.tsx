import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Scale } from 'lucide-react';
import { setOpeningBalanceSchema, type SetOpeningBalanceValues } from '../types';
import { useSetOpeningBalance } from '../api';

interface Props {
  supplierId: string;
  onClose: () => void;
}

export function SetOpeningBalanceModal({ supplierId, onClose }: Props) {
  const mutation = useSetOpeningBalance();
  
  const { register, handleSubmit, formState: { errors } } = useForm<SetOpeningBalanceValues>({
    resolver: zodResolver(setOpeningBalanceSchema as any),
  });

  const onSubmit = async (data: SetOpeningBalanceValues) => {
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
          <Scale size={20} color="var(--brand-primary)" />
          Set Opening Balance
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Amount (Rs) *</label>
            <input type="number" step="0.01" placeholder="e.g. 5000" {...register('amount', { valueAsNumber: true })} autoFocus style={inputStyle(!!errors.amount)} />
            {errors.amount && <span style={{ color: 'var(--status-error)', fontSize: '11px' }}>{errors.amount.message}</span>}
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            This will add an <strong>Opening Balance</strong> entry to the ledger for this branch. If a balance already exists, this will increase the total balance owed.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{
              padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)',
              color: 'var(--text-primary)', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer'
            }}>Cancel</button>
            <button type="submit" disabled={mutation.isPending} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 20px', background: 'var(--brand-primary)', color: 'white',
              border: 'none', borderRadius: 'var(--border-radius-sm)', fontWeight: 600, cursor: 'pointer'
            }}>
              {mutation.isPending ? 'Processing...' : 'Set Balance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
