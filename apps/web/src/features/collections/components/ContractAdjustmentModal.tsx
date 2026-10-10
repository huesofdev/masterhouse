import { useState } from 'react';
import { X, ShieldAlert, Calendar, CheckCircle2 } from 'lucide-react';
import { useCreateAdjustment } from '../api';
import { useAuth } from '../../../hooks/useAuth';
import { formatDateGB } from '../../../lib/printReport';
import { roundMoney } from '../../../lib/money';

interface Props {
  contract: any;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ContractAdjustmentModal({ contract, onClose, onSuccess }: Props) {
  useAuth();
  const balance = roundMoney(Number(contract.balance || 0));
  const schedule = contract.schedule;

  // Scope: default to SCHEDULE if opened from an installment row, otherwise CONTRACT
  const [scope, setScope] = useState<'SCHEDULE' | 'CONTRACT'>(schedule ? 'SCHEDULE' : 'CONTRACT');

  // Schedule values
  const schedDue = schedule ? roundMoney(parseFloat(schedule.amount_due || '0')) : 0;
  const schedPaid = schedule ? roundMoney(parseFloat(schedule.amount_paid || '0')) : 0;
  const schedPending = roundMoney(Math.max(0, schedDue - schedPaid));
  const instLabel = schedule 
    ? (Number(schedule.installment_number) === 0 ? 'Downpayment Recovery' : `Installment #${schedule.installment_number}`) 
    : '';

  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<'DISCOUNT' | 'WRITE_OFF' | 'PENALTY' | 'REBATE'>('DISCOUNT');
  const [reason, setReason] = useState('');
  
  const createAdjustment = useCreateAdjustment();

  const numAmount = roundMoney(parseFloat(amount) || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || numAmount <= 0) return alert('Amount must be greater than 0');
    if (!reason.trim()) return alert('Reason is required');

    if (scope === 'SCHEDULE') {
      if (type !== 'PENALTY' && numAmount > schedPending + 0.0001) {
        return alert(`Schedule adjustment cannot exceed the pending installment amount of Rs. ${schedPending.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`);
      }
      if (numAmount > balance + 0.0001) {
        return alert('Adjustment cannot exceed total contract balance');
      }

      createAdjustment.mutate(
        {
          contract_id: contract.id,
          schedule_id: schedule.id,
          scope: 'SCHEDULE',
          type,
          amount: numAmount,
          reason
        },
        {
          onSuccess: () => {
            if (onSuccess) onSuccess();
            onClose();
          },
          onError: (err: any) => {
            alert(`Failed to apply schedule adjustment: ${err.response?.data?.message || err.message}`);
          }
        }
      );
    } else {
      // Contract-level adjustment
      if (type !== 'PENALTY' && numAmount > balance + 0.0001) {
        return alert('Adjustment cannot exceed the remaining contract balance');
      }

      createAdjustment.mutate(
        {
          contract_id: contract.id,
          scope: 'CONTRACT',
          type,
          amount: numAmount,
          reason
        },
        {
          onSuccess: () => {
            if (onSuccess) onSuccess();
            onClose();
          },
          onError: (err: any) => {
            alert(`Failed to apply contract adjustment: ${err.response?.data?.message || err.message}`);
          }
        }
      );
    }
  };

  const isFullContractPayoff = scope === 'CONTRACT' && (type === 'DISCOUNT' || type === 'WRITE_OFF') && Math.abs(numAmount - balance) <= 0.01 && balance > 0;
  const isFullScheduleWaive = scope === 'SCHEDULE' && (type === 'DISCOUNT' || type === 'WRITE_OFF') && numAmount >= schedPending - 0.0001 && schedPending > 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ background: 'var(--bg-primary)', padding: '24px', borderRadius: '14px', width: '100%', maxWidth: '460px', border: '1px solid var(--border-color)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
            <ShieldAlert size={20} color="var(--brand-primary)" /> Adjustment & Waiver
          </h2>
          <button onClick={onClose} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={16} /></button>
        </div>

        {/* Scope Selector (Only if opened with schedule context) */}
        {schedule && (
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px', marginBottom: '16px', gap: '4px' }}>
            <button
              type="button"
              onClick={() => {
                setScope('SCHEDULE');
                setType('DISCOUNT');
                setAmount('');
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: 'none',
                background: scope === 'SCHEDULE' ? 'var(--brand-primary)' : 'transparent',
                color: scope === 'SCHEDULE' ? 'white' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              This Installment ({instLabel})
            </button>
            <button
              type="button"
              onClick={() => {
                setScope('CONTRACT');
                setType('DISCOUNT');
                setAmount('');
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: 'none',
                background: scope === 'CONTRACT' ? 'var(--brand-primary)' : 'transparent',
                color: scope === 'CONTRACT' ? 'white' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Entire Contract Level
            </button>
          </div>
        )}

        {/* Target Information Card */}
        {scope === 'SCHEDULE' && schedule ? (
          <div style={{ marginBottom: '16px', padding: '14px', background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '10px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} color="#3b82f6" /> {instLabel}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Due: {formatDateGB(schedule.due_date)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Installment Due:</span>
              <span style={{ fontWeight: 600 }}>Rs. {schedDue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Amount Paid:</span>
              <span style={{ fontWeight: 500, color: '#10b981' }}>Rs. {schedPaid.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(59, 130, 246, 0.2)', paddingTop: '6px', marginTop: '6px' }}>
              <span style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>Pending Due:</span>
              <span style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>Rs. {schedPending.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Contract Total Balance:</span>
              <span style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>Rs. {balance.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Contract Status:</span>
              <span style={{ fontWeight: 600 }}>{contract.status}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Action Type */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
              {scope === 'SCHEDULE' ? 'Schedule Action Type' : 'Contract Adjustment Type'}
            </label>
            <select 
              value={type} 
              onChange={(e) => {
                const newType = e.target.value as any;
                setType(newType);
                if (scope === 'SCHEDULE' && newType === 'WRITE_OFF') {
                  setAmount(schedPending.toFixed(2));
                }
              }}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', fontSize: '13px' }}
            >
              {scope === 'SCHEDULE' ? (
                <>
                  <option value="DISCOUNT">Waive Late Penalty / Partial Relief (Discount)</option>
                  <option value="WRITE_OFF">Waive Entire Installment (100% Waive)</option>
                  <option value="PENALTY">Add Penalty to this Installment</option>
                </>
              ) : (
                <>
                  <option value="DISCOUNT">Discount (Downsize Future Months)</option>
                  <option value="WRITE_OFF">Write Off (Settlement / Payoff)</option>
                  <option value="REBATE">Rebate</option>
                  <option value="PENALTY">Penalty (Add to Balance)</option>
                </>
              )}
            </select>
          </div>

          {/* Amount Input */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Adjustment Amount (Rs.)
              </label>
              {scope === 'SCHEDULE' ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span 
                    style={{ fontSize: '11px', color: 'var(--brand-primary)', cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => {
                      setType('WRITE_OFF');
                      setAmount(schedPending.toFixed(2));
                    }}
                  >
                    Waive 100% (Rs. {schedPending.toFixed(2)})
                  </span>
                </div>
              ) : (
                type !== 'PENALTY' && (
                  <span 
                    style={{ fontSize: '11px', color: 'var(--brand-primary)', cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => setAmount(balance.toFixed(2))}
                  >
                    Full Balance: Rs. {balance.toFixed(2)}
                  </span>
                )
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                min="0.01"
                step="0.01"
                max={type !== 'PENALTY' ? (scope === 'SCHEDULE' ? schedPending.toFixed(2) : balance.toFixed(2)) : undefined}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', fontSize: '14px', fontWeight: 600, boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Live Impact Preview */}
          {numAmount > 0 && (
            <div style={{ marginBottom: '14px', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '12px' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Impact Preview:</div>
              {scope === 'SCHEDULE' && schedule ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>{instLabel} Due:</span>
                    <span>Rs. {schedDue.toFixed(2)} &rarr; <strong style={{ color: 'var(--brand-primary)' }}>Rs. {Math.max(schedPaid, type === 'PENALTY' ? schedDue + numAmount : schedDue - numAmount).toFixed(2)}</strong></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    <span>Total Contract Balance:</span>
                    <span>Rs. {balance.toFixed(2)} &rarr; <strong style={{ color: 'var(--brand-primary)' }}>Rs. {Math.max(0, type === 'PENALTY' ? balance + numAmount : balance - numAmount).toFixed(2)}</strong></span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px', fontWeight: 500 }}>
                    &bull; Future upcoming months will remain 100% untouched.
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Contract Balance:</span>
                  <span>Rs. {balance.toFixed(2)} &rarr; <strong style={{ color: 'var(--brand-primary)' }}>Rs. {Math.max(0, type === 'PENALTY' ? balance + numAmount : balance - numAmount).toFixed(2)}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* Reason / Remarks */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>Reason / Remarks (Mandatory)</label>
            <textarea 
              value={reason} 
              onChange={(e) => setReason(e.target.value)}
              required
              rows={2}
              placeholder={scope === 'SCHEDULE' ? 'e.g., Waived late penalty due to delayed bank transfer' : 'e.g., Early settlement discount approved by manager'}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Payoff Alert Banners */}
          {isFullContractPayoff && (
            <div style={{ display: 'flex', gap: '8px', padding: '10px 12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px', fontSize: '12px', marginBottom: '16px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>This will completely pay off the contract and mark all remaining pending schedules as <strong>WAIVED</strong>.</div>
            </div>
          )}

          {isFullScheduleWaive && (
            <div style={{ display: 'flex', gap: '8px', padding: '10px 12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px', fontSize: '12px', marginBottom: '16px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>This specific installment will be marked as <strong>WAIVED</strong>. Other future months will remain active at their original price.</div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={createAdjustment.isPending}
            style={{ width: '100%', padding: '12px', background: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: createAdjustment.isPending ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
          >
            {createAdjustment.isPending ? 'Processing Adjustment...' : (scope === 'SCHEDULE' ? 'Apply Schedule Adjustment' : 'Apply Contract Adjustment')}
          </button>
        </form>
      </div>
    </div>
  );
}
