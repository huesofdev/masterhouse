import { FileSpreadsheet } from 'lucide-react';
import { CollectionsReportTab } from '../components/CollectionsReportTab';

export function ContractsReportPage() {

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
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>Contract Wise Report</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>View and export your business insights</p>
          </div>
        </div>
      </header>

      <main className="glass-panel" style={{ padding: 'var(--spacing-4)', borderRadius: 'var(--border-radius-lg)', flex: 1, overflow: 'hidden' }}>
        <CollectionsReportTab />
      </main>
    </div>
  );
}
