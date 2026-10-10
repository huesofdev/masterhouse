import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { exportToExcel, ReportExportButtons } from '../../../components/ReportExportButtons';
import { apiClient } from '../../../lib/axios';

export function ProfitLossReportTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [routeId, setRouteId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);

  useEffect(() => {
    fetchRoutes();
    fetchBranches();
    fetchReport();
  }, [routeId, branchId, startDate, endDate]);

  const fetchRoutes = async () => {
    try {
      const res = await apiClient.get('/routes');
      setRoutes(res.data.data || res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await apiClient.get('/branches');
      setBranches(res.data.data || res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/reports/profit-loss', { 
        params: { routeId, branchId, startDate, endDate } 
      });
      setData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}><Loader2 className="spin" size={24} style={{ display: 'inline' }}/> Loading...</div>;
  }

  const { contractual, realized } = data || { contractual: {}, realized: {} };

  const handleExport = () => {
    const exportData = [
      { Category: 'Direct Sales / Cash', Contractual: contractual?.directSalesRevenue || 0, Realized: realized?.directSalesCash || 0 },
      { Category: 'Installment / Downpayments', Contractual: contractual?.installmentPrincipal || 0, Realized: realized?.downpaymentsCollected || 0 },
      { Category: 'Interest / Receipts', Contractual: contractual?.installmentInterest || 0, Realized: realized?.receiptsCollected || 0 },
      { Category: 'Total Inflow / Revenue', Contractual: contractual?.totalRevenue || 0, Realized: realized?.totalInflow || 0 },
      { Category: 'Less: Cost of Goods Sold', Contractual: -(contractual?.totalCogs || 0), Realized: -(realized?.totalCogs || 0) },
      { Category: 'Gross Profit', Contractual: contractual?.grossProfit || 0, Realized: realized?.grossProfit || 0 },
      { Category: 'Less: Operational Expenses', Contractual: -(contractual?.totalExpenses || 0), Realized: -(realized?.totalExpenses || 0) },
      { Category: 'Net Profit', Contractual: contractual?.netProfit || 0, Realized: realized?.netProfit || 0 },
    ];
    exportToExcel(exportData, "Profit_Loss_Report");
  };

  const handlePrint = () => {
    const routeName = routes.find(r => r.id === routeId)?.name || 'All Routes';
    const dateStr = new Date().toLocaleDateString('en-GB');

    const html = `
      <html>
        <head>
          <title>Profit & Loss Report</title>
          <style>
            @page { size: A4 portrait; margin: 20mm; }
            body { font-family: Arial, sans-serif; color: #000; margin: 0; font-size: 12px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 15px; }
            .header h1 { margin: 0 0 5px 0; font-size: 24px; text-transform: uppercase; }
            .filters { margin-bottom: 20px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { border: 1px solid #000; padding: 8px 10px; text-align: left; }
            th { background-color: #f0f0f0; }
            .total-row { font-weight: bold; background-color: #f9f9f9; }
            .sub-section { display: flex; justify-content: space-between; gap: 20px; }
            .sub-section > div { flex: 1; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Master House</h1>
            <h2>Profit & Loss Report</h2>
            <div>Generated on: ${dateStr}</div>
          </div>
          <div class="filters">
            Date Range: ${startDate || 'Any'} to ${endDate || 'Any'} | Route: ${routeName}
          </div>
          
          <div class="sub-section">
            <div>
              <h3>Contractual P&L (Expected)</h3>
              <table>
                <tbody>
                  <tr><td>Direct Sales Revenue</td><td>Rs. ${contractual.directSalesRevenue || 0}</td></tr>
                  <tr><td>Installment Principal</td><td>Rs. ${contractual.installmentRevenue || 0}</td></tr>
                  <tr><td>Installment Interest</td><td>Rs. ${contractual.installmentInterest || 0}</td></tr>
                  <tr class="total-row"><td>Total Expected Revenue</td><td>Rs. ${contractual.totalRevenue || 0}</td></tr>
                  <tr><td>Tax Collected (Liability)</td><td>Rs. ${contractual.totalTaxCollected || 0}</td></tr>
                  <tr><td>Less: Cost of Goods Sold</td><td>(Rs. ${contractual.totalCogs || 0})</td></tr>
                  <tr class="total-row"><td>Gross Profit</td><td>Rs. ${contractual.grossProfit || 0}</td></tr>
                  <tr><td>Less: Expenses</td><td>(Rs. ${contractual.totalExpenses || 0})</td></tr>
                  <tr class="total-row"><td>Net Expected Profit</td><td>Rs. ${contractual.netProfit || 0}</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <h3>Realized P&L (Cash Flow)</h3>
              <table>
                <tbody>
                  <tr><td>Direct Sales Cash</td><td>Rs. ${realized.directSalesCash || 0}</td></tr>
                  <tr><td>Downpayments</td><td>Rs. ${realized.downpaymentsCollected || 0}</td></tr>
                  <tr><td>Receipts (Instalments)</td><td>Rs. ${realized.receiptsCollected || 0}</td></tr>
                  <tr class="total-row"><td>Total Cash Inflow</td><td>Rs. ${realized.totalInflow || 0}</td></tr>
                  <tr><td>Tax Collected (Liability)</td><td>Rs. ${realized.totalTaxCollected || 0}</td></tr>
                  <tr><td>Less: Cost of Goods Sold</td><td>(Rs. ${realized.totalCogs || 0})</td></tr>
                  <tr class="total-row"><td>Gross Realized Profit</td><td>Rs. ${realized.grossProfit || 0}</td></tr>
                  <tr><td>Less: Expenses</td><td>(Rs. ${realized.totalExpenses || 0})</td></tr>
                  <tr class="total-row"><td>Net Cash Profit</td><td>Rs. ${realized.netProfit || 0}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', height: '100%', overflow: 'auto' }}>
      
      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--spacing-3)', alignItems: 'center' }}>
        <select 
          value={branchId} 
          onChange={(e) => setBranchId(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        >
          <option value="">All Branches</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <select 
          value={routeId} 
          onChange={(e) => setRouteId(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        >
          <option value="">All Routes</option>
          {routes.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>

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

        <div style={{ marginLeft: 'auto' }}>
          <ReportExportButtons onPrint={handlePrint} onExportExcel={handleExport} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-6)' }}>
        
        {/* CONTRACTUAL VIEW */}
        <div className="glass-panel" style={{ padding: 'var(--spacing-6)', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Expected Profit (Contractual)</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Total value generated if all contracts are paid in full.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Direct Sales Revenue</span>
              <span style={{ fontWeight: 500 }}>
                Rs. {Number(contractual.directSalesRevenue || 0).toLocaleString('en-GB')}
                {Number(contractual.directSalesRefunds || 0) > 0 && (
                  <span style={{ fontSize: '11px', color: 'var(--status-error)', marginLeft: '6px', fontWeight: 600 }}>
                    (Less: Rs. {Number(contractual.directSalesRefunds).toLocaleString('en-GB')} Refunds)
                  </span>
                )}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Installment Principal Sold</span>
              <span style={{ fontWeight: 500 }}>Rs. {Number(contractual.installmentRevenue || 0).toLocaleString('en-GB')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Contracted Interest</span>
              <span style={{ fontWeight: 500, color: 'var(--brand-primary)' }}>Rs. {Number(contractual.installmentInterest || 0).toLocaleString('en-GB')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Total Expected Revenue</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Rs. {Number(contractual.totalRevenue || 0).toLocaleString('en-GB')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', marginTop: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Tax Collected (Liability)</span>
              <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Rs. {Number(contractual.totalTaxCollected || 0).toLocaleString('en-GB')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', marginTop: '8px' }}>
              <span style={{ color: 'var(--status-error)' }}>Less: Cost of Goods Sold</span>
              <span style={{ fontWeight: 600, color: 'var(--status-error)' }}>- Rs. {Number(contractual.totalCogs || 0).toLocaleString('en-GB')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', marginTop: '8px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Expected Gross Profit</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Rs. {Number(contractual.grossProfit || 0).toLocaleString('en-GB')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', marginTop: '8px' }}>
              <span style={{ color: 'var(--status-error)' }}>Less: Operational Expenses</span>
              <span style={{ fontWeight: 600, color: 'var(--status-error)' }}>- Rs. {Number(contractual.totalExpenses || 0).toLocaleString('en-GB')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px', marginTop: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Expected Net Profit</span>
              <span style={{ fontWeight: 800, fontSize: '1.25rem', color: (contractual.netProfit || 0) >= 0 ? 'var(--status-success)' : 'var(--status-error)' }}>Rs. {Number(contractual.netProfit || 0).toLocaleString('en-GB')}</span>
            </div>
          </div>
        </div>

        {/* REALIZED VIEW */}
        <div className="glass-panel" style={{ padding: 'var(--spacing-6)', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Realized Cash Profit (Bank)</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Actual cash collected versus the cost of goods that left the store.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Direct Sales Cash</span>
              <span style={{ fontWeight: 500 }}>
                Rs. {Number(realized.directSalesCash || 0).toLocaleString('en-GB')}
                {Number(realized.directSalesRefunds || 0) > 0 && (
                  <span style={{ fontSize: '11px', color: 'var(--status-error)', marginLeft: '6px', fontWeight: 600 }}>
                    (Net of Rs. {Number(realized.directSalesRefunds).toLocaleString('en-GB')} Refunds)
                  </span>
                )}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Downpayments Collected</span>
              <span style={{ fontWeight: 500 }}>Rs. {Number(realized.downpaymentsCollected || 0).toLocaleString('en-GB')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Installment Receipts</span>
              <span style={{ fontWeight: 500, color: 'var(--brand-primary)' }}>
                Rs. {Number(realized.receiptsCollected || 0).toLocaleString('en-GB')}
                {Number(realized.installmentRefunds || 0) > 0 && (
                  <span style={{ fontSize: '11px', color: 'var(--status-error)', marginLeft: '6px', fontWeight: 600 }}>
                    (Less: Rs. {Number(realized.installmentRefunds).toLocaleString('en-GB')} Refunds)
                  </span>
                )}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Total Cash Inflow</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Rs. {Number(realized.totalInflow || 0).toLocaleString('en-GB')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', marginTop: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Tax Collected (Liability)</span>
              <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Rs. {Number(realized.totalTaxCollected || 0).toLocaleString('en-GB')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', marginTop: '8px' }}>
              <span style={{ color: 'var(--status-error)' }}>Less: Cost of Goods Sold</span>
              <span style={{ fontWeight: 600, color: 'var(--status-error)' }}>- Rs. {Number(realized.totalCogs || 0).toLocaleString('en-GB')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', marginTop: '8px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Realized Gross Profit</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Rs. {Number(realized.grossProfit || 0).toLocaleString('en-GB')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', marginTop: '8px' }}>
              <span style={{ color: 'var(--status-error)' }}>Less: Operational Expenses</span>
              <span style={{ fontWeight: 600, color: 'var(--status-error)' }}>- Rs. {Number(realized.totalExpenses || 0).toLocaleString('en-GB')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px', marginTop: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Realized Net Profit</span>
              <span style={{ fontWeight: 800, fontSize: '1.25rem', color: (realized.netProfit || 0) >= 0 ? 'var(--status-success)' : 'var(--status-error)' }}>
                Rs. {Number(realized.netProfit || 0).toLocaleString('en-GB')}
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
