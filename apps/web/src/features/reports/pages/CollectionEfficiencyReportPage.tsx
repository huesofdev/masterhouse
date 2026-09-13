import { useState, useEffect } from 'react';
import { printReportDocument } from '../../../lib/printReport';
import { ReportExportButtons, exportToExcel } from '../../../components/ReportExportButtons';
import { Target, Loader2 } from 'lucide-react';
import { apiClient } from '../../../lib/axios';

export function CollectionEfficiencyReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const handlePrint = () => {
    printReportDocument(
      "Collection Efficiency Report",
      `Date Range: ${startDate || 'Any'} to ${endDate || 'Any'}`,
      [
        { header: "Route Name", accessorKey: "routeName", cell: (r: any) => r.routeName || 'Unassigned' },
        { header: "Target Amount", accessorKey: "expectedAmount", cell: (r: any) => `Rs. ${r.expectedAmount.toLocaleString('en-GB')}` },
        { header: "Actual Collected", accessorKey: "collectedAmount", cell: (r: any) => `Rs. ${r.collectedAmount.toLocaleString('en-GB')}` },
        { header: "Efficiency", accessorKey: "efficiencyPercentage", cell: (r: any) => `${Math.round(r.efficiencyPercentage)}%` },
      ],
      data
    );
  };

  const handleExportExcel = () => {
    exportToExcel(data, "Collection_Efficiency_Report");
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/reports/efficiency', { 
        params: { startDate, endDate } 
      });
      setData(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (efficiency: number) => {
    if (efficiency >= 90) return 'var(--status-success)';
    if (efficiency >= 70) return 'var(--status-warning)';
    return 'var(--status-error)';
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', height: '100%' }}>
      <header className="page-header glass-panel" style={{ padding: 'var(--spacing-4)', borderRadius: 'var(--border-radius-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
            <div style={{ 
              background: 'var(--bg-tertiary)', 
              padding: 'var(--spacing-2)', 
              borderRadius: 'var(--border-radius-md)',
              color: 'var(--brand-primary)'
            }}>
              <Target size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>Collection Efficiency Report</h1>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Track target vs actual collections per route</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
            <ReportExportButtons onPrint={() => handlePrint()} onExportExcel={handleExportExcel} />
            <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
          </div>
          </div>
        </div>
      </header>

      <main className="glass-panel print-container" style={{ padding: 'var(--spacing-4)', borderRadius: 'var(--border-radius-lg)', flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}><Loader2 className="spin" size={24} style={{ display: 'inline' }}/> Loading...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>Route Name</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>Target Amount</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>Actual Collected</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', width: '30%' }}>Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row.routeId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{row.routeName || 'Unassigned'}</td>
                  <td style={{ padding: '12px', textAlign: 'right', color: 'var(--text-primary)' }}>Rs. {row.expectedAmount.toLocaleString('en-GB')}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 500, color: 'var(--brand-primary)' }}>Rs. {row.collectedAmount.toLocaleString('en-GB')}</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ flex: 1, height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${Math.min(row.efficiencyPercentage, 100)}%`, 
                          background: getStatusColor(row.efficiencyPercentage),
                          borderRadius: '4px'
                        }} />
                      </div>
                      <span style={{ fontWeight: 700, color: getStatusColor(row.efficiencyPercentage), minWidth: '50px' }}>
                        {row.efficiencyPercentage}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No routes found for this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
