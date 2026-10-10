import { useState } from 'react';
import { X, MessageSquare, Send, CheckCircle2, AlertCircle, Sparkles, User, Wallet, Phone } from 'lucide-react';
import { apiClient } from '../../../lib/axios';

interface Props {
  customer: {
    id: string;
    full_name: string;
    mobile: string;
  };
  pendingBalance?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SendCustomSmsModal({ customer, pendingBalance = 0, onClose, onSuccess }: Props) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sentSuccess, setSentSuccess] = useState(false);

  const formattedBal = Number(pendingBalance).toLocaleString('en-GB', { minimumFractionDigits: 2 });
  const firstName = customer.full_name.split(' ')[0] || customer.full_name;

  // Preset Template Messages
  const templates = [
    {
      id: 'due_reminder',
      label: '💳 Payment Reminder',
      text: `Dear ${firstName}, this is a friendly reminder that your installment balance of Rs. ${formattedBal} is pending. Please arrange payment soon. Thank you - Master House.`
    },
    {
      id: 'overdue_notice',
      label: '⚠️ Overdue Notice',
      text: `Urgent: Dear ${firstName}, your account has overdue dues of Rs. ${formattedBal}. Please contact your collection officer or visit branch immediately - Master House.`
    },
    {
      id: 'call_request',
      label: '📞 Call Office Request',
      text: `Dear ${firstName}, please contact the Master House office at your earliest convenience regarding your installment account. Thank you.`
    },
    {
      id: 'general_greeting',
      label: '🎁 Customer Service',
      text: `Dear ${firstName}, thank you for choosing Master House. For any account inquiries or assistance, please contact our branch office.`
    }
  ];

  // SMS length calculation (Standard GSM 7-bit: 160 chars for 1st SMS, then 153 chars per segment)
  const charCount = message.length;
  const smsCount = charCount === 0 ? 0 : charCount <= 160 ? 1 : Math.ceil(charCount / 153);

  const handleApplyTemplate = (tmplText: string) => {
    setMessage(tmplText);
    setErrorMsg(null);
  };

  const handleInsertVariable = (val: string) => {
    setMessage(prev => prev + val);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setErrorMsg('Please enter a message before sending.');
      return;
    }
    if (!customer.mobile || customer.mobile.trim().length < 9) {
      setErrorMsg('Customer does not have a valid mobile number.');
      return;
    }

    setIsSending(true);
    setErrorMsg(null);

    try {
      await apiClient.post('/notifications/send-custom-sms', {
        customer_id: customer.id,
        phone: customer.mobile,
        message: message.trim()
      });

      setSentSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to dispatch SMS');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ background: 'var(--bg-primary)', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '520px', border: '1px solid var(--border-color)', boxShadow: '0 24px 48px rgba(0,0,0,0.35)', maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
            <MessageSquare size={20} color="var(--brand-primary)" /> Send Custom SMS
          </h2>
          <button onClick={onClose} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Customer Info Card */}
        <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '16px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={15} color="var(--brand-primary)" />
            <strong>{customer.full_name}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
            <Phone size={14} />
            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{customer.mobile || 'No Mobile'}</span>
          </div>
          {pendingBalance > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', borderTop: '1px dashed var(--border-color)', paddingTop: '6px', marginTop: '4px' }}>
              <Wallet size={14} color="#f59e0b" />
              <span style={{ color: 'var(--text-secondary)' }}>Pending Dues:</span>
              <strong style={{ color: '#f59e0b' }}>Rs. {formattedBal}</strong>
            </div>
          )}
        </div>

        {sentSuccess ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <CheckCircle2 size={52} color="#10b981" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 700, color: '#10b981' }}>SMS Dispatched!</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Message was transmitted to <strong>{customer.mobile}</strong> and logged in SMS audit trail.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSend}>
            {/* Quick Templates */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <Sparkles size={14} color="var(--brand-primary)" /> 1-Click Message Templates:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {templates.map(tmpl => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl.text)}
                    style={{
                      fontSize: '11px',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontWeight: 500,
                      transition: 'all 0.15s'
                    }}
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Box */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Message Content</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => handleInsertVariable(firstName)}
                    style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--brand-primary)', cursor: 'pointer' }}
                  >
                    + Name
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertVariable(`Rs. ${formattedBal}`)}
                    style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--brand-primary)', cursor: 'pointer' }}
                  >
                    + Balance
                  </button>
                </div>
              </div>
              <textarea
                value={message}
                onChange={e => {
                  setMessage(e.target.value);
                  setErrorMsg(null);
                }}
                rows={5}
                required
                placeholder="Type your message to this customer..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '13px',
                  resize: 'vertical',
                  lineHeight: '1.4'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span>Telecom Sender ID: <strong>MasterHouse</strong></span>
                <span style={{ fontWeight: 600, color: charCount > 160 ? '#f59e0b' : 'var(--text-secondary)' }}>
                  {charCount} chars &bull; {smsCount} SMS {smsCount > 1 ? 'parts' : 'part'}
                </span>
              </div>
            </div>

            {errorMsg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '12px', marginBottom: '14px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isSending}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: isSending ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSending || !message.trim()}
                style={{
                  flex: 2,
                  padding: '12px',
                  background: 'var(--brand-primary)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: isSending || !message.trim() ? 'not-allowed' : 'pointer',
                  opacity: isSending || !message.trim() ? 0.6 : 1,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
              >
                {isSending ? (
                  'Transmitting SMS...'
                ) : (
                  <>
                    <Send size={16} /> Send SMS via Text.lk
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
