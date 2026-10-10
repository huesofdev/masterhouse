import { useState, useEffect } from 'react';
import { printReportDocument } from '../../../lib/printReport';
import { exportToExcel } from '../../../components/ReportExportButtons';
import { apiClient } from '../../../lib/axios';
import { useBranchStore } from '../../../hooks/useBranchStore';
import { Loader2, RotateCcw, ShoppingBag, FileText, Search, Filter } from 'lucide-react';

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

export function RefundsReportTab() {
  const { activeBranchId } = useBranchStore();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const initialMonth = getInitialRunningMonth();
  const [staffId, setStaffId] = useState('');
  const [channel, setChannel] = useState<'ALL' | 'DIRECT' | 'INSTALLMENT'>('ALL');
  const [refundMode, setRefundMode] = useState('ALL');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState(initialMonth.start);
  const [endDate, setEndDate] = useState(initialMonth.end);
  
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const limit = 50;

  useEffect(() => {
    fetchUsers();
  }, [activeBranchId]);

  useEffect(() => {
    setPage(1);
  }, [staffId, channel, refundMode, search, startDate, endDate, activeBranchId]);

  useEffect(() => {
    fetchReport();
  }, [staffId, channel, refundMode, search, startDate, endDate, page, activeBranchId]);

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
      const res = await apiClient.get('/reports/refunds', { 
        params: { 
          staffId: staffId || undefined, 
          channel: channel !== 'ALL' ? channel : undefined,
          refundMode: refundMode !== 'ALL' ? refundMode : undefined,
          search: search.trim() || undefined,
          startDate: startDate || undefined, 
          endDate: endDate || undefined, 
          page, 
          limit, 
          branchId: activeBranchId || undefined 
        } 
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
      const res = await apiClient.get('/reports/refunds/export', { 
        params: { 
          staffId: staffId || undefined, 
          channel: channel !== 'ALL' ? channel : undefined,
          refundMode: refundMode !== 'ALL' ? refundMode : undefined,
          search: search.trim() || undefined,
          startDate: startDate || undefined, 
          endDate: endDate || undefined, 
          branchId: activeBranchId || undefined 
        },
        responseType: 'blob' 
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Refunds_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.warn('Server export failed, falling back to client Excel export', err);
      const exportRows = data.map(r => ({
        'Date': new Date(r.created_at).toLocaleString('en-GB'),
        'Channel': r.channel,
        'Reference #': r.reference_no,
        'Customer Name': r.customer_name,
        'Customer Phone': r.customer_mobile,
        'Product / Item': r.product_name,
        'Serial Number': r.serial_number,
        'Sold By': r.sold_by_name,
        'Processed / Approved By': r.processed_by_name,
        'Reason / Remarks': r.reason,
        'Return Disposition': r.disposition,
        'Refund Mode': r.refund_mode,
        'Refund Amount (Rs.)': r.refund_amount,
        'Branch': r.branch_name,
      }));
      exportToExcel(exportRows, 'Refunds_Report');
    }
  };

  const handlePrint = async () => {
    try {
      const staffName = users.find(u => u.id === staffId)?.name || 'All Staff';
      let printData = data;
      
      try {
        const res = await apiClient.get('/reports/refunds', { 
          params: { 
            staffId: staffId || undefined, 
            channel: channel !== 'ALL' ? channel : undefined,
            refundMode: refundMode !== 'ALL' ? refundMode : undefined,
            search: search.trim() || undefined,
            startDate: startDate || undefined, 
            endDate: endDate || undefined, 
            branchId: activeBranchId || undefined,
            limit: 1000
          } 
        });
        if (res.data?.data && res.data.data.length > 0) {
          printData = res.data.data;
        }
      } catch (e) {
        console.warn('Unpaginated print fetch failed, using current table data', e);
      }

      printReportDocument(
        "Refunds & Returns Audit Report",
        `Date Range: ${startDate || 'Any'} to ${endDate || 'Any'} | Staff Filter: ${staffName} | Channel: ${channel}`,
        [
          { header: "Date", accessorKey: "created_at", cell: (r: any) => new Date(r.created_at).toLocaleDateString('en-GB') },
          { header: "Channel", accessorKey: "channel" },
          { header: "Ref #", accessorKey: "reference_no" },
          { header: "Customer", accessorKey: "customer_name", cell: (r: any) => `${r.customer_name} (${r.customer_mobile})` },
          { header: "Product / Item", accessorKey: "product_name" },
          { header: "Sold By", accessorKey: "sold_by_name" },
          { header: "Approved By", accessorKey: "processed_by_name" },
          { header: "Reason", accessorKey: "reason" },
          { header: "Mode", accessorKey: "refund_mode" },
          { header: "Refund Amount", accessorKey: "refund_amount", cell: (r: any) => `Rs. ${Number(r.refund_amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}` },
        ],
        printData,
        { orientation: 'landscape' }
      );
    } catch (err) {
      console.error('Failed to print PDF', err);
    }
  };

  const grandTotalRefunds = summary?.grandTotalRefunds || 0;
  const directRefundsTotal = summary?.directRefundsTotal || 0;
  const installmentRefundsTotal = summary?.installmentRefundsTotal || 0;
  const totalCount = summary?.totalCount || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', height: '100%' }}>
      
      {/* Top Filter Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
          
          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '220px', flex: 1, maxWidth: '320px' }}>
            <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search customer, ref #, serial, reason..." 
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px 8px 34px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '13px' }}
            />
          </div>

          {/* Staff Filter */}
          <select 
            value={staffId} 
            onChange={(e) => setStaffId(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '13px' }}
          >
            <option value="">All Staff Members (Sold / Approved)</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
            ))}
          </select>

          {/* Channel Filter */}
          <select 
            value={channel} 
            onChange={(e) => setChannel(e.target.value as any)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '13px' }}
          >
            <option value="ALL">All Channels</option>
            <option value="DIRECT">Direct Sales Returns</option>
            <option value="INSTALLMENT">Installment Contract Refunds</option>
          </select>

          {/* Refund Mode Filter */}
          <select 
            value={refundMode} 
            onChange={(e) => setRefundMode(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '13px' }}
          >
            <option value="ALL">All Payment Modes</option>
            <option value="CASH">Cash</option>
            <option value="STORE_CREDIT">Store Credit</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </select>

          {/* Date Range Inputs */}
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '13px' }}
          />

          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '13px' }}
          />

          {/* Quick Date Range Buttons */}
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

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={handleExport}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
          >
            Export Excel
          </button>
          <button 
            onClick={handlePrint}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--brand-primary)', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
          >
            Print PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RotateCcw size={16} color="var(--status-error)" /> Total Refunds Issued
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-error)' }}>
            Rs. {grandTotalRefunds.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {totalCount} total return transactions
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShoppingBag size={16} color="#3B82F6" /> Direct Sales Returns
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#3B82F6' }}>
            Rs. {directRefundsTotal.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {summary?.directCount || 0} items returned
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={16} color="var(--brand-primary)" /> Installment Refunds
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
            Rs. {installmentRefundsTotal.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {summary?.installmentCount || 0} contracts refunded / surrendered
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={16} color="#10B981" /> Active Filter Results
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#10B981' }}>
            {data.length} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ {total} records</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Showing page {page} of {Math.ceil(total / limit) || 1}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-primary)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
              <th style={{ padding: '12px 16px' }}>Date</th>
              <th style={{ padding: '12px 16px' }}>Channel</th>
              <th style={{ padding: '12px 16px' }}>Reference #</th>
              <th style={{ padding: '12px 16px' }}>Customer</th>
              <th style={{ padding: '12px 16px' }}>Product / Item</th>
              <th style={{ padding: '12px 16px' }}>Sold By</th>
              <th style={{ padding: '12px 16px' }}>Approved By</th>
              <th style={{ padding: '12px 16px' }}>Reason & Disposition</th>
              <th style={{ padding: '12px 16px' }}>Mode</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Refund Amount (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ padding: '2.5rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Loading refund data...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No refunds or returns found for the selected criteria.
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  {/* Date */}
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontSize: '13px' }}>
                    <div>{new Date(row.created_at).toLocaleDateString('en-GB')}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {new Date(row.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>

                  {/* Channel Badge */}
                  <td style={{ padding: '12px 16px' }}>
                    <span 
                      style={{ 
                        padding: '3px 8px', 
                        borderRadius: '4px', 
                        fontSize: '11px', 
                        fontWeight: 600,
                        background: row.channel === 'DIRECT' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                        color: row.channel === 'DIRECT' ? '#3b82f6' : 'var(--brand-primary)',
                        border: `1px solid ${row.channel === 'DIRECT' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`
                      }}
                    >
                      {row.channel}
                    </span>
                  </td>

                  {/* Reference # */}
                  <td style={{ padding: '12px 16px', fontWeight: 600, fontFamily: 'monospace', fontSize: '12px' }}>
                    {row.reference_no}
                  </td>

                  {/* Customer */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{row.customer_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {row.customer_mobile}
                    </div>
                  </td>

                  {/* Product / Item */}
                  <td style={{ padding: '12px 16px', maxWidth: '180px' }}>
                    <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.product_name}>
                      {row.product_name}
                    </div>
                    {row.serial_number && row.serial_number !== '-' && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        SN: {row.serial_number}
                      </div>
                    )}
                  </td>

                  {/* Sold By */}
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                    <div style={{ fontWeight: 500 }}>{row.sold_by_name}</div>
                  </td>

                  {/* Approved By */}
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                    <div style={{ fontWeight: 500 }}>{row.processed_by_name}</div>
                  </td>

                  {/* Reason & Disposition */}
                  <td style={{ padding: '12px 16px', maxWidth: '200px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.reason}>
                      {row.reason}
                    </div>
                    {row.disposition && (
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: '3px' }}>
                        {row.disposition}
                      </span>
                    )}
                  </td>

                  {/* Refund Mode */}
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '11px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontWeight: 500 }}>
                      {row.refund_mode}
                    </span>
                  </td>

                  {/* Refund Amount */}
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: '0.95rem', color: 'var(--status-error)' }}>
                    Rs. {Number(row.refund_amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Showing {data.length} of {total} records ({limit} per page)
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1, fontSize: '12px', fontWeight: 500 }}
          >
            Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Page {page} of {Math.ceil(total / limit) || 1}
          </span>
          <button 
            disabled={data.length < limit || page * limit >= total}
            onClick={() => setPage(p => p + 1)}
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', cursor: (data.length < limit || page * limit >= total) ? 'not-allowed' : 'pointer', opacity: (data.length < limit || page * limit >= total) ? 0.5 : 1, fontSize: '12px', fontWeight: 500 }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
