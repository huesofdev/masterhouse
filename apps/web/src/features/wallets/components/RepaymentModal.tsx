import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAddRepayment } from '../api';
import { useBranchStore } from '../../../hooks/useBranchStore';

interface RepaymentModalProps {
  userId: string;
  onClose: () => void;
}

export const RepaymentModal: React.FC<RepaymentModalProps> = ({ userId, onClose }) => {
  const branchId = useBranchStore(state => state.activeBranchId);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'REPAYMENT' | 'SALARY_DEDUCTION'>('REPAYMENT');
  const [description, setDescription] = useState('');

  const mutation = useAddRepayment();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !branchId) return;

    mutation.mutate(
      {
        userId,
        payload: {
          branchId,
          amount: parseFloat(amount),
          description,
          type
        }
      },
      {
        onSuccess: () => {
          onClose();
        }
      }
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: 'var(--bg-primary)', borderRadius: '16px', maxWidth: '400px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Add Settlement</h3>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '8px' }}>
              Settlement Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'REPAYMENT' | 'SALARY_DEDUCTION')}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              <option value="REPAYMENT">Direct Repayment (Cash/Bank)</option>
              <option value="SALARY_DEDUCTION">Salary Deduction</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '8px' }}>
              Amount (Rs.)
            </label>
            <input
              type="number"
              step="0.01"
              required
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              placeholder="0.00"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '8px' }}>
              Description
            </label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', minHeight: '80px', resize: 'vertical' }}
              placeholder="Reason for this settlement..."
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: '10px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: 'var(--border-radius-sm)', fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              style={{ flex: 2, padding: '10px 16px', background: 'var(--brand-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: 'var(--border-radius-sm)', fontWeight: 600, cursor: mutation.isPending ? 'not-allowed' : 'pointer', opacity: mutation.isPending ? 0.7 : 1 }}
            >
              {mutation.isPending ? 'Processing...' : 'Confirm Settlement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
