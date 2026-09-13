import { useState, useEffect } from 'react';
import { printReportDocument } from '../../../lib/printReport';
import { apiClient } from '../../../lib/axios';
import { useBranchStore } from '../../../hooks/useBranchStore';
import { exportToExcel } from '../../../components/ReportExportButtons';
import { Loader2 } from 'lucide-react';

const getInitialRunningMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  const formatYYYYMMDD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    start: formatYYYYMMDD(start),
    end: formatYYYYMMDD(end),
  };
};

export function PayrollReportTab() {
  const { activeBranchId } = useBranchStore();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters - Default to Current Running Month (1st to Last Day)
  const initialMonth = getInitialRunningMonth();
  const [userId, setUserId] = useState('');
  const [startDate, setStartDate] = useState(initialMonth.start);
  const [endDate, setEndDate] = useState(initialMonth.end);
  
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const limit = 100;

  useEffect(() => {
    fetchUsers();
  }, [activeBranchId]);

  useEffect(() => {
    setPage(1);
  }, [userId, startDate, endDate, activeBranchId]);

  useEffect(() => {
    fetchReport();
  }, [userId, startDate, endDate, page, activeBranchId]);

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get('/users');
      setUsers(res.data.data || res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/reports/payroll', { 
        params: { userId, startDate, endDate, page, limit, branchId: activeBranchId } 
      });
      setData(res.data.data || []);
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
      const res = await apiClient.get('/reports/payroll/export', { 
        params: { userId, startDate, endDate, branchId: activeBranchId },
        responseType: 'blob' 
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Payroll_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.warn('Server export failed, falling back to client Excel export', err);
      const exportRows = data.map(r => ({
        'Staff Name': r.name,
        'Role': r.role,
        'Branch': r.branchName || '-',
        'Direct Sales Count': r.directSalesCount,
        'Direct Sales Revenue (Rs.)': r.directSalesAmount,
        'Installment Sales Count': r.installmentSalesCount,
        'Installment Downpayments (Rs.)': r.downpaymentsCollected,
        'Collections Count': r.receiptsCount,
        'Installment Collections (Rs.)': r.collectionsAmount,
        'Total Money Handled (Rs.)': r.totalMoneyHandled,
      }));
      exportToExcel(exportRows, 'Payroll_Report');
    }
  };

  const handlePrint = async () => {
    try {
      const userName = users.find(u => u.id === userId)?.name || 'All Staff';
      let printData = data;
      
      try {
        const res = await apiClient.get('/reports/payroll', { 
          params: { userId, startDate, endDate, branchId: activeBranchId } 
        });
        if (res.data?.data && res.data.data.length > 0) {
          printData = res.data.data;
        }
      } catch (e) {
        console.warn('Unpaginated print fetch failed, using current table data', e);
      }

      printReportDocument(
        "Staff Payroll & Collections Performance Report",
        `Date Range: ${startDate || 'Any'} to ${endDate || 'Any'} | Staff Filter: ${userName}`,
        [
          { header: "Staff Name", accessorKey: "name" },
          { header: "Role", accessorKey: "role" },
          { header: "Branch", accessorKey: "branchName", cell: (r: any) => r.branchName || '-' },
          { header: "Direct Sales Total", accessorKey: "directSalesAmount", cell: (r: any) => `Rs. ${Number(r.directSalesAmount || 0).toLocaleString('en-GB')}` },
          { header: "Downpayments Collected", accessorKey: "downpaymentsCollected", cell: (r: any) => `Rs. ${Number(r.downpaymentsCollected || 0).toLocaleString('en-GB')}` },
          { header: "Installment Collections", accessorKey: "collectionsAmount", cell: (r: any) => `Rs. ${Number(r.collectionsAmount || 0).toLocaleString('en-GB')}` },
          { header: "Total Money Handled", accessorKey: "totalMoneyHandled", cell: (r: any) => `Rs. ${Number(r.totalMoneyHandled || 0).toLocaleString('en-GB')}` },
        ],
        printData,
        { orientation: 'landscape' }
      );
    } catch (err) {
      console.error('Failed to print PDF', err);
    }
  };

  const grandTotalDirectSales = summary?.grandTotalDirectSales || 0;
  const grandTotalDownpayments = summary?.grandTotalDownpayments || 0;
  const grandTotalCollections = summary?.grandTotalCollections || 0;
  const grandTotalHandled = summary?.grandTotalHandled || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', height: '100%' }}>
      
      {/* Filters & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          
          <select 
            value={userId} 
            onChange={(e) => setUserId(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            <option value="">All Staff Members</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
            ))}
          </select>

          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          />

          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          />

          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => {
                const m = getInitialRunningMonth();
                setStartDate(m.start);
                setEndDate(m.end);
              }}
              style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--brand-primary)', cursor: 'pointer', fontWeight: 600 }}
            >
              This Month
            </button>
            <button
              onClick={() => {
                const now = new Date();
                const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                setStartDate(fmt(lastMonthStart));
                setEndDate(fmt(lastMonthEnd));
              }}
              style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              Last Month
            </button>
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              All Time
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
          <button 
            onClick={handleExport}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            Export Excel
          </button>
          <button 
            onClick={handlePrint}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--brand-primary)', color: '#fff', cursor: 'pointer' }}
          >
            Print PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-4)' }}>
        <div className="glass-panel" style={{ padding: 'var(--spacing-4)', borderRadius: 'var(--border-radius-md)' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Direct Sales Revenue</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3B82F6' }}>
            Rs. {grandTotalDirectSales.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 'var(--spacing-4)', borderRadius: 'var(--border-radius-md)' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Installment Downpayments</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
            Rs. {grandTotalDownpayments.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 'var(--spacing-4)', borderRadius: 'var(--border-radius-md)' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Installment Collections</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10B981' }}>
            Rs. {grandTotalCollections.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 'var(--spacing-4)', borderRadius: 'var(--border-radius-md)' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Money Handled</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Rs. {grandTotalHandled.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
              <th style={{ padding: '12px 16px' }}>Staff Member</th>
              <th style={{ padding: '12px 16px' }}>Role</th>
              <th style={{ padding: '12px 16px' }}>Branch</th>
              <th style={{ padding: '12px 16px' }}>Direct Sales (Count & Amount)</th>
              <th style={{ padding: '12px 16px' }}>Installment Downpayments</th>
              <th style={{ padding: '12px 16px' }}>Installment Collections</th>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>Total Money Handled</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Loading staff performance data...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No staff activity found for this period.</td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{row.name}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', background: 'var(--bg-tertiary)' }}>{row.role}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{row.branchName || '-'}</td>
                  
                  {/* Direct Sales */}
                  <td style={{ padding: '12px 16px', color: '#3B82F6', fontWeight: 500 }}>
                    {row.directSalesCount > 0 ? (
                      <div><strong>Rs. {Number(row.directSalesAmount || 0).toLocaleString('en-GB')}</strong> <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({row.directSalesCount} sales)</span></div>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>-</span>
                    )}
                  </td>

                  {/* Installment Downpayments */}
                  <td style={{ padding: '12px 16px', color: 'var(--brand-primary)', fontWeight: 500 }}>
                    {row.downpaymentsCollected > 0 ? (
                      <div><strong>Rs. {Number(row.downpaymentsCollected || 0).toLocaleString('en-GB')}</strong> <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({row.installmentSalesCount} sales)</span></div>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>-</span>
                    )}
                  </td>

                  {/* Installment Collections */}
                  <td style={{ padding: '12px 16px', color: '#10B981', fontWeight: 500 }}>
                    {row.collectionsAmount > 0 ? (
                      <div><strong>Rs. {Number(row.collectionsAmount || 0).toLocaleString('en-GB')}</strong> <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({row.receiptsCount} receipts)</span></div>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>-</span>
                    )}
                  </td>

                  {/* Total Money Handled */}
                  <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.95rem' }}>
                    Rs. {Number(row.totalMoneyHandled || 0).toLocaleString('en-GB')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px' }}>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Showing {data.length} of {total} staff members (100 per page)
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
          >
            Previous
          </button>
          <button 
            disabled={data.length < limit || page * limit >= total}
            onClick={() => setPage(p => p + 1)}
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', cursor: (data.length < limit || page * limit >= total) ? 'not-allowed' : 'pointer', opacity: (data.length < limit || page * limit >= total) ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
