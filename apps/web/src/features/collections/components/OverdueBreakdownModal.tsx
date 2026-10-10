import { useState } from 'react';
import { useGetContractBreakdown } from '../api';
import { 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  ShieldAlert, 
  Clock, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Info 
} from 'lucide-react';

interface OverdueBreakdownModalProps {
  contractId: string;
  onClose: () => void;
}

export function OverdueBreakdownModal({ contractId, onClose }: OverdueBreakdownModalProps) {
  const { data, isLoading } = useGetContractBreakdown(contractId);
  const [activeTab, setActiveTab] = useState<'schedules' | 'adjustments'>('schedules');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 160,
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '740px',
          maxWidth: '96vw',
          maxHeight: '90vh',
          background: 'var(--bg-primary)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-tertiary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: data?.summary?.overdue_amount && data.summary.overdue_amount > 0 
                  ? 'rgba(239, 68, 68, 0.15)' 
                  : 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: data?.summary?.overdue_amount && data.summary.overdue_amount > 0 
                  ? '#ef4444' 
                  : '#10b981',
              }}
            >
              {data?.summary?.overdue_amount && data.summary.overdue_amount > 0 ? (
                <AlertTriangle size={20} />
              ) : (
                <CheckCircle2 size={20} />
              )}
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Overdue & Penalties Breakdown
              </h2>
              {data && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Contract #{data.contract.contract_no} • {data.contract.customer_name} • {data.contract.scheme_name}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '18px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
              Loading overdue and adjustments breakdown...
            </div>
          ) : !data ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
              Contract details not found.
            </div>
          ) : (
            <>
              {/* Top Summary Metrics */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px',
                }}
              >
                {/* 1. Active Overdue */}
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={13} color={data.summary.overdue_amount > 0 ? '#ef4444' : '#10b981'} />
                    Active Overdue
                  </div>
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      marginTop: '4px',
                      color: data.summary.overdue_amount > 0 ? '#ef4444' : '#10b981',
                    }}
                  >
                    Rs {data.summary.overdue_amount.toLocaleString('en-GB')}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {data.summary.overdue_count > 0 ? `${data.summary.overdue_count} overdue installment(s)` : 'Fully up to date'}
                  </div>
                </div>

                {/* 2. Lifetime Penalties */}
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ArrowUpRight size={13} color="#f59e0b" />
                    Lifetime Penalties
                  </div>
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      marginTop: '4px',
                      color: data.summary.total_penalties > 0 ? '#f59e0b' : 'var(--text-primary)',
                    }}
                  >
                    Rs {data.summary.total_penalties.toLocaleString('en-GB')}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {data.adjustments.filter(a => a.type === 'PENALTY').length} penalty fee(s) added
                  </div>
                </div>

                {/* 3. Waivers / Deductions */}
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ArrowDownRight size={13} color="#10b981" />
                    Discounts & Waivers
                  </div>
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      marginTop: '4px',
                      color: (data.summary.total_discounts + data.summary.total_write_offs + data.summary.total_rebates) > 0 ? '#10b981' : 'var(--text-primary)',
                    }}
                  >
                    Rs {(data.summary.total_discounts + data.summary.total_write_offs + data.summary.total_rebates).toLocaleString('en-GB')}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Total deductions applied
                  </div>
                </div>

                {/* 4. Remaining Balance */}
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <DollarSign size={13} color="var(--brand-primary)" />
                    Remaining Balance
                  </div>
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      marginTop: '4px',
                      color: data.summary.remaining_balance > 0 ? '#f59e0b' : 'var(--text-secondary)',
                    }}
                  >
                    Rs {data.summary.remaining_balance.toLocaleString('en-GB')}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Collected: Rs {data.contract.collected_amount.toLocaleString('en-GB')}
                  </div>
                </div>
              </div>

              {/* Informational Context Banner */}
              {data.summary.overdue_amount === 0 && data.summary.total_penalties > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    fontSize: '12px',
                    color: '#93c5fd',
                  }}
                >
                  <Info size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#60a5fa' }} />
                  <div>
                    <strong>Settled Overdue Status:</strong> Past late penalties totaling{' '}
                    <strong>Rs {data.summary.total_penalties.toLocaleString('en-GB')}</strong> were added during
                    previous missed installments and have since been cleared by subsequent payments. There are currently{' '}
                    <strong>0 active overdue schedules</strong>.
                  </div>
                </div>
              )}

              {data.summary.overdue_amount > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    fontSize: '12px',
                    color: '#fca5a5',
                  }}
                >
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#ef4444' }} />
                  <div>
                    <strong>Active Overdue Warning:</strong> This contract has{' '}
                    <strong>{data.summary.overdue_count} overdue installment(s)</strong> totaling{' '}
                    <strong>Rs {data.summary.overdue_amount.toLocaleString('en-GB')}</strong>.
                  </div>
                </div>
              )}

              {/* Tab Navigation */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '2px',
                }}
              >
                <button
                  onClick={() => setActiveTab('schedules')}
                  style={{
                    padding: '8px 16px',
                    background: activeTab === 'schedules' ? 'var(--bg-tertiary)' : 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'schedules' ? '2px solid var(--brand-primary)' : '2px solid transparent',
                    color: activeTab === 'schedules' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderRadius: '6px 6px 0 0',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Calendar size={15} />
                  Installment Schedules ({data.schedules.length})
                </button>

                <button
                  onClick={() => setActiveTab('adjustments')}
                  style={{
                    padding: '8px 16px',
                    background: activeTab === 'adjustments' ? 'var(--bg-tertiary)' : 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'adjustments' ? '2px solid var(--brand-primary)' : '2px solid transparent',
                    color: activeTab === 'adjustments' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderRadius: '6px 6px 0 0',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <ShieldAlert size={15} />
                  Penalties & Adjustments Log ({data.adjustments.length})
                </button>
              </div>

              {/* Tab 1: Installment Schedules */}
              {activeTab === 'schedules' && (
                <div
                  style={{
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px', width: '35px' }}>#</th>
                        <th style={{ padding: '8px 10px' }}>Due Date</th>
                        <th style={{ padding: '8px 10px' }}>Amount Due</th>
                        <th style={{ padding: '8px 10px' }}>Paid</th>
                        <th style={{ padding: '8px 10px' }}>Remaining</th>
                        <th style={{ padding: '8px 10px' }}>Status</th>
                        <th style={{ padding: '8px 10px' }}>Timeline Delay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.schedules.map((s) => {
                        const isOverdue = s.is_overdue;
                        const isFullyPaid = s.status === 'PAID' || s.balance_remaining <= 0.005;

                        return (
                          <tr
                            key={s.id}
                            style={{
                              borderBottom: '1px solid var(--border-color)',
                              background: isOverdue
                                ? 'rgba(239, 68, 68, 0.06)'
                                : isFullyPaid
                                ? 'transparent'
                                : 'transparent',
                            }}
                          >
                            <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              {s.installment_number}
                            </td>
                            <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                              {new Date(s.due_date).toLocaleDateString('en-GB')}
                            </td>
                            <td style={{ padding: '8px 10px', fontWeight: 600 }}>
                              Rs {s.amount_due.toLocaleString('en-GB')}
                            </td>
                            <td style={{ padding: '8px 10px', color: s.amount_paid > 0 ? '#10b981' : 'var(--text-secondary)' }}>
                              Rs {s.amount_paid.toLocaleString('en-GB')}
                            </td>
                            <td
                              style={{
                                padding: '8px 10px',
                                fontWeight: 600,
                                color: s.balance_remaining > 0 ? (isOverdue ? '#ef4444' : '#f59e0b') : '#10b981',
                              }}
                            >
                              Rs {s.balance_remaining.toLocaleString('en-GB')}
                            </td>
                            <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                              {s.status === 'PAID' ? (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    color: '#10b981',
                                    background: 'rgba(16, 185, 129, 0.12)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  PAID
                                </span>
                              ) : s.status === 'OVERDUE' || isOverdue ? (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    color: '#ef4444',
                                    background: 'rgba(239, 68, 68, 0.12)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  OVERDUE
                                </span>
                              ) : s.status === 'PARTIALLY_PAID' ? (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    color: '#f59e0b',
                                    background: 'rgba(245, 158, 11, 0.12)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  PARTIAL
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    color: 'var(--text-secondary)',
                                    background: 'var(--bg-tertiary)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  PENDING
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '8px 10px', fontSize: '11px' }}>
                              {isOverdue ? (
                                <span style={{ color: '#ef4444', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <Clock size={12} /> {s.days_overdue} day(s) late
                                </span>
                              ) : isFullyPaid ? (
                                <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <CheckCircle2 size={12} /> Paid
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>Upcoming</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 2: Penalties & Adjustments Log */}
              {activeTab === 'adjustments' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {data.adjustments.length === 0 ? (
                    <div
                      style={{
                        padding: '30px 20px',
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        background: 'var(--bg-secondary)',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <CheckCircle2 size={24} color="#10b981" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                      No penalties, discounts, or contract adjustments have been recorded for this contract.
                    </div>
                  ) : (
                    data.adjustments.map((adj) => {
                      const isPenalty = adj.type === 'PENALTY';
                      const isDiscount = adj.type === 'DISCOUNT' || adj.type === 'REBATE' || adj.type === 'WRITE_OFF';

                      return (
                        <div
                          key={adj.id}
                          style={{
                            background: 'var(--bg-secondary)',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: '12px',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: isPenalty ? '#ef4444' : isDiscount ? '#10b981' : 'var(--text-primary)',
                                  background: isPenalty
                                    ? 'rgba(239, 68, 68, 0.12)'
                                    : 'rgba(16, 185, 129, 0.12)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                }}
                              >
                                {adj.type}
                              </span>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {adj.reason}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              {new Date(adj.created_at).toLocaleString('en-GB')} • Logged by{' '}
                              <strong style={{ color: 'var(--text-primary)' }}>{adj.created_by_name}</strong>
                            </div>
                          </div>

                          <div
                            style={{
                              fontSize: '15px',
                              fontWeight: 700,
                              color: isPenalty ? '#ef4444' : '#10b981',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {isPenalty ? `+Rs ${adj.amount.toLocaleString('en-GB')}` : `-Rs ${adj.amount.toLocaleString('en-GB')}`}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 22px',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-tertiary)',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
