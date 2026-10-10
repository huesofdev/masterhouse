import { RotateCcw } from 'lucide-react';
import { RefundsReportTab } from '../components/RefundsReportTab';

export function RefundsReportPage() {
  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', height: '100%' }}>
      <header className="page-header glass-panel" style={{ padding: 'var(--spacing-4)', borderRadius: 'var(--border-radius-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            padding: 'var(--spacing-2)', 
            borderRadius: 'var(--border-radius-md)',
            color: 'var(--status-error)'
          }}>
            <RotateCcw size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>Refunds & Returns Audit Report</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Detailed breakdown of all direct POS returns, installment contract refunds, and staff performance impact</p>
          </div>
        </div>
      </header>

      <main className="glass-panel" style={{ padding: 'var(--spacing-4)', borderRadius: 'var(--border-radius-lg)', flex: 1, overflow: 'hidden' }}>
        <RefundsReportTab />
      </main>
    </div>
  );
}
