import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ReportExportButtons } from '../../../components/ReportExportButtons';
import { apiClient } from '../../../lib/axios';

export function BookingsReportTab() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAdvances, setTotalAdvances] = useState(0);
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState('');
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
  }, [branchId, status, startDate, endDate, page]);

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
      const res = await apiClient.get('/reports/bookings', { 
        params: { branchId, status, startDate, endDate, page, limit } 
      });
      setData(res.data.data);
      setTotal(res.data.total);
      setTotalAdvances(res.data.totalAdvances || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await apiClient.get('/reports/bookings/export', { 
        params: { branchId, status, startDate, endDate },
        responseType: 'blob' 
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Bookings_Report.xlsx');
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
          <title>Bookings/Pre-orders Report</title>
          <style>
            @page { size: A4 landscape; margin: 20mm; }
            body { font-family: Arial, sans-serif; color: #000; margin: 0; font-size: 12px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 15px; }
            .header h1 { margin: 0 0 5px 0; font-size: 24px; text-transform: uppercase; }
            .filters { margin-bottom: 20px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { border: 1px solid #000; padding: 8px 10px; text-align: left; }
            th { background-color: #f0f0f0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Master House</h1>
            <h2>Bookings/Pre-orders Report</h2>
            <div>Generated on: ${dateStr}</div>
          </div>
          <div class="filters">
            Date Range: ${startDate || 'Any'} to ${endDate || 'Any'} | Branch: ${branchName} | Status: ${status || 'All'}
          </div>
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Date</th>
                <th>Branch</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Status</th>
                <th>Advance Paid</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(d => `
                <tr>
                  <td>${d.referenceNumber || '-'}</td>
                  <td>${new Date(d.date).toLocaleString('en-GB')}</td>
                  <td>${d.branchName || '-'}</td>
                  <td>${d.customerName || '-'}</td>
                  <td>${d.products || '-'}</td>
                  <td>${d.status || '-'}</td>
                  <td>Rs. ${Number(d.advancePayment || 0).toLocaleString('en-GB')}</td>
                  <td>${d.paymentMethod || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="font-size: 14px; font-weight: bold; text-align: right; margin-top: 15px;">
            Total Advance Paid: Rs. ${totalAdvances.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

        <select 
          value={status} 
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="FULFILLED">Fulfilled</option>
          <option value="CANCELLED">Cancelled</option>
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

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-4)' }}>
        <div className="glass-panel" style={{ padding: 'var(--spacing-4)', borderRadius: 'var(--border-radius-md)' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Advances (Filtered)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Rs. {totalAdvances.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: 'var(--spacing-4)', borderRadius: 'var(--border-radius-md)' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Bookings Count</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {total}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--border-color)' }}>
        <div style={{ overflowX: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
              <tr>
                <th style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Reference</th>
                <th style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Date</th>
                <th style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Branch</th>
                <th style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Customer</th>
                <th style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Items</th>
                <th style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', textAlign: 'right' }}>Advance Paid</th>
                <th style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Method</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Loader2 className="spin" size={24} style={{ display: 'inline' }} /> Loading...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No booking records found.</td>
                </tr>
              ) : (
                data.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-primary)' }}>{row.referenceNumber || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>{new Date(row.date).toLocaleString('en-GB')}</td>
                    <td style={{ padding: '12px 16px' }}>{row.branchName || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>{row.customerName || '-'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>{row.products || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', 
                        background: row.status === 'PENDING' ? 'rgba(245, 158, 11, 0.1)' : row.status === 'FULFILLED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: row.status === 'PENDING' ? 'var(--status-warning)' : row.status === 'FULFILLED' ? 'var(--status-success)' : 'var(--status-error)'
                      }}>
                        {row.status || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Rs. {Number(row.advancePayment || 0).toLocaleString('en-GB')}</td>
                    <td style={{ padding: '12px 16px' }}>{row.paymentMethod || '-'}</td>
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
