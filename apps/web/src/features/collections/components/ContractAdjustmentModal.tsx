import { useState } from 'react';
import { X, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useCreateAdjustment } from '../api';
import { useAuth } from '../../../hooks/useAuth';

interface Props {
  contract: any;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ContractAdjustmentModal({ contract, onClose, onSuccess }: Props) {
  useAuth();
  const balance = Number(contract.balance);
  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<'DISCOUNT' | 'WRITE_OFF' | 'PENALTY' | 'REBATE'>('DISCOUNT');
  const [reason, setReason] = useState('');
  
  const createAdjustment = useCreateAdjustment();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return alert('Amount must be greater than 0');
    if (!reason.trim()) return alert('Reason is required');

    // For discount/write-off/rebate, amount cannot exceed balance
    if (type !== 'PENALTY' && Number(amount) > balance) {
      return alert('Adjustment cannot exceed the remaining balance');
    }

    createAdjustment.mutate(
      {
        contract_id: contract.id,
        type,
        amount: Number(amount),
        reason
      },
      {
        onSuccess: () => {
          if (onSuccess) onSuccess();
          onClose();
        },
        onError: (err: any) => {
          alert(`Failed to apply adjustment: ${err.response?.data?.message || err.message}`);
        }
      }
    );
  };

  const isFullPayoff = (type === 'DISCOUNT' || type === 'WRITE_OFF') && Number(amount) === balance && balance > 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--bg-primary)', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px', border: '1px solid var(--border-color)', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={20} color="var(--brand-primary)" /> Contract Adjustment
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
        </div>

        <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Current Balance:</span>
            <span style={{ fontWeight: 600 }}>Rs. {balance.toLocaleString('en-GB')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
            <span style={{ fontWeight: 600 }}>{contract.status}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Adjustment Type</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value as any)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}
            >
              <option value="DISCOUNT">Discount</option>
              <option value="WRITE_OFF">Write Off</option>
              <option value="REBATE">Rebate</option>
              <option value="PENALTY">Penalty (Add to Balance)</option>
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
              Amount
              {type !== 'PENALTY' && <span style={{ float: 'right', color: 'var(--brand-primary)', cursor: 'pointer' }} onClick={() => setAmount(balance.toString())}>Max: {balance}</span>}
            </label>
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              min="0.01"
              step="0.01"
              max={type !== 'PENALTY' ? balance : undefined}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>Reason / Remarks</label>
            <textarea 
              value={reason} 
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              placeholder="Mandatory reason for this adjustment..."
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }}
            />
          </div>

          {isFullPayoff && (
            <div style={{ display: 'flex', gap: '8px', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <div>This will completely pay off the contract and automatically WAIVE all remaining pending schedules.</div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={createAdjustment.isPending}
            style={{ width: '100%', padding: '12px', background: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: createAdjustment.isPending ? 'not-allowed' : 'pointer' }}
          >
            {createAdjustment.isPending ? 'Processing...' : 'Apply Adjustment'}
          </button>
        </form>
      </div>
    </div>
  );
}
