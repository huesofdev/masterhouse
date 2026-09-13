import { useState } from 'react';
import { useSchemes } from '../api';
import { Plus, Edit2, Calendar } from 'lucide-react';
import { SchemeFormModal } from '../components/SchemeFormModal';

export function SchemesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingScheme, setEditingScheme] = useState<any>(null);

  const { data: schemes, isLoading } = useSchemes();

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Installment Schemes</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '14px' }}>
            Manage financing templates and terms for installment sales
          </p>
        </div>
        
        <button onClick={() => setShowForm(true)} style={{ 
          display: 'flex', alignItems: 'center', gap: '8px', 
          background: 'var(--brand-primary)', color: 'white', 
          padding: '10px 16px', borderRadius: '8px', 
          border: 'none', fontWeight: 600, cursor: 'pointer' 
        }}>
          <Plus size={18} /> New Scheme
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '13px' }}>Scheme Name</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '13px' }}>Terms</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '13px' }}>Frequency</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '13px' }}>Interest</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '13px' }}>Min Downpayment</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '13px' }}>Late Fee</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '13px' }}>Grace Period</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '13px' }}>Status</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '13px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} style={{ padding: '24px', textAlign: 'center' }}>Loading schemes...</td></tr>
            ) : schemes?.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No schemes created yet.</td></tr>
            ) : schemes?.map((scheme: any) => (
              <tr key={scheme.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s', opacity: scheme.is_active ? 1 : 0.5 }}>
                <td style={{ padding: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} color="var(--brand-primary)"/>
                  {scheme.name}
                </td>
                <td style={{ padding: '16px' }}>{scheme.terms} Payments</td>
                <td style={{ padding: '16px', fontSize: '13px' }}>{scheme.frequency}</td>
                <td style={{ padding: '16px', fontWeight: 600, color: 'var(--brand-primary)' }}>{scheme.interest_rate}%</td>
                <td style={{ padding: '16px' }}>{scheme.min_downpayment_percent}%</td>
                <td style={{ padding: '16px' }}>{scheme.late_fee_percentage}%</td>
                <td style={{ padding: '16px' }}>{scheme.grace_period_days} days</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ 
                    padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                    background: scheme.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: scheme.is_active ? '#10b981' : '#ef4444'
                  }}>
                    {scheme.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <button 
                    onClick={() => {
                      setEditingScheme(scheme);
                      setShowForm(true);
                    }}
                    style={{ background: 'rgba(59, 130, 246, 0.1)', border: 'none', color: 'var(--brand-primary)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <SchemeFormModal 
          scheme={editingScheme}
          onClose={() => {
            setShowForm(false);
            setEditingScheme(null);
          }}
        />
      )}
    </div>
  );
}
