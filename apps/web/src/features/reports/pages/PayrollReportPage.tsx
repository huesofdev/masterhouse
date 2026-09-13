import { Users } from 'lucide-react';
import { PayrollReportTab } from '../components/PayrollReportTab';

export function PayrollReportPage() {
  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', height: '100%' }}>
      <header className="page-header glass-panel" style={{ padding: 'var(--spacing-4)', borderRadius: 'var(--border-radius-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
          <div style={{ 
            background: 'var(--bg-tertiary)', 
            padding: 'var(--spacing-2)', 
            borderRadius: 'var(--border-radius-md)',
            color: 'var(--brand-primary)'
          }}>
            <Users size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>Staff Payroll & Performance Report</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Track staff sales downpayments, installment collections, and total money handled</p>
          </div>
        </div>
      </header>

      <main className="glass-panel" style={{ padding: 'var(--spacing-4)', borderRadius: 'var(--border-radius-lg)', flex: 1, overflow: 'hidden' }}>
        <PayrollReportTab />
      </main>
    </div>
  );
}
