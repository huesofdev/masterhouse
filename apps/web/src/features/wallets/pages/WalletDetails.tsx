import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetWalletDetails } from '../api';
import { useBranchStore } from '../../../hooks/useBranchStore';
import { ArrowLeft, Plus, Calendar, AlertTriangle, CreditCard, Box, Wallet } from 'lucide-react';
import { RepaymentModal } from '../components/RepaymentModal';
import { PermissionGuard } from '../../../components/PermissionGuard';

export const WalletDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const branchId = useBranchStore(state => state.activeBranchId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const { data, isLoading } = useGetWalletDetails(id || '', branchId || '');

  const toggleRow = (txId: string) => {
    setExpandedRows(prev => prev.includes(txId) ? prev.filter(r => r !== txId) : [...prev, txId]);
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'CASH_SHORTAGE':
      case 'STOCK_SHORTAGE':
        return <div style={{ color: 'var(--status-error)' }}><AlertTriangle size={18} /></div>;
      case 'REPAYMENT':
      case 'SALARY_DEDUCTION':
        return <div style={{ color: 'var(--status-success)' }}><CreditCard size={18} /></div>;
      default:
        return <div style={{ color: 'var(--text-muted)' }}><Box size={18} /></div>;
    }
  };

  const formatType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return <div style={{ padding: 'var(--spacing-4)', textAlign: 'center', color: 'var(--text-muted)' }}>Loading ledger...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ 
            background: 'none', border: 'none', cursor: 'pointer', 
            padding: '8px', color: 'var(--text-muted)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wallet size={24} color="var(--brand-primary)" />
            Wallet Ledger
          </h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>Detailed transaction history.</p>
        </div>
      </div>

      {data?.data && (
        <div style={{ display: 'flex', gap: 'var(--spacing-4)', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px' }}>
            <div style={{
              background: 'var(--bg-secondary)', 
              borderRadius: 'var(--border-radius-lg)',
              padding: 'var(--spacing-4)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
                Current Balance
              </div>
              <div style={{
                fontSize: 'var(--font-size-3xl)',
                fontWeight: 700,
                color: parseFloat(data.data.balance) < 0 ? 'var(--status-error)' : 'var(--status-success)'
              }}>
                Rs. {parseFloat(data.data.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              
              <PermissionGuard permission="wallets:update" behavior="hide">
              <button
                onClick={() => setIsModalOpen(true)}
                style={{
                  marginTop: 'var(--spacing-4)',
                  width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '12px 16px',
                  background: 'var(--brand-primary)',
                  color: 'var(--bg-primary)',
                  border: 'none',
                  borderRadius: 'var(--border-radius-sm)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Plus size={18} />
                Add Settlement
              </button>
              </PermissionGuard>
            </div>
          </div>

          <div style={{ flex: '2 1 600px' }}>
            <div style={{
              background: 'var(--bg-secondary)', 
              borderRadius: 'var(--border-radius-lg)',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ padding: 'var(--spacing-3)', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>Transaction History</h3>
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: 'var(--bg-tertiary)' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date</th>
                      <th style={{ padding: '12px 16px', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Type & Details</th>
                      <th style={{ padding: '12px 16px', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No transactions found for this wallet.
                        </td>
                      </tr>
                    ) : (
                      data.data.transactions.map((tx) => (
                        <React.Fragment key={tx.id}>
                          <tr 
                            style={{
                              borderBottom: '1px solid var(--border-color)',
                              cursor: tx.snapshot_data ? 'pointer' : 'default',
                            }}
                            onClick={() => tx.snapshot_data && toggleRow(tx.id)}
                          >
                            <td style={{ padding: '16px', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar size={14} />
                                <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                              </div>
                              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '4px', marginLeft: '20px' }}>
                                {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td style={{ padding: '16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                {getIconForType(tx.type)}
                                <span style={{ fontWeight: 600 }}>{formatType(tx.type)}</span>
                                {tx.snapshot_data && (
                                  <span style={{ 
                                    fontSize: '10px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', 
                                    padding: '2px 8px', borderRadius: '12px', fontWeight: 600 
                                  }}>
                                    View Snapshot
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                {tx.description}
                              </div>
                            </td>
                            <td style={{ padding: '16px', textAlign: 'right', fontWeight: 700, color: (tx.type === 'CASH_SHORTAGE' || tx.type === 'STOCK_SHORTAGE') ? 'var(--status-error)' : 'var(--status-success)' }}>
                              {(tx.type === 'CASH_SHORTAGE' || tx.type === 'STOCK_SHORTAGE') ? '-' : '+'} Rs. {parseFloat(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                          {expandedRows.includes(tx.id) && tx.snapshot_data && (
                            <tr>
                              <td colSpan={3} style={{ padding: '16px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: 'var(--font-size-sm)' }}>
                                  <h4 style={{ fontWeight: 600, marginBottom: '8px' }}>Stock Snapshot Data</h4>
                                  <pre style={{ 
                                    background: 'var(--bg-primary)', padding: '12px', borderRadius: '4px', 
                                    overflowX: 'auto', fontSize: '12px', color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)'
                                  }}>
                                    {JSON.stringify(tx.snapshot_data, null, 2)}
                                  </pre>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && id && (
        <RepaymentModal
          userId={id}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};
