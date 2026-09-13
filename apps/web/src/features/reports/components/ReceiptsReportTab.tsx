import { useState, useEffect } from 'react';
import { printReportDocument } from '../../../lib/printReport';
import { ReportExportButtons } from '../../../components/ReportExportButtons';
import { apiClient } from '../../../lib/axios';

export function ReceiptsReportTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [routeId, setRouteId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userId, setUserId] = useState('');
  const [routes, setRoutes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const limit = 100;

  useEffect(() => {
    setPage(1);
  }, [routeId, startDate, endDate, userId]);

  useEffect(() => {
    fetchRoutes();
    fetchUsers();
    fetchReport();
  }, [routeId, startDate, endDate, userId, page]);

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get('/users');
      setUsers(res.data.data || res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

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
      const res = await apiClient.get('/reports/receipts', { params: { routeId, startDate, endDate, userId, page, limit } });
      setData(res.data.data);
      setTotal(res.data.total || 0);
      setSummary(res.data.summary || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      
      const res = await apiClient.get('/reports/receipts/export', { 
        params: { routeId, startDate, endDate, userId },
        responseType: 'blob' 
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Receipts_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
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
      const userName = users.find(u => u.id === userId)?.name || 'All Users';
      
      const res = await apiClient.get('/reports/receipts', { 
        params: { routeId, userId, startDate, endDate } 
      });
      const fullData = res.data.data;

      printReportDocument(
        "Collection Receipts Report",
        `Date Range: ${startDate || 'Any'} to ${endDate || 'Any'} | Route: ${routeName} | Collected By: ${userName}`,
        [
          { header: "Receipt No", accessorKey: "receiptNo" },
          { header: "Date", accessorKey: "date", cell: (r: any) => new Date(r.date).toLocaleDateString('en-GB') },
          { header: "Customer", accessorKey: "customerName" },
          { header: "Route", accessorKey: "routeName" },
          { header: "Products", accessorKey: "products" },
          { header: "Collected By", accessorKey: "collectedBy" },
          { header: "Payment Mode", accessorKey: "paymentMode" },
          { header: "Amount Paid", accessorKey: "amount", cell: (r: any) => `Rs. ${Number(r.amount).toLocaleString('en-GB')}` },
        ],
        fullData
      );
    } catch (err) {
      console.error('Failed to fetch full data for print', err);
    }
  };

  const totalAmount = summary?.totalAmount !== undefined ? summary.totalAmount : data.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', height: '100%' }}>
      
      {/* Filters & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
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

          <select 
            value={userId} 
            onChange={(e) => setUserId(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--border-radius-sm)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="">All Users</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
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
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <ReportExportButtons onPrint={handlePrint} onExportExcel={handleExport} />
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-4)' }}>
        <div className="glass-panel" style={{ padding: 'var(--spacing-4)', borderRadius: 'var(--border-radius-md)' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Amount (Filtered)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Rs. {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: 'var(--spacing-4)', borderRadius: 'var(--border-radius-md)' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Receipts (Filtered)</div>
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
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Date</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Receipt No</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Customer</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Products</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Route</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Payment Mode</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Collected By</th>
              <th style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Amount</th>
              <th style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Bal. (After Receipt)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No data available</td></tr>
            ) : (
              data.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>{new Date(row.date).toLocaleString('en-GB')}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--brand-primary)' }}>{row.receiptNo}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>{row.customerName}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{row.products}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{row.routeName || '-'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: 'var(--bg-tertiary)' }}>
                      {row.paymentMode}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{row.collectedBy}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', textAlign: 'right', fontWeight: 600, color: 'var(--status-success)' }}>
                    Rs. {Number(row.amount).toLocaleString('en-GB')}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {row.balanceAfterReceipt != null ? `Rs. ${Number(row.balanceAfterReceipt).toLocaleString('en-GB')}` : '-'}
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
