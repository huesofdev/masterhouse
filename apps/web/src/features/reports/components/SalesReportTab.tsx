import { useState, useEffect } from 'react';
import { printReportDocument } from '../../../lib/printReport';
import { ReportExportButtons } from '../../../components/ReportExportButtons';
import { apiClient } from '../../../lib/axios';

export function SalesReportTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [saleType, setSaleType] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userId, setUserId] = useState('');
  const [source, setSource] = useState('');
  const [routeId, setRouteId] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const limit = 100;

  useEffect(() => {
    setPage(1);
  }, [saleType, status, startDate, endDate, userId, source, routeId]);

  useEffect(() => {
    fetchFilterData();
    fetchReport();
  }, [saleType, status, startDate, endDate, userId, source, routeId, page]);

  const fetchFilterData = async () => {
    try {
      const [usersRes, routesRes] = await Promise.all([
        apiClient.get('/users'),
        apiClient.get('/routes')
      ]);
      setUsers(usersRes.data.data || usersRes.data || []);
      setRoutes(routesRes.data.data || routesRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/reports/sales', { 
        params: { saleType, status, startDate, endDate, userId, source, routeId, page, limit } 
      });
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
      
      const res = await apiClient.get('/reports/sales/export', { 
        params: { saleType, status, startDate, endDate, userId, source, routeId },
        responseType: 'blob' 
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Sales_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
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
      const userName = users.find(u => u.id === userId)?.name || 'All Users';
      const routeName = routes.find(r => r.id === routeId)?.name || 'All Routes';
      
      const res = await apiClient.get('/reports/sales', { 
        params: { routeId, userId, saleType, status, startDate, endDate } 
      });
      const fullData = res.data.data;

      printReportDocument(
        "Sales Report",
        `Date Range: ${startDate || 'Any'} to ${endDate || 'Any'} | Type: ${saleType || 'All'} | Status: ${status || 'All'} | User: ${userName} | Route: ${routeName}`,
        [
          { header: "Date", accessorKey: "date", cell: (r: any) => new Date(r.date).toLocaleDateString('en-GB') },
          { header: "Customer", accessorKey: "customerName", cell: (r: any) => r.customerName || 'Walk-in Customer' },
          { header: "Type", accessorKey: "saleType" },
          { header: "Products", accessorKey: "products" },
          { header: "Created By", accessorKey: "createdBy" },
          { header: "Total Value", accessorKey: "total", cell: (r: any) => `Rs. ${Number(r.total).toLocaleString('en-GB')}` },
          { header: "Received", accessorKey: "receivedAmount", cell: (r: any) => `Rs. ${Number(r.receivedAmount || 0).toLocaleString('en-GB')}` },
          { header: "Pending", accessorKey: "pendingAmount", cell: (r: any) => `Rs. ${Number(r.pendingAmount || 0).toLocaleString('en-GB')}` },
        ],
        fullData
      );
    } catch (err) {
      console.error('Failed to fetch full data for print', err);
    }
  };

  const totalSalesVolume = summary?.totalVolume !== undefined ? summary.totalVolume : data.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const totalDownpayments = summary?.totalDownpayments !== undefined ? summary.totalDownpayments : data.reduce((sum, item) => sum + Number(item.downpayment || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', height: '100%' }}>
      
      {/* Filters & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-3)', flexWrap: 'wrap' }}>
          
          <select 
            value={saleType} 
            onChange={(e) => setSaleType(e.target.value)}
            className="input-base"
            style={{ minWidth: '150px' }}
          >
            <option value="">All Types</option>
            <option value="DIRECT">Direct Sale</option>
            <option value="INSTALLMENT">Installment Sale</option>
          </select>

          <select 
            value={status} 
            onChange={(e) => setStatus(e.target.value)}
            className="input-base"
            style={{ minWidth: '150px' }}
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="RETURNED">Returned</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select 
            value={userId} 
            onChange={(e) => setUserId(e.target.value)}
            className="input-base"
            style={{ minWidth: '150px' }}
          >
            <option value="">All Users</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>

          <select 
            value={source} 
            onChange={(e) => setSource(e.target.value)}
            className="input-base"
            style={{ minWidth: '150px' }}
          >
            <option value="">All Sources</option>
            <option value="OFFICE">Office</option>
            <option value="TRIP">Trip</option>
          </select>

          <select 
            value={routeId} 
            onChange={(e) => setRouteId(e.target.value)}
            className="input-base"
            style={{ minWidth: '150px' }}
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
            className="input-base"
            title="Start Date"
          />
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)}
            className="input-base"
            title="End Date"
          />
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <ReportExportButtons onPrint={handlePrint} onExportExcel={handleExport} />
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-4)' }}>
        <div className="glass-panel" style={{ padding: 'var(--spacing-4)', borderRadius: 'var(--border-radius-md)' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Sales Volume</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
            Rs. {totalSalesVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: 'var(--spacing-4)', borderRadius: 'var(--border-radius-md)' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Downpayments Collected</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Rs. {totalDownpayments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: 'var(--spacing-4)', borderRadius: 'var(--border-radius-md)' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Sales Count (Filtered)</div>
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
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Customer</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Type</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Products</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Created By</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Status</th>
              <th style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Total Value</th>
              <th style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Received</th>
              <th style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Pending</th>
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
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>{new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>{row.customerName || 'Walk-in Customer'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                      <span>{row.saleType}</span>
                      {row.tripId ? (
                        <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                          TRIP
                        </span>
                      ) : (
                        <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: 'rgba(156, 163, 175, 0.1)', color: '#6b7280' }}>
                          OFFICE
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{row.products}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{row.createdBy}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '12px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600,
                      background: row.status === 'COMPLETED' ? 'rgba(34, 197, 94, 0.1)' : row.status === 'RETURNED' ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-tertiary)',
                      color: row.status === 'COMPLETED' ? 'var(--status-success)' : row.status === 'RETURNED' ? 'var(--status-warning)' : 'var(--text-secondary)'
                    }}>
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', textAlign: 'right', fontWeight: 600 }}>
                    Rs. {Number(row.total).toLocaleString('en-GB')}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', textAlign: 'right', fontWeight: 600, color: 'var(--status-success)' }}>
                    Rs. {Number(row.receivedAmount || 0).toLocaleString('en-GB')}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', textAlign: 'right', fontWeight: 600, color: row.pendingAmount > 0 ? 'var(--status-warning)' : 'var(--text-secondary)' }}>
                    Rs. {Number(row.pendingAmount || 0).toLocaleString('en-GB')}
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
