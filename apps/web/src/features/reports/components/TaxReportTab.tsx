import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ReportExportButtons } from '../../../components/ReportExportButtons';
import { apiClient } from '../../../lib/axios';

export function TaxReportTab() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalTaxAmount, setTotalTaxAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [branches, setBranches] = useState<any[]>([]);

  const [page, setPage] = useState(1);
  const limit = 100;

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [branchId, startDate, endDate, page]);

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
      const res = await apiClient.get('/reports/tax', { 
        params: { branchId, startDate, endDate, page, limit } 
      });
      setData(res.data.data);
      setTotal(res.data.total);
      setTotalTaxAmount(res.data.totalTaxAmount);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await apiClient.get('/reports/tax/export', { 
        params: { branchId, startDate, endDate },
        responseType: 'blob' 
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Tax_Report.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  const handlePrint = () => {
    const branchName = branches.find(b => b.id === branchId)?.name || 'All Branches';
    const dateStr = new Date().toLocaleDateString('en-GB');

    const html = `
      <html>
        <head>
          <title>Tax Summary Report</title>
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
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Master House</h1>
            <h2>Tax Summary Report</h2>
            <div>Generated on: ${dateStr}</div>
          </div>
          <div class="filters">
            Date Range: ${startDate || 'Any'} to ${endDate || 'Any'} | Branch: ${branchName}
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Reference</th>
                <th>Branch</th>
                <th>Sale Type</th>
                <th>Taxable Amount</th>
                <th>Tax Amount</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(d => `
                <tr>
                  <td>${new Date(d.date).toLocaleDateString('en-GB')}</td>
                  <td>${d.referenceNumber || '-'}</td>
                  <td>${d.branchName || '-'}</td>
                  <td>${d.saleType}</td>
                  <td>Rs. ${Number(d.netAmount || 0).toLocaleString('en-GB')}</td>
                  <td>Rs. ${Number(d.taxAmount || 0).toLocaleString('en-GB')}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="5" style="text-align:right;">Total Tax Collected:</td>
                <td>Rs. ${Number(totalTaxAmount || 0).toLocaleString('en-GB')}</td>
              </tr>
            </tbody>
          </table>
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

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', height: '100%' }}>
      
      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--spacing-3)', alignItems: 'center', flexWrap: 'wrap' }}>
        <select 
          value={branchId} 
          onChange={(e) => { setBranchId(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        >
          <option value="">All Branches</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <input 
          type="date"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        />
        <input 
          type="date"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        />

        <div style={{ marginLeft: 'auto' }}>
          <ReportExportButtons onPrint={handlePrint} onExportExcel={handleExport} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-2)' }}>
        <div className="glass-panel" style={{ padding: 'var(--spacing-4)', borderRadius: 'var(--border-radius-md)', flex: 1, border: '1px solid var(--border-color)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Tax Collected</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>Rs. {Number(totalTaxAmount || 0).toLocaleString('en-GB')}</div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--border-color)' }}>
        <div style={{ overflowX: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
              <tr>
                <th style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Date</th>
                <th style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Reference</th>
                <th style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Branch</th>
                <th style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Sale Type</th>
                <th style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Taxable Amount</th>
                <th style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Tax Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Loader2 className="spin" size={24} style={{ display: 'inline' }} /> Loading...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No tax records found for this period.</td>
                </tr>
              ) : (
                data.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px' }}>{new Date(row.date).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 16px' }}>{row.referenceNumber || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>{row.branchName || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', background: 'var(--bg-tertiary)' }}>{row.saleType}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>Rs. {Number(row.netAmount || 0).toLocaleString('en-GB')}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>Rs. {Number(row.taxAmount || 0).toLocaleString('en-GB')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{ padding: '6px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
            >
              Previous
            </button>
            <button 
              disabled={page >= totalPages} 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{ padding: '6px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.5 : 1 }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
