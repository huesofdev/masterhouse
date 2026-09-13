import { useState, useEffect } from 'react';
import { printReportDocument } from '../../../lib/printReport';
import { ReportExportButtons } from '../../../components/ReportExportButtons';
import { apiClient } from '../../../lib/axios';

export function StockReportTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [brandId, setBrandId] = useState('');
  const [brands, setBrands] = useState<any[]>([]);
    
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const limit = 100;

  useEffect(() => {
    // Fetch Warehouses and Brands for filter
    apiClient.get('/warehouses').then(res => setWarehouses(res.data.data)).catch(console.error);
    apiClient.get('/catalog/brands').then(res => setBrands(res.data.data)).catch(console.error);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [warehouseId, brandId]);

  useEffect(() => {
    fetchReport();
  }, [warehouseId, brandId, page]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/reports/stock', { params: { warehouseId, brandId, page, limit } });
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
      
      const res = await apiClient.get('/reports/stock/export', { 
        params: { warehouseId, brandId },
        responseType: 'blob' 
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Stock_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
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
      const warehouseName = warehouses.find(w => w.id === warehouseId)?.name || 'All Warehouses';
      const brandName = brands.find(b => b.id === brandId)?.name || 'All Brands';
      
      // Fetch all unpaginated data for the PDF report
      const res = await apiClient.get('/reports/stock', { 
        params: { warehouseId, brandId } 
      });
      const fullData = res.data.data;

      printReportDocument(
        "Inventory Stock Report",
        `Warehouse: ${warehouseName} | Brand: ${brandName}`,
        [
          { header: "Product", accessorKey: "productName" },
          { header: "SKU", accessorKey: "sku" },
          { header: "Warehouse", accessorKey: "warehouseName" },
          { header: "Quantity", accessorKey: "quantity" },
          { header: "Avg Cost", accessorKey: "avgCost", cell: (r: any) => `Rs. ${Number(r.avgCost).toLocaleString('en-GB')}` },
          { header: "Total Worth", accessorKey: "totalWorth", cell: (r: any) => `Rs. ${Number(r.totalWorth).toLocaleString('en-GB')}` },
        ],
        fullData
      );
    } catch (err) {
      console.error('Failed to fetch full data for print', err);
    }
  };

  const totalWorth = summary?.totalWorth !== undefined ? summary.totalWorth : data.reduce((sum, item) => sum + Number(item.totalWorth || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', height: '100%' }}>
      
      {/* Filters & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
          <select 
            value={warehouseId} 
            onChange={(e) => setWarehouseId(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--border-radius-sm)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              minWidth: '200px'
            }}
          >
            <option value="">All Warehouses</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <select 
            value={brandId} 
            onChange={(e) => setBrandId(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--border-radius-sm)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              minWidth: '200px'
            }}
          >
            <option value="">All Brands</option>
            {brands.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <ReportExportButtons onPrint={handlePrint} onExportExcel={handleExport} />
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-4)' }}>
        <div className="glass-panel" style={{ padding: 'var(--spacing-4)', borderRadius: 'var(--border-radius-md)' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Stock Worth</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
            Rs. {totalWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: 'var(--spacing-4)', borderRadius: 'var(--border-radius-md)' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Items matching filter</div>
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
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Product</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>SKU</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Warehouse</th>
              <th style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Quantity</th>
              <th style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Avg Cost</th>
              <th style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem', borderBottom: '1px solid var(--border-color)' }}>Total Worth</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No data available</td></tr>
            ) : (
              data.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>{row.productName}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{row.sku}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>{row.warehouseName}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', textAlign: 'right', fontWeight: 500 }}>{row.quantity}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', textAlign: 'right' }}>Rs. {Number(row.avgCost).toLocaleString('en-GB')}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', textAlign: 'right', fontWeight: 600, color: 'var(--brand-primary)' }}>Rs. {Number(row.totalWorth).toLocaleString('en-GB')}</td>
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
