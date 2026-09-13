import { TaxReportTab } from '../components/TaxReportTab';

export function TaxReportPage() {
  return (
    <div style={{ padding: 'var(--spacing-6)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>Tax Summary</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>View and export tax collected across branches</p>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <TaxReportTab />
      </div>
    </div>
  );
}
