import { useState, useEffect } from 'react';
import { printReportDocument } from '../../../lib/printReport';
import { ReportExportButtons } from '../../../components/ReportExportButtons';
import { apiClient } from '../../../lib/axios';

export function SchedulesReportTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [routeId, setRouteId] = useState('');
  const [routes, setRoutes] = useState<any[]>([]);
  
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 100;

  useEffect(() => {
    setPage(1);
  }, [status, routeId]);

  useEffect(() => {
    fetchRoutes();
    fetchReport();
  }, [status, routeId, page]);

  const fetchRoutes = async () => {
    try {
      const res = await apiClient.get('/routes');
      setRoutes(res.data.data || res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/reports/schedules', { params: { status, routeId, page, limit } });
      setData(res.data.data);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      
      const res = await apiClient.get('/reports/schedules/export', { 
        params: { status, routeId },
        responseType: 'blob' 
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Schedules_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error(err);
    } finally {
      
    }
  };

  const handlePrint = async () => {
    try {
      const routeName = routes.find(r => r.id === routeId)?.name || 'All Routes';
      
      const res = await apiClient.get('/reports/schedules', { 
        params: { status, routeId } 
      });
      const fullData = res.data.data;

      printReportDocument(
        "Schedules Report",
        `Status: ${status || 'All'} | Route: ${routeName}`,
        [
          { header: "Installment No", accessorKey: "installmentNumber" },
          { header: "Due Date", accessorKey: "dueDate", cell: (r: any) => new Date(r.dueDate).toLocaleDateString('en-GB') },
          { header: "Customer", accessorKey: "customerName" },
          { header: "Products", accessorKey: "products" },
          { header: "Route", accessorKey: "routeName", cell: (r: any) => r.routeName || '-' },
          { header: "Status", accessorKey: "status" },
          { header: "Amount Due", accessorKey: "amountDue", cell: (r: any) => `Rs. ${Number(r.amountDue).toLocaleString('en-GB')}` },
          { header: "Amount Paid", accessorKey: "amountPaid", cell: (r: any) => `Rs. ${Number(r.amountPaid).toLocaleString('en-GB')}` },
        ],
        fullData
      );
    } catch (err) {
      console.error('Failed to fetch full data for print', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', height: '100%' }}>
      
      {/* Filters & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
          <select 
            value={status} 
            onChange={(e) => setStatus(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--border-radius-sm)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="">All Schedule Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
          </select>

          <select 
            value={routeId} 
            onChange={(e) => setRouteId(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--border-radius-sm)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="">All Routes</option>
            {routes.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <ReportExportButtons onPrint={handlePrint} onExportExcel={handleExport} />
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-4)' }}>
        <div className="glass-panel" style={{ padding: 'var(--spacing-4)', borderRadius: 'var(--border-radius-md)' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Schedules (Filtered)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {total}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container" style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'var(--bg-tertiary)', position: 'sticky', top: 0 }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Installment No</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Due Date</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Customer</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Products</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Route</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Status</th>
              <th style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Amount Due</th>
              <th style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Amount Paid</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No data available</td></tr>
            ) : (
              data.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', fontWeight: 600 }}>{row.installmentNumber}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>{new Date(row.dueDate).toLocaleDateString('en-GB')}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>{row.customerName}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{row.products}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{row.routeName || '-'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '12px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600,
                      background: row.status === 'PAID' ? 'rgba(34, 197, 94, 0.1)' : row.status === 'OVERDUE' ? 'rgba(239, 68, 68, 0.1)' : row.status === 'PARTIALLY_PAID' ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-tertiary)',
                      color: row.status === 'PAID' ? 'var(--status-success)' : row.status === 'OVERDUE' ? 'var(--status-error)' : row.status === 'PARTIALLY_PAID' ? 'var(--status-warning)' : 'var(--text-secondary)'
                    }}>
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', textAlign: 'right', fontWeight: 500 }}>Rs. {Number(row.amountDue).toLocaleString('en-GB')}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', textAlign: 'right', fontWeight: 600, color: row.amountPaid > 0 ? 'var(--status-success)' : 'var(--text-primary)' }}>
                    Rs. {Number(row.amountPaid).toLocaleString('en-GB')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-2) 0' }}>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Showing {data.length} of {total} results
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            style={{ padding: '6px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
          >
            Previous
          </button>
          <button 
            disabled={page * limit >= total}
            onClick={() => setPage(p => p + 1)}
            style={{ padding: '6px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: page * limit >= total ? 'not-allowed' : 'pointer' }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
