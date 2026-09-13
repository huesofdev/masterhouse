import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { exportToExcel, ReportExportButtons } from '../../../components/ReportExportButtons';
import { printReportDocument } from '../../../lib/printReport';
import { apiClient } from '../../../lib/axios';
import { useBranchStore } from '../../../hooks/useBranchStore';
import { useGetCategories } from '../../expenses/api';

export function ExpenseReportTab() {
  const [data, setData] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const activeBranchId = useBranchStore(s => s.activeBranchId);
  const { data: categories } = useGetCategories();

  useEffect(() => {
    fetchReport();
  }, [activeBranchId, startDate, endDate, categoryId]);

  const fetchReport = async () => {
    if (!activeBranchId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/reports/expenses', { 
        params: { branchId: activeBranchId, startDate, endDate, categoryId } 
      });
      setData(res.data.data);
      setTotalAmount(res.data.totalAmount);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const exportData = data.map(r => ({
      Date: new Date(r.date).toLocaleDateString('en-GB'),
      Category: r.categoryName,
      Description: r.description || '-',
      Amount: r.amount,
      'Added By': r.createdBy || 'Unknown'
    }));
    exportToExcel(exportData, "Expense_Report");
  };

  const handlePrint = async () => {
    try {
      const res = await apiClient.get('/reports/expenses', { 
        params: { startDate, endDate, branchId: activeBranchId, categoryId } 
      });
      const fullData = res.data.data;

      printReportDocument(
        "Expense Report",
        `Date Range: ${startDate || 'Any'} to ${endDate || 'Any'}`,
        [
          { header: "Date", accessorKey: "date", cell: (r: any) => new Date(r.date).toLocaleDateString('en-GB') },
          { header: "Category", accessorKey: "categoryName", cell: (r: any) => r.categoryName },
          { header: "Amount", accessorKey: "amount", cell: (r: any) => `Rs. ${Number(r.amount).toLocaleString()}` },
          { header: "Added By", accessorKey: "createdBy", cell: (r: any) => r.createdBy || 'Unknown' },
          { header: "Description", accessorKey: "description", cell: (r: any) => r.description || '-' },
        ],
        fullData
      );
    } catch (err) {
      console.error('Failed to fetch full data for print', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', height: '100%' }}>
      
      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--spacing-3)', alignItems: 'center' }}>
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
        <select 
          value={categoryId} 
          onChange={(e) => setCategoryId(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', minWidth: '150px' }}
        >
          <option value="">All Categories</option>
          {categories?.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div style={{ marginLeft: 'auto' }}>
          <ReportExportButtons onPrint={handlePrint} onExportExcel={handleExport} />
        </div>
      </div>

      <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Total Expenses for Period</h2>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--status-error)' }}>
          Rs. {Number(totalAmount).toLocaleString()}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}><Loader2 className="spin" size={24} style={{ display: 'inline' }}/> Loading...</div>
      ) : (
        <div style={{ overflowX: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>
              <tr>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>Category</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>Description</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>Added By</th>
                <th style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row: any) => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text-primary)' }}>{new Date(row.date).toLocaleDateString('en-GB')}</td>
                  <td style={{ padding: '12px', fontSize: '13px' }}>
                    <span style={{ padding: '4px 8px', background: 'var(--bg-tertiary)', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                      {row.categoryName}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>{row.description || '-'}</td>
                  <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>{row.createdBy}</td>
                  <td style={{ padding: '12px', fontSize: '13px', fontWeight: 600, textAlign: 'right', color: 'var(--text-primary)' }}>
                    Rs. {Number(row.amount).toLocaleString()}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No expenses found for the selected period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
