import { useState } from 'react';
import { Search, Download, Barcode, CheckCircle2, Truck, ShoppingCart, AlertCircle, User, Calendar, Building, CreditCard, Printer } from 'lucide-react';
import { apiClient } from '../../../lib/axios';
import { printReportDocument } from '../../../lib/printReport';

export function SerialLifecycleReportTab() {
  const [serialInput, setSerialInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const parsedSerials = [...new Set(serialInput.split(/[\n,\s]+/).map(s => s.trim()).filter(Boolean))];
  const count = parsedSerials.length;
  const isOverLimit = count > 50;
  const effectiveSerials = parsedSerials.slice(0, 50);

  const handleGenerateReport = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (effectiveSerials.length === 0) {
      setErrorMessage('Please enter at least 1 valid serial number.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/reports/serial-lifecycle', { serials: effectiveSerials });
      if (res.data?.success) {
        setReportData(res.data.data || []);
        setSummary(res.data.summary || null);
        setSuccessMessage(`Generated audit report for ${res.data.summary?.searched || 0} serial numbers.`);
      } else {
        setErrorMessage(res.data?.message || 'Failed to fetch serial lifecycle report.');
      }
    } catch (e: any) {
      console.error('Failed to fetch serial lifecycle report:', e);
      setErrorMessage(e.response?.data?.message || e.message || 'Error generating report.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (effectiveSerials.length === 0) {
      setErrorMessage('Please enter at least 1 valid serial number to export.');
      return;
    }

    setExporting(true);
    try {
      const response = await apiClient.post('/reports/serial-lifecycle/export', { serials: effectiveSerials }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Serial_Lifecycle_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setSuccessMessage('Excel report downloaded successfully.');
    } catch (e: any) {
      console.error('Failed to export Excel report:', e);
      setErrorMessage('Failed to export Excel file.');
    } finally {
      setExporting(false);
    }
  };

  const handlePrintPDFDocument = () => {
    if (!reportData || reportData.length === 0) {
      setErrorMessage('No report data available to print. Please click "Generate Audit Report" first.');
      return;
    }

    const columns = [
      { header: 'Serial Number', cell: (item: any) => item.serial_number },
      { header: 'Status', cell: (item: any) => item.status },
      { header: 'Product & SKU', cell: (item: any) => item.product ? `${item.product.name} (${item.product.sku})` : '-' },
      { header: 'Intake Supplier & Cost', cell: (item: any) => item.intake ? `${item.intake.supplier_name} (Rs. ${item.intake.unit_cost?.toLocaleString() || 0})` : '-' },
      { header: 'Seller & Customer', cell: (item: any) => item.sale ? `${item.sale.rep?.name || 'Rep'} -> ${item.sale.customer?.name || 'Walk-in'}` : '-' },
      { header: 'Contract Status', cell: (item: any) => item.installment ? item.installment.status : (item.sale ? 'DIRECT PAID' : '-') },
      { header: 'Contract Value', cell: (item: any) => item.installment ? `Rs. ${item.installment.total_contract_value.toLocaleString()}` : (item.sale ? `Rs. ${item.sale.total.toLocaleString()}` : '-') },
      { header: 'Downpayment', cell: (item: any) => item.installment ? `Rs. ${item.installment.downpayment_collected.toLocaleString()}` : (item.sale ? `Rs. ${item.sale.downpayment?.toLocaleString() || 0}` : '-') },
      { header: 'Terms Paid', cell: (item: any) => item.installment ? `${item.installment.paid_terms} / ${item.installment.total_terms}` : '-' },
      { header: 'Total Collected', cell: (item: any) => item.installment ? `Rs. ${item.installment.total_collected.toLocaleString()}` : (item.sale ? `Rs. ${item.sale.total.toLocaleString()}` : '-') },
      { header: 'Remaining Balance', cell: (item: any) => item.installment ? `Rs. ${item.installment.remaining_balance.toLocaleString()}` : 'Rs. 0.00' },
    ];

    const printData = filterStatus === 'ALL' ? reportData : reportData.filter(i => i.status === filterStatus);

    printReportDocument(
      'Serial Number Lifecycle Audit Report',
      `Serials: ${effectiveSerials.join(', ')}`,
      columns,
      printData,
      { orientation: 'landscape' }
    );
  };

  const filteredData = reportData.filter(item => {
    if (filterStatus === 'ALL') return true;
    return item.status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_STOCK':
        return <span className="badge badge-success"><CheckCircle2 size={12} style={{ marginRight: 4 }} /> In Stock</span>;
      case 'ON_TRIP':
        return <span className="badge badge-info"><Truck size={12} style={{ marginRight: 4 }} /> On Field Trip</span>;
      case 'SOLD':
        return <span className="badge badge-primary"><ShoppingCart size={12} style={{ marginRight: 4 }} /> Sold</span>;
      case 'NOT_FOUND':
        return <span className="badge badge-danger"><AlertCircle size={12} style={{ marginRight: 4 }} /> Not Found</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', height: '100%', overflowY: 'auto' }}>
      
      {/* Input Section */}
      <div className="glass-panel" style={{ padding: 'var(--spacing-4)', borderRadius: 'var(--border-radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-2)' }}>
          <label style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Barcode size={18} color="var(--brand-primary)" /> Enter Serial Numbers (Max 50)
          </label>
          <span style={{ 
            fontSize: '0.8rem', 
            fontWeight: 600, 
            padding: '2px 8px', 
            borderRadius: '12px', 
            backgroundColor: isOverLimit ? 'var(--color-danger-dim)' : 'var(--bg-tertiary)', 
            color: isOverLimit ? 'var(--color-danger)' : 'var(--text-secondary)' 
          }}>
            {count} / 50 serials entered
          </span>
        </div>

        {errorMessage && (
          <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--color-danger-dim)', color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={14} /> {errorMessage}
          </div>
        )}

        {successMessage && (
          <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'var(--color-success-dim)', color: 'var(--color-success)', fontSize: '0.85rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={14} /> {successMessage}
          </div>
        )}

        <textarea
          rows={3}
          value={serialInput}
          onChange={(e) => setSerialInput(e.target.value)}
          placeholder="Paste or type serial numbers here (separated by newlines, commas, or spaces)... e.g. SN100234, SN100235"
          style={{
            width: '100%',
            padding: 'var(--spacing-3)',
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            resize: 'vertical',
          }}
        />

        {isOverLimit && (
          <p style={{ margin: '6px 0 0 0', color: 'var(--color-warning)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertCircle size={14} /> Only the first 50 unique serial numbers will be searched.
          </p>
        )}

        <div style={{ display: 'flex', gap: 'var(--spacing-3)', marginTop: 'var(--spacing-3)' }}>
          <button
            className="btn btn-primary"
            onClick={handleGenerateReport}
            disabled={loading || count === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Search size={16} />
            {loading ? 'Searching Lifecycles...' : 'Generate Audit Report'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={handlePrintPDFDocument}
            disabled={reportData.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Printer size={16} />
            Print / PDF Document
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleExportExcel}
            disabled={exporting || count === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={16} />
            {exporting ? 'Exporting...' : 'Export to Excel'}
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--spacing-3)' }}>
          <div className="glass-panel" style={{ padding: 'var(--spacing-3)', borderRadius: 'var(--border-radius-md)', borderLeft: '4px solid var(--brand-primary)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL SEARCHED</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>{summary.searched}</div>
          </div>
          <div className="glass-panel" style={{ padding: 'var(--spacing-3)', borderRadius: 'var(--border-radius-md)', borderLeft: '4px solid var(--color-success)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>IN STOCK</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '2px' }}>{summary.inStock}</div>
          </div>
          <div className="glass-panel" style={{ padding: 'var(--spacing-3)', borderRadius: 'var(--border-radius-md)', borderLeft: '4px solid var(--color-info)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ON FIELD TRIP</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-info)', marginTop: '2px' }}>{summary.onTrip}</div>
          </div>
          <div className="glass-panel" style={{ padding: 'var(--spacing-3)', borderRadius: 'var(--border-radius-md)', borderLeft: '4px solid var(--brand-cta)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>SOLD</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--brand-cta)', marginTop: '2px' }}>{summary.sold}</div>
          </div>
          <div className="glass-panel" style={{ padding: 'var(--spacing-3)', borderRadius: 'var(--border-radius-md)', borderLeft: '4px solid var(--color-warning)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ACTIVE INSTALLMENTS</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: '2px' }}>{summary.activeInstallments}</div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      {reportData.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          {['ALL', 'IN_STOCK', 'ON_TRIP', 'SOLD', 'NOT_FOUND'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`btn ${filterStatus === st ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.8rem', padding: '4px 12px', borderRadius: '16px' }}
            >
              {st === 'ALL' ? 'All Results' : st.replace('_', ' ')} ({st === 'ALL' ? reportData.length : reportData.filter(i => i.status === st).length})
            </button>
          ))}
        </div>
      )}

      {/* Results List */}
      {filteredData.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
          {filteredData.map((item, idx) => (
            <div 
              key={item.serial_number + idx} 
              className="glass-panel"
              style={{ 
                padding: 'var(--spacing-4)', 
                borderRadius: 'var(--border-radius-lg)',
                borderLeft: `4px solid ${
                  item.status === 'IN_STOCK' ? 'var(--color-success)' :
                  item.status === 'ON_TRIP' ? 'var(--color-info)' :
                  item.status === 'SOLD' ? 'var(--brand-cta)' : 'var(--text-muted)'
                }`
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: 'var(--spacing-3)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {item.serial_number}
                    </span>
                    {getStatusBadge(item.status)}
                  </div>
                  {item.product && (
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {item.product.name} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>(SKU: {item.product.sku} | Brand: {item.product.brand})</span>
                    </div>
                  )}
                </div>

                {item.created_at && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} /> Registered: {new Date(item.created_at).toLocaleDateString()}
                  </div>
                )}
              </div>

              {item.status === 'NOT_FOUND' ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic' }}>
                  No serial number record found in database inventory.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-3)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--spacing-3)' }}>
                  
                  {/* Column 1: Intake & Warehouse Origin */}
                  <div style={{ backgroundColor: 'var(--bg-secondary)', padding: 'var(--spacing-3)', borderRadius: 'var(--border-radius-md)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Building size={14} /> Intake & Inventory Origin
                    </div>
                    <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary)' }}>
                      <div>Supplier: <strong style={{ color: 'var(--text-primary)' }}>{item.intake?.supplier_name || '-'}</strong></div>
                      <div>Intake Ref: <strong style={{ color: 'var(--text-primary)' }}>{item.intake?.intake_ref || '-'}</strong></div>
                      <div>Intake Date: <strong>{item.intake?.intake_date ? new Date(item.intake.intake_date).toLocaleDateString() : '-'}</strong></div>
                      <div>Unit Cost: <strong style={{ color: 'var(--text-primary)' }}>{item.intake?.unit_cost ? `Rs. ${item.intake.unit_cost.toLocaleString()}` : '-'}</strong></div>
                      <div>Current Warehouse: <strong style={{ color: 'var(--brand-primary)' }}>{item.intake?.warehouse_name || '-'}</strong></div>
                    </div>
                  </div>

                  {/* Column 2: Sale & Rep Info / Trip Assignment */}
                  <div style={{ backgroundColor: 'var(--bg-secondary)', padding: 'var(--spacing-3)', borderRadius: 'var(--border-radius-md)' }}>
                    {item.status === 'ON_TRIP' && item.active_trip ? (
                      <>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-info)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Truck size={14} /> Active Field Trip Assignment
                        </div>
                        <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary)' }}>
                          <div>Assigned Rep: <strong style={{ color: 'var(--text-primary)' }}>{item.active_trip.rep_name || 'Driver'}</strong></div>
                          <div>Vehicle Plate: <strong style={{ color: 'var(--color-info)' }}>{item.active_trip.license_plate || '-'}</strong></div>
                          <div>Trip Status: <strong>{item.active_trip.status}</strong></div>
                        </div>
                      </>
                    ) : item.sale ? (
                      <>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-cta)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={14} /> Sale & Customer Details
                        </div>
                        <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary)' }}>
                          <div>Invoice Ref: <strong style={{ color: 'var(--text-primary)' }}>{item.sale.reference_number || '-'}</strong></div>
                          <div>Seller Rep: <strong style={{ color: 'var(--brand-cta)' }}>{item.sale.rep?.name || '-'}</strong> ({item.sale.rep?.email})</div>
                          <div>Sale Date: <strong>{item.sale.sale_date ? new Date(item.sale.sale_date).toLocaleDateString() : '-'}</strong></div>
                          <div>Customer: <strong style={{ color: 'var(--text-primary)' }}>{item.sale.customer?.name || 'Walk-in'}</strong></div>
                          {item.sale.customer?.nic && <div>NIC: <strong>{item.sale.customer.nic}</strong> | Mobile: <strong>{item.sale.customer.mobile}</strong></div>}
                          {item.sale.trip && <div>Sold on Trip: <strong>{item.sale.trip.driver} ({item.sale.trip.vehicle})</strong></div>}
                        </div>
                      </>
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', paddingTop: '12px' }}>
                        Not yet sold. Available in inventory.
                      </div>
                    )}
                  </div>

                  {/* Column 3: Installment & Financial Progress */}
                  <div style={{ backgroundColor: 'var(--bg-secondary)', padding: 'var(--spacing-3)', borderRadius: 'var(--border-radius-md)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-warning)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CreditCard size={14} /> Financial & Installment Progress
                    </div>
                    {item.sale ? (
                      <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary)' }}>
                        <div>Sale Type: <strong style={{ color: 'var(--text-primary)' }}>{item.sale.sale_type}</strong> ({item.sale.payment_mode})</div>
                        {item.installment ? (
                          <>
                            <div>Scheme: <strong>{item.installment.scheme_name}</strong></div>
                            <div>Contract Status: <strong style={{ color: item.installment.status === 'ACTIVE' ? 'var(--color-warning)' : 'var(--color-success)' }}>{item.installment.status}</strong></div>
                            <div>Contract Value: <strong>Rs. {item.installment.total_contract_value.toLocaleString()}</strong></div>
                            <div>Initial Downpayment: <strong>Rs. {item.installment.downpayment_collected.toLocaleString()}</strong></div>
                            <div>Terms Paid: <strong style={{ color: 'var(--color-success)' }}>{item.installment.paid_terms} of {item.installment.total_terms} terms</strong></div>
                            <div>Total Collected: <strong style={{ color: 'var(--color-success)' }}>Rs. {item.installment.total_collected.toLocaleString()}</strong></div>
                            <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed var(--border-color)' }}>
                              Remaining Balance: <strong style={{ color: 'var(--color-warning)', fontSize: '0.9rem' }}>Rs. {item.installment.remaining_balance.toLocaleString()}</strong>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>Total Amount Paid: <strong style={{ color: 'var(--color-success)' }}>Rs. {item.sale.total.toLocaleString()}</strong></div>
                            <div style={{ color: 'var(--color-success)', fontWeight: 600, marginTop: '4px' }}>✓ Paid in Full (Direct Sale)</div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', paddingTop: '12px' }}>
                        No financial contract associated.
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          ))}
        </div>
      ) : summary && (
        <div style={{ padding: 'var(--spacing-6)', textAlign: 'center', color: 'var(--text-muted)' }}>
          No records match the selected filter status.
        </div>
      )}

    </div>
  );
}
