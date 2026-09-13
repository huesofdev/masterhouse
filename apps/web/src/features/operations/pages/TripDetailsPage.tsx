import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetTrip, useUpdateTripStatus, useUnloadTripStock, useCancelTrip, useGetTripSummary, useGetTripAgreements } from '../api';
import { ArrowLeft, Package, Truck, Calendar, MapPin, CheckCircle2, PackagePlus, Users, Route as RouteIcon, RefreshCw, Banknote, Printer, X, Map as MapIcon, FileText } from 'lucide-react';
import { PermissionGuard } from '../../../components/PermissionGuard';
import { useGetMapData } from '../../collections/api';
import { OperationsMap } from '../../collections/components/OperationsMap';
import { TripAgreementsModal } from '../components/TripAgreementsModal';
import { openTripAgreementsPrintWindow } from '../components/printTripAgreements';

function TripMapTab({ tripId }: { tripId: string }) {
  const [layers, setLayers] = useState({ customers: false, receipts: true, attempts: true, sales: true, routes: true });
  const { data, isLoading } = useGetMapData({ trip_id: tripId });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '600px' }}>
      <div style={{ display: 'flex', gap: '12px', background: 'var(--bg-primary)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
          <input type="checkbox" checked={layers.sales} onChange={e => setLayers({...layers, sales: e.target.checked})} />
          <span style={{ color: '#8B5CF6', fontWeight: 600 }}>Sales Checkouts</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
          <input type="checkbox" checked={layers.receipts} onChange={e => setLayers({...layers, receipts: e.target.checked})} />
          <span style={{ color: '#10B981', fontWeight: 600 }}>Receipt Collections</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
          <input type="checkbox" checked={layers.attempts} onChange={e => setLayers({...layers, attempts: e.target.checked})} />
          <span style={{ color: '#EF4444', fontWeight: 600 }}>Missed Collection Visits</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
          <input type="checkbox" checked={layers.routes} onChange={e => setLayers({...layers, routes: e.target.checked})} />
          <span style={{ color: '#3B82F6', fontWeight: 600 }}>GPS Breadcrumb Route</span>
        </label>
      </div>
      <OperationsMap data={data} isLoading={isLoading} layers={layers} />
    </div>
  );
}

export function TripDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'STOCK' | 'TRANSACTIONS' | 'MAP'>('STOCK');
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [startKmInput, setStartKmInput] = useState<string>('');
  const [showOdoEditModal, setShowOdoEditModal] = useState(false);
  const [endKmInput, setEndKmInput] = useState<string>('');
  const [showAgreementsModal, setShowAgreementsModal] = useState(false);
  const { data: trip, isLoading } = useGetTrip(id || '');
  const { data: summary } = useGetTripSummary(id || '');
  const { data: agreementsData } = useGetTripAgreements(id || '');
  const updateStatus = useUpdateTripStatus();
  const unloadStock = useUnloadTripStock();
  const cancelTrip = useCancelTrip();

  const groupedStock = useMemo(() => {
    if (!trip?.stock) return [];
    const map = new Map<string, any>();
    for (const item of trip.stock) {
      const key = item.product?.id || item.product_id;
      if (map.has(key)) {
        const existing = map.get(key);
        existing.loaded_qty += item.loaded_qty;
        existing.sold_qty += item.sold_qty;
        existing.returned_qty += item.returned_qty;
        if (item.serialItem) {
          existing.serialItems.push({ ...item.serialItem, stockId: item.id });
        }
      } else {
        map.set(key, {
          ...item,
          loaded_qty: item.loaded_qty,
          sold_qty: item.sold_qty,
          returned_qty: item.returned_qty,
          serialItems: item.serialItem ? [{ ...item.serialItem, stockId: item.id }] : []
        });
      }
    }
    return Array.from(map.values());
  }, [trip?.stock]);

  if (isLoading) return <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>Loading trip details...</div>;
  if (!trip) return <div style={{ padding: '24px', color: 'var(--status-error)' }}>Trip not found</div>;

  const handleCancelTrip = async () => {
    if (!window.confirm("CRITICAL WARNING:\n\nAre you sure you want to completely cancel this trip? All loaded stock will be reversed and returned to the warehouse. This action cannot be undone.")) return;
    try {
      await cancelTrip.mutateAsync(trip.id);
      alert('Trip cancelled successfully.');
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to cancel trip');
    }
  };

  const handlePrintManifest = () => {
    const html = `
      <html>
        <head>
          <title>Trip Manifest - ${trip.route?.name}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 10mm 12mm 10mm; }
            body { font-family: Arial, Helvetica, sans-serif; padding: 0; margin: 0; color: #0f172a; font-size: 11px; line-height: 1.35; background: #fff; }
            h1 { text-align: center; margin-bottom: 2px; margin-top: 0; font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
            .header-info { text-align: center; margin-bottom: 12px; color: #475569; font-size: 11px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
            .details-grid { display: flex; gap: 12px; margin-bottom: 12px; }
            .details-box { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; background: #f8fafc; }
            .details-box h3 { margin-top: 0; margin-bottom: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; color: #1e293b; }
            .details-row { margin-bottom: 3px; font-size: 10.5px; display: flex; justify-content: space-between; }
            .details-label { font-weight: 600; color: #64748b; }
            .details-value { font-weight: 700; color: #0f172a; }
            h3.section-title { font-size: 12px; font-weight: 800; color: #1e293b; margin: 12px 0 6px 0; text-transform: uppercase; letter-spacing: 0.3px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            th { background-color: #f1f5f9; color: #334155; font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px; padding: 4px 6px; border: 1px solid #cbd5e1; text-align: left; }
            td { border: 1px solid #e2e8f0; padding: 3.5px 6px; font-size: 10px; color: #1e293b; }
            tr:nth-child(even) td { background-color: #f8fafc; }
            .signatures { display: flex; justify-content: space-between; margin-top: 24px; page-break-inside: avoid; }
            .sig-box { width: 30%; text-align: center; }
            .sig-line { border-top: 1.5px solid #0f172a; margin-bottom: 4px; padding-top: 4px; font-weight: 800; font-size: 10.5px; }
          </style>
        </head>
        <body>
          <h1>Trip Stock Manifest</h1>
          <div class="header-info">
            Date: ${new Date(trip.planned_date).toLocaleDateString('en-GB')} &nbsp;|&nbsp; Type: ${trip.type} &nbsp;|&nbsp; Status: ${trip.status}
          </div>

          <div class="details-grid">
            <div class="details-box">
              <h3>Route & Vehicle</h3>
              <div class="details-row"><span class="details-label">Route:</span> <span class="details-value">${trip.route?.name}</span></div>
              <div class="details-row"><span class="details-label">Vehicle:</span> <span class="details-value">${trip.vehicle?.license_plate || 'N/A'}${trip.vehicle?.model ? ` (${trip.vehicle.model})` : ''}</span></div>
            </div>
            <div class="details-box">
              <h3>Team</h3>
              <div class="details-row"><span class="details-label">In-Charge:</span> <span class="details-value">${trip.incharge?.name || 'N/A'}</span></div>
              <div class="details-row"><span class="details-label">Staff:</span> <span class="details-value">${trip.staff?.map((s: any) => s.user?.name).join(', ') || 'None'}</span></div>
            </div>
          </div>

          <h3 class="section-title">Loaded Stock List</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 35px;">No.</th>
                <th>Product Name</th>
                <th>SKU</th>
                <th>Serial / Type</th>
                <th style="text-align: right; width: 80px;">Loaded Qty</th>
              </tr>
            </thead>
            <tbody>
              ${groupedStock.length === 0 ? '<tr><td colspan="5" style="text-align: center;">No stock loaded</td></tr>' : 
                groupedStock.map((item: any, i: number) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td><strong>${item.product?.name}</strong></td>
                    <td>${item.product?.sku}</td>
                    <td style="font-family: monospace;">${item.serialItems && item.serialItems.length > 0 ? item.serialItems.map((s: any) => s.serial_number).join(', ') : 'BULK'}</td>
                    <td style="font-weight: bold; text-align: right;">${item.loaded_qty}</td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>

          <div class="signatures">
            <div class="sig-box">
              <div class="sig-line">In-Charge Signature</div>
              <div style="font-size: 11px; color: #64748b;">${trip.incharge?.name || '____________________'}</div>
            </div>
            <div class="sig-box">
              <div class="sig-line">Dispatcher Signature</div>
              <div style="font-size: 11px; color: #64748b;">Warehouse Manager</div>
            </div>
            <div class="sig-box">
              <div class="sig-line">Security Check</div>
              <div style="font-size: 11px; color: #64748b;">Gate Security</div>
            </div>
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

  const handlePrintTripReport = () => {
    if (!summary) return;
    const html = `
      <html>
        <head>
          <title>End of Trip Report - ${trip.route?.name}</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 10mm 12mm 10mm; }
            body { font-family: Arial, Helvetica, sans-serif; padding: 0; margin: 0; color: #0f172a; font-size: 11px; line-height: 1.35; background: #fff; }
            h1 { text-align: center; margin-bottom: 2px; margin-top: 0; font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
            .header-info { text-align: center; margin-bottom: 12px; color: #475569; font-size: 11px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
            .details-grid { display: flex; gap: 12px; margin-bottom: 12px; }
            .details-box { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; background: #f8fafc; }
            .details-box h3 { margin-top: 0; margin-bottom: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; color: #1e293b; }
            .details-row { margin-bottom: 3px; font-size: 10.5px; display: flex; justify-content: space-between; }
            .details-label { font-weight: 600; color: #64748b; }
            .details-value { font-weight: 700; color: #0f172a; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; page-break-inside: avoid; }
            .summary-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; text-align: center; background: #f8fafc; }
            .summary-card .label { font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px; }
            .summary-card .val { font-size: 14px; font-weight: 800; color: #0f172a; }
            h3.section-title { font-size: 12px; font-weight: 800; color: #1e293b; margin: 14px 0 6px 0; text-transform: uppercase; letter-spacing: 0.3px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; page-break-inside: avoid; }
            th { background-color: #f1f5f9; color: #334155; font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px; padding: 4px 6px; border: 1px solid #cbd5e1; text-align: left; }
            td { border: 1px solid #e2e8f0; padding: 3.5px 6px; font-size: 10px; color: #1e293b; }
            tr:nth-child(even) td { background-color: #f8fafc; }
            .table-total { margin-top: 4px; margin-bottom: 12px; display: flex; justify-content: flex-end; gap: 20px; font-size: 10.5px; font-weight: 800; color: #0f172a; page-break-inside: avoid; }
            .signatures { display: flex; justify-content: space-between; margin-top: 24px; page-break-inside: avoid; }
            .sig-box { width: 45%; text-align: center; }
            .sig-line { border-top: 1.5px solid #0f172a; margin-bottom: 4px; padding-top: 4px; font-weight: 800; font-size: 10.5px; }
          </style>
        </head>
        <body>
          <h1>End of Trip Reconciliation Report</h1>
          <div class="header-info">
            Date: ${new Date(trip.planned_date).toLocaleDateString('en-GB')} &nbsp;|&nbsp; Type: ${trip.type} &nbsp;|&nbsp; Status: ${trip.status}
          </div>

          <div class="details-grid">
            <div class="details-box">
              <h3>Route & Vehicle Details</h3>
              <div class="details-row"><span class="details-label">Route:</span> <span class="details-value">${trip.route?.name}</span></div>
              <div class="details-row"><span class="details-label">Vehicle:</span> <span class="details-value">${trip.vehicle?.license_plate || 'N/A'}${trip.vehicle?.model ? ` (${trip.vehicle.model})` : ''}</span></div>
              ${trip.start_km !== null && trip.start_km !== undefined ? `<div class="details-row"><span class="details-label">Start Odometer:</span> <span class="details-value">${trip.start_km} km</span></div>` : ''}
              ${trip.end_km !== null && trip.end_km !== undefined ? `<div class="details-row"><span class="details-label">End Odometer:</span> <span class="details-value">${trip.end_km} km</span></div>` : ''}
              ${trip.start_km !== null && trip.start_km !== undefined && trip.end_km !== null && trip.end_km !== undefined ? `<div class="details-row"><span class="details-label">Distance Driven:</span> <span class="details-value">${trip.end_km - trip.start_km} km</span></div>` : ''}
            </div>
            <div class="details-box">
              <h3>Team Information</h3>
              <div class="details-row"><span class="details-label">In-Charge:</span> <span class="details-value">${trip.incharge?.name || 'N/A'}</span></div>
              <div class="details-row"><span class="details-label">Assigned Staff:</span> <span class="details-value">${trip.staff?.map((s: any) => s.user?.name).join(', ') || 'None'}</span></div>
            </div>
          </div>

          <div class="summary-grid">
            <div class="summary-card">
              <div class="label">Direct Sales Cash</div>
              <div class="val">Rs. ${summary.totals.salesCash.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div class="summary-card">
              <div class="label">Collections Cash</div>
              <div class="val">Rs. ${summary.totals.collectionsCash.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div class="summary-card">
              <div class="label">Bookings Cash</div>
              <div class="val">Rs. ${summary.totals.preOrdersCash.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div class="summary-card" style="background: #eff6ff; border-color: #93c5fd;">
              <div class="label" style="color: #1e40af;">Total Expected Cash</div>
              <div class="val" style="color: #1e3a8a;">Rs. ${summary.totals.expectedCash.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </div>

          <h3 class="section-title">Stock Reconciliation</h3>
          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Serial Numbers / Type</th>
                <th style="text-align: right; width: 65px;">Loaded</th>
                <th style="text-align: right; width: 65px;">Sold</th>
                <th style="text-align: right; width: 65px;">Returned</th>
              </tr>
            </thead>
            <tbody>
              ${groupedStock.length === 0 ? '<tr><td colspan="5" style="text-align: center;">No stock loaded</td></tr>' : 
                groupedStock.map((item: any) => `
                  <tr>
                    <td><strong>${item.product?.name}</strong></td>
                    <td style="font-family: monospace;">${item.serialItems && item.serialItems.length > 0 ? item.serialItems.map((s: any) => s.serial_number).join(', ') : 'BULK'}</td>
                    <td style="text-align: right;">${item.loaded_qty}</td>
                    <td style="text-align: right;">${item.sold_qty}</td>
                    <td style="text-align: right;">${item.returned_qty}</td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>

          <h3 class="section-title">Direct Sales Transactions</h3>
          ${(() => {
            const directSales = summary.sales?.filter((s: any) => s.sale_type === 'DIRECT') || [];
            if (directSales.length === 0) return '<p style="font-style: italic; color: #64748b; font-size: 10px; margin-bottom: 10px;">No direct sales made during this trip.</p>';
            
            const totalInvoice = directSales.reduce((acc: number, s: any) => acc + Number(s.total || 0) + Number(s.advance_deduction || 0), 0);
            const totalCash = directSales.reduce((acc: number, s: any) => acc + Number(s.cash_collected || 0), 0);
            
            let html = `
              <table>
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Customer</th>
                    <th>Payment Mode</th>
                    <th style="text-align: right;">Product Amount</th>
                    <th style="text-align: right;">Cash Collected</th>
                  </tr>
                </thead>
                <tbody>
            `;
            
            directSales.forEach((s: any) => {
              const prodAmt = Number(s.total || 0) + Number(s.advance_deduction || 0);
              html += `
                <tr>
                  <td>${new Date(s.created_at).toLocaleString('en-GB')}</td>
                  <td>
                    <strong>${s.customer_name || 'Walk-in'}</strong>
                    ${s.product_summary ? `<div style="font-size: 9px; color: #64748b; margin-top: 1px;">${s.product_summary}</div>` : ''}
                  </td>
                  <td>${s.payment_mode}</td>
                  <td style="text-align: right;">Rs. ${prodAmt.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style="text-align: right; font-weight: bold;">Rs. ${Number(s.cash_collected || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `;
            });
            
            html += `
                </tbody>
              </table>
              <div class="table-total">
                <div>Total Product Amount: Rs. ${totalInvoice.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div>Total Cash Collected: Rs. ${totalCash.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            `;
            return html;
          })()}

          <h3 class="section-title">Installment Sales Transactions</h3>
          ${(() => {
            const installmentSales = summary.sales?.filter((s: any) => s.sale_type === 'INSTALLMENT') || [];
            if (installmentSales.length === 0) return '<p style="font-style: italic; color: #64748b; font-size: 10px; margin-bottom: 10px;">No installment sales made during this trip.</p>';
            
            const totalInvoice = installmentSales.reduce((acc: number, s: any) => acc + Number(s.total || 0), 0);
            const totalDp = installmentSales.reduce((acc: number, s: any) => acc + Number(s.downpayment || 0), 0);
            const totalCash = installmentSales.reduce((acc: number, s: any) => acc + Number(s.cash_collected || 0), 0);
            
            let html = `
              <table>
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Customer</th>
                    <th>Payment Mode</th>
                    <th style="text-align: right;">Product Amount</th>
                    <th style="text-align: right;">Total Downpayment</th>
                    <th style="text-align: right;">Cash Collected Today</th>
                  </tr>
                </thead>
                <tbody>
            `;
            
            installmentSales.forEach((s: any) => {
              html += `
                <tr>
                  <td>${new Date(s.created_at).toLocaleString('en-GB')}</td>
                  <td>
                    <strong>${s.customer_name || 'Walk-in'}</strong>
                    ${s.product_summary ? `<div style="font-size: 9px; color: #64748b; margin-top: 1px;">${s.product_summary}</div>` : ''}
                  </td>
                  <td>${s.payment_mode}</td>
                  <td style="text-align: right;">Rs. ${Number(s.total || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style="text-align: right;">Rs. ${Number(s.downpayment || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style="text-align: right; font-weight: bold;">Rs. ${Number(s.cash_collected || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `;
            });
            
            html += `
                </tbody>
              </table>
              <div class="table-total">
                <div>Total Product Amount: Rs. ${totalInvoice.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div>Total Downpayment: Rs. ${totalDp.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div>Total Cash Collected: Rs. ${totalCash.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            `;
            return html;
          })()}

          <h3 class="section-title">Collections</h3>
          ${(() => {
            const collections = summary.collections || [];
            if (collections.length === 0) return '<p style="font-style: italic; color: #64748b; font-size: 10px; margin-bottom: 10px;">No collections recorded.</p>';
            
            const totalCash = collections.reduce((acc: number, c: any) => acc + Number(c.amount || 0), 0);
            
            let html = `
              <table>
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Receipt No</th>
                    <th>Customer</th>
                    <th>Method</th>
                    <th style="text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
            `;
            
            collections.forEach((c: any) => {
              html += `
                <tr>
                  <td>${new Date(c.created_at).toLocaleString('en-GB')}</td>
                  <td style="font-family: monospace;">${c.receipt_no}</td>
                  <td>${c.customer_name || 'N/A'}</td>
                  <td>${c.payment_mode}</td>
                  <td style="text-align: right; font-weight: bold;">Rs. ${Number(c.amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `;
            });
            
            html += `
                </tbody>
              </table>
              <div class="table-total">
                <div>Total Collections: Rs. ${totalCash.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            `;
            return html;
          })()}

          <h3 class="section-title">Bookings (Advance Payments)</h3>
          ${(() => {
            const preOrders = summary.preOrders || [];
            if (preOrders.length === 0) return '<p style="font-style: italic; color: #64748b; font-size: 10px; margin-bottom: 10px;">No bookings recorded.</p>';
            
            const totalCash = preOrders.reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);
            
            let html = `
              <table>
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Booking No</th>
                    <th>Customer</th>
                    <th>Method</th>
                    <th style="text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
            `;
            
            preOrders.forEach((p: any) => {
              html += `
                <tr>
                  <td>${new Date(p.created_at).toLocaleString('en-GB')}</td>
                  <td style="font-family: monospace;">${p.receipt_no}</td>
                  <td>${p.customer_name || 'Walk-in'}</td>
                  <td>${p.payment_mode}</td>
                  <td style="text-align: right; font-weight: bold;">Rs. ${Number(p.amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `;
            });
            
            html += `
                </tbody>
              </table>
              <div class="table-total">
                <div>Total Booking Cash Collected: Rs. ${totalCash.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            `;
            return html;
          })()}

          ${summary.discrepancies && summary.discrepancies.length > 0 ? `
            <div style="margin-top: 14px; border: 1px solid #f87171; border-radius: 6px; padding: 10px; background-color: #fef2f2; page-break-inside: avoid;">
              <h3 style="color: #991b1b; margin-top: 0; margin-bottom: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase;">Trip Discrepancies (Shortages / Excess)</h3>
              <table style="border-color: #fca5a5; margin-bottom: 0;">
                <thead>
                  <tr>
                    <th style="background-color: #fee2e2; color: #991b1b; border-color: #fca5a5;">Type</th>
                    <th style="background-color: #fee2e2; color: #991b1b; border-color: #fca5a5;">Description</th>
                    <th style="background-color: #fee2e2; color: #991b1b; border-color: #fca5a5;">Expected</th>
                    <th style="background-color: #fee2e2; color: #991b1b; border-color: #fca5a5;">Actual</th>
                  </tr>
                </thead>
                <tbody>
                  ${summary.discrepancies.map((d: any) => `
                    <tr>
                      <td style="border-color: #fca5a5; font-weight: bold; color: ${d.type.includes('SHORTAGE') || d.type.includes('MISSING') ? '#b91c1c' : '#15803d'};">${d.type.replace('_', ' ')}</td>
                      <td style="border-color: #fca5a5;">${d.description}</td>
                      <td style="border-color: #fca5a5;">${d.expected_value}</td>
                      <td style="border-color: #fca5a5;">${d.actual_value}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          <div class="signatures">
            <div class="sig-box">
              <div class="sig-line">In-Charge Signature</div>
              <div style="font-size: 11px; color: #64748b;">${trip.incharge?.name || '____________________'}</div>
            </div>
            <div class="sig-box">
              <div class="sig-line">Cashier Signature</div>
              <div style="font-size: 11px; color: #64748b;">Branch Cashier</div>
            </div>
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

  const handleUpdateStatus = async (status: string) => {
    try {
      await updateStatus.mutateAsync({ tripId: trip.id, status });
    } catch (e) {
      alert('Failed to update status');
    }
  };

  const handleUnloadItem = async (stockId: string) => {
    if (!window.confirm("Are you sure you want to unload this item back to the warehouse?")) return;
    try {
      await unloadStock.mutateAsync({ tripId: trip.id, stockId });
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to unload item');
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'PLANNED') return '#3b82f6';
    if (status === 'LOADING') return '#f59e0b';
    if (status === 'DEPARTED' || status === 'IN_PROGRESS') return '#8b5cf6';
    if (status === 'RECONCILING') return '#ec4899';
    if (status === 'CLOSED') return '#10b981';
    if (status === 'CANCELLED') return '#ef4444';
    return 'var(--text-primary)';
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: flex !important; }
          body { background: white; color: black; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <button 
        className="no-print"
        onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '24px', fontWeight: 600 }}
      >
        <ArrowLeft size={18} /> Back to Trips
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            Trip Details
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: `${getStatusColor(trip.status)}20`, color: getStatusColor(trip.status), border: `1px solid ${getStatusColor(trip.status)}40` }}>
              {trip.status}
            </span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={15}/> {new Date(trip.planned_date).toLocaleDateString('en-GB')}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={15}/> {trip.type} Trip</span>
          </p>
        </div>
        
        {/* Action Toolbar */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end' }}>
          {/* Document Actions */}
          {(trip.status === 'PLANNED' || trip.status === 'LOADING' || trip.status === 'DEPARTED') && (
            <button 
              onClick={handlePrintManifest}
              style={{ padding: '8px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Printer size={16} /> Print Manifest
            </button>
          )}
          {(trip.status === 'CLOSED' || trip.status === 'CLOSED_WITH_DISCREPANCIES' || trip.status === 'ENDED' || trip.status === 'RECONCILING') && (
            <button 
              onClick={handlePrintTripReport}
              style={{ padding: '8px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Printer size={16} /> Print Report
            </button>
          )}
          {agreementsData && agreementsData.agreements.length > 0 && (
            <button 
              onClick={() => openTripAgreementsPrintWindow(agreementsData)}
              style={{ 
                padding: '8px 14px', background: 'rgba(217, 119, 6, 0.12)', color: 'var(--brand-primary)', 
                border: '1px solid rgba(217, 119, 6, 0.3)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', 
                display: 'inline-flex', alignItems: 'center', gap: '6px'
              }}
              title="Print / Download legal installment agreements for this trip"
            >
              <FileText size={16} /> Agreements ({agreementsData.agreements.length})
            </button>
          )}

          {/* Operation & Workflow Actions */}
          {trip.status === 'LOADING' && trip.type !== 'COLLECTION' && (
            <button 
              onClick={() => navigate(`/trips/${trip.id}/load`)} 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--brand-primary)', color: 'var(--brand-primary)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              <PackagePlus size={16}/> Load Van
            </button>
          )}
          {(trip.status === 'IN_PROGRESS' || trip.status === 'DEPARTED') && trip.type !== 'COLLECTION' && (
            <button 
              onClick={() => navigate(`/trips/${trip.id}/load`)} 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--status-warning)', color: 'var(--status-warning)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              <PackagePlus size={16} /> Add Stock
            </button>
          )}
          {trip.status === 'PLANNED' && trip.type !== 'COLLECTION' && (
            <button 
              onClick={() => handleUpdateStatus('LOADING')} 
              style={{ padding: '8px 16px', background: 'var(--status-warning)', border: 'none', color: 'white', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <PackagePlus size={16} /> Start Loading
            </button>
          )}
          {((trip.status === 'PLANNED' && trip.type === 'COLLECTION') || trip.status === 'LOADING') && (
            <button 
              onClick={() => { setStartKmInput(trip.last_vehicle_end_km !== null && trip.last_vehicle_end_km !== undefined ? trip.last_vehicle_end_km.toString() : ''); setShowDispatchModal(true); }} 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--brand-primary)', border: 'none', color: 'white', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(217, 119, 6, 0.25)' }}
            >
              <Truck size={16}/> Dispatch
            </button>
          )}
          {trip.status === 'RECONCILING' && (
            <button 
              onClick={() => navigate(`/trips/${trip.id}/reconcile`)} 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--brand-primary)', border: 'none', color: 'white', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(217, 119, 6, 0.25)' }}
            >
              <CheckCircle2 size={16}/> Reconcile
            </button>
          )}

          {/* Admin / Danger Actions */}
          {(trip.status === 'IN_PROGRESS' || trip.status === 'DEPARTED') && (
            <PermissionGuard permission="trips:force_end" behavior="hide">
              <button 
                onClick={() => {
                  if (window.confirm("WARNING: The rep has not ended this trip on their mobile app yet. Are you sure you want to FORCE END this trip and bypass the rep?")) {
                    handleUpdateStatus('RECONCILING');
                  }
                }} 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--status-error)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                title="Only use if the rep cannot end the trip from their phone"
              >
                <CheckCircle2 size={16} /> Force End
              </button>
            </PermissionGuard>
          )}
          {(trip.status === 'PLANNED' || trip.status === 'LOADING' || trip.status === 'DEPARTED') && (
            <button 
              onClick={handleCancelTrip}
              disabled={cancelTrip.isPending} 
              style={{ padding: '8px 12px', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--status-error)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <X size={15} /> {cancelTrip.isPending ? 'Cancelling...' : 'Cancel Trip'}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><RouteIcon size={18}/> Route & Vehicle</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
            <div><span style={{ color: 'var(--text-secondary)' }}>Route:</span> <span style={{ fontWeight: 600 }}>{trip.route?.name}</span></div>
            <div><span style={{ color: 'var(--text-secondary)' }}>Destinations:</span> {trip.route?.destinations}</div>
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}><span style={{ color: 'var(--text-secondary)' }}>Vehicle:</span> <span style={{ fontWeight: 600 }}>{trip.vehicle?.license_plate || 'N/A'}</span>{trip.vehicle?.model ? ` (${trip.vehicle.model})` : ''}</div>
            {trip.status !== 'CANCELLED' && (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Odometer Readings:</span>
                  {trip.status !== 'CLOSED' && trip.status !== 'CLOSED_WITH_DISCREPANCIES' && (
                    <button 
                      onClick={() => {
                        setStartKmInput(trip.start_km !== null && trip.start_km !== undefined ? trip.start_km.toString() : (trip.last_vehicle_end_km !== null && trip.last_vehicle_end_km !== undefined ? trip.last_vehicle_end_km.toString() : ''));
                        setEndKmInput(trip.end_km !== null && trip.end_km !== undefined ? trip.end_km.toString() : '');
                        setShowOdoEditModal(true);
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: '2px 6px', borderRadius: '4px' }}
                    >
                      Edit
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                  <div>Start: <strong style={{ color: 'var(--text-primary)' }}>{trip.start_km !== null && trip.start_km !== undefined ? `${trip.start_km} km` : 'N/A'}</strong></div>
                  {trip.status !== 'PLANNED' && trip.status !== 'LOADING' && (
                    <div>End: <strong style={{ color: 'var(--text-primary)' }}>{trip.end_km !== null && trip.end_km !== undefined ? `${trip.end_km} km` : 'N/A'}</strong></div>
                  )}
                  {trip.start_km !== null && trip.start_km !== undefined && trip.end_km !== null && trip.end_km !== undefined && (
                    <div>Run KMs: <strong style={{ color: 'var(--brand-primary)' }}>{trip.end_km - trip.start_km} km</strong></div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={18}/> Team</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
            <div><span style={{ color: 'var(--text-secondary)' }}>In-Charge:</span> <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>{trip.incharge?.name}</span></div>
            {trip.staff && trip.staff.length > 0 && (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Additional Staff:</span>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                  {trip.staff.map((s: any) => (
                    <li key={s.user_id}>
                      <span style={{ fontWeight: 500 }}>{s.user?.name}</span> <span style={{ color: 'var(--text-secondary)' }}>({s.duty})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        <div className="no-print" style={{ display: 'flex', gap: '16px', marginBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
          <button 
            onClick={() => setActiveTab('STOCK')}
            style={{ background: 'none', border: 'none', padding: '12px 16px', fontWeight: 600, fontSize: '15px', cursor: 'pointer', borderBottom: activeTab === 'STOCK' ? '2px solid var(--brand-primary)' : '2px solid transparent', color: activeTab === 'STOCK' ? 'var(--brand-primary)' : 'var(--text-secondary)' }}
          >
            <Package size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }}/> Loaded Stock
          </button>
          <button 
            onClick={() => setActiveTab('TRANSACTIONS')}
            style={{ background: 'none', border: 'none', padding: '12px 16px', fontWeight: 600, fontSize: '15px', cursor: 'pointer', borderBottom: activeTab === 'TRANSACTIONS' ? '2px solid var(--brand-primary)' : '2px solid transparent', color: activeTab === 'TRANSACTIONS' ? 'var(--brand-primary)' : 'var(--text-secondary)' }}
          >
            <Banknote size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }}/> Transactions & Cash
          </button>
          <button 
            onClick={() => setActiveTab('MAP')}
            style={{ background: 'none', border: 'none', padding: '12px 16px', fontWeight: 600, fontSize: '15px', cursor: 'pointer', borderBottom: activeTab === 'MAP' ? '2px solid var(--brand-primary)' : '2px solid transparent', color: activeTab === 'MAP' ? 'var(--brand-primary)' : 'var(--text-secondary)' }}
          >
            <MapIcon size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }}/> Map View
          </button>
        </div>

        {activeTab === 'STOCK' && (
        <div style={{ background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>Loaded Stock</h3>
          </div>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-tertiary)', zIndex: 1 }}>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Product</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Serial / Type</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Loaded Qty</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Sold Qty</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Returned Qty</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Status</th>
                  <th className="no-print" style={{ padding: '12px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedStock.length === 0 ? (
                   <tr><td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No stock loaded yet.</td></tr>
                ) : (
                  groupedStock.map((item: any) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '14px' }}>
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ fontWeight: 600 }}>{item.product?.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>SKU: {item.product?.sku}</div>
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        {item.serialItems && item.serialItems.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '250px' }}>
                            {item.serialItems.map((s: any) => (
                              <span 
                                key={s.id} 
                                style={{ 
                                  fontSize: '11px', 
                                  color: 'var(--text-primary)', 
                                  fontFamily: 'monospace', 
                                  padding: '2px 6px', 
                                  background: 'var(--bg-tertiary)', 
                                  borderRadius: '4px', 
                                  border: '1px solid var(--border-color)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                {s.serial_number}
                                {(trip.status === 'LOADING') && (
                                  <button
                                    onClick={() => handleUnloadItem(s.stockId)}
                                    disabled={unloadStock.isPending}
                                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--status-error)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                                    title="Unload this serial"
                                  >
                                    <X size={10} />
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontFamily: 'monospace' }}>BULK</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 20px', fontWeight: 600 }}>{item.loaded_qty}</td>
                      <td style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--status-success)' }}>{item.sold_qty}</td>
                      <td style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--text-secondary)' }}>{item.returned_qty}</td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: item.status === 'LOADED' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: item.status === 'LOADED' ? 'var(--brand-primary)' : 'var(--status-success)' }}>
                          {item.status}
                        </span>
                      </td>
                      <td className="no-print" style={{ padding: '12px 20px', textAlign: 'right' }}>
                        {!item.serialItems?.length && (trip.status === 'LOADING') && (
                          <button 
                            onClick={() => handleUnloadItem(item.id)}
                            disabled={unloadStock.isPending}
                            style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-error)', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            title="Return item to warehouse"
                          >
                            <RefreshCw size={14} /> Unload
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {activeTab === 'TRANSACTIONS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {!summary ? (
              <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>Loading transactions...</div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                  <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Sales Cash</div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>Rs. {summary.totals.salesCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Collections Cash</div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>Rs. {summary.totals.collectionsCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Bookings Cash</div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>Rs. {summary.totals.preOrdersCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div style={{ background: 'var(--bg-tertiary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Expected Cash from Trip</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brand-primary)' }}>Rs. {summary.totals.expectedCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Sales Transactions</h3>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead style={{ background: 'var(--bg-tertiary)' }}>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>Date</th>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>Customer</th>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>Type</th>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>Method</th>
                          <th style={{ padding: '12px 20px', fontWeight: 600, textAlign: 'right' }}>Cash Collected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.sales.length === 0 ? (
                          <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No sales recorded.</td></tr>
                        ) : (
                          summary.sales.map((s: any) => (
                            <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '14px' }}>
                              <td style={{ padding: '12px 20px' }}>{new Date(s.created_at).toLocaleString('en-GB')}</td>
                              <td style={{ padding: '12px 20px' }}>
                                <div style={{ fontWeight: 600 }}>{s.customer_name || 'Walk-in'}</div>
                                {s.product_summary && (
                                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: '2px' }}>
                                    {s.product_summary}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '12px 20px' }}>{s.sale_type}</td>
                              <td style={{ padding: '12px 20px' }}>{s.payment_mode}</td>
                              <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 600 }}>Rs. {Number(s.cash_collected || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Collection Receipts</h3>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead style={{ background: 'var(--bg-tertiary)' }}>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>Date</th>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>Receipt No</th>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>Customer</th>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>Method</th>
                          <th style={{ padding: '12px 20px', fontWeight: 600, textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.collections.length === 0 ? (
                          <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No collections recorded.</td></tr>
                        ) : (
                          summary.collections.map((c: any) => (
                            <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '14px' }}>
                              <td style={{ padding: '12px 20px' }}>{new Date(c.created_at).toLocaleString('en-GB')}</td>
                              <td style={{ padding: '12px 20px', fontFamily: 'monospace' }}>{c.receipt_no}</td>
                              <td style={{ padding: '12px 20px', fontWeight: 600 }}>{c.customer_name}</td>
                              <td style={{ padding: '12px 20px' }}>{c.payment_mode}</td>
                              <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 600 }}>Rs. {Number(c.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Bookings (Advance Payments)</h3>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead style={{ background: 'var(--bg-tertiary)' }}>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>Date</th>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>Booking No</th>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>Customer</th>
                          <th style={{ padding: '12px 20px', fontWeight: 600 }}>Method</th>
                          <th style={{ padding: '12px 20px', fontWeight: 600, textAlign: 'right' }}>Advance Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!summary.preOrders || summary.preOrders.length === 0 ? (
                          <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No bookings recorded.</td></tr>
                        ) : (
                          summary.preOrders.map((p: any) => (
                            <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '14px' }}>
                              <td style={{ padding: '12px 20px' }}>{new Date(p.created_at).toLocaleString('en-GB')}</td>
                              <td style={{ padding: '12px 20px', fontFamily: 'monospace' }}>{p.receipt_no}</td>
                              <td style={{ padding: '12px 20px', fontWeight: 600 }}>{p.customer_name}</td>
                              <td style={{ padding: '12px 20px' }}>{p.payment_mode}</td>
                              <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 600 }}>Rs. {Number(p.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'MAP' && (
          <TripMapTab tripId={id || ''} />
        )}

      </div>

      {showDispatchModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '400px', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Dispatch Trip</h3>
            
            {trip.last_vehicle_end_km !== null && trip.last_vehicle_end_km !== undefined && (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'left' }}>
                Last recorded odometer reading for vehicle <strong>{trip.vehicle?.license_plate}</strong> is <strong>{trip.last_vehicle_end_km} km</strong>.
              </div>
            )}

            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', textAlign: 'left' }}>
              Start Odometer Reading (KM)
            </label>
            <input 
              type="number"
              value={startKmInput}
              onChange={(e) => setStartKmInput(e.target.value)}
              placeholder="Enter KM reading..."
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none', marginBottom: '20px' }}
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowDispatchModal(false)}
                style={{ flex: 1, padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  const km = startKmInput ? parseInt(startKmInput, 10) : null;
                  if (km !== null && isNaN(km)) {
                    alert("Please enter a valid number");
                    return;
                  }
                  if (km !== null && km < 0) {
                    alert("Odometer reading cannot be negative.");
                    return;
                  }
                  try {
                    await updateStatus.mutateAsync({ tripId: trip.id, status: 'DEPARTED', start_km: km });
                    setShowDispatchModal(false);
                  } catch (e: any) {
                    alert(e.response?.data?.message || 'Failed to dispatch trip');
                  }
                }}
                style={{ flex: 2, padding: '10px', background: 'var(--brand-primary)', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {showOdoEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '400px', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Edit Odometer Readings</h3>
            
            {trip.last_vehicle_end_km !== null && trip.last_vehicle_end_km !== undefined && (
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'left' }}>
                Last recorded odometer reading for vehicle <strong>{trip.vehicle?.license_plate}</strong> is <strong>{trip.last_vehicle_end_km} km</strong>.
              </div>
            )}

            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', textAlign: 'left' }}>
              Start Odometer Reading (KM)
            </label>
            <input 
              type="number"
              value={startKmInput}
              onChange={(e) => setStartKmInput(e.target.value)}
              placeholder="Enter start KM..."
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none', marginBottom: '16px' }}
            />

            {trip.status !== 'PLANNED' && trip.status !== 'LOADING' && (
              <>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', textAlign: 'left' }}>
                  End Odometer Reading (KM)
                </label>
                <input 
                  type="number"
                  value={endKmInput}
                  onChange={(e) => setEndKmInput(e.target.value)}
                  placeholder="Enter end KM..."
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none', marginBottom: '20px' }}
                />
              </>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowOdoEditModal(false)}
                style={{ flex: 1, padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  const startKm = startKmInput ? parseInt(startKmInput, 10) : null;
                  const endKm = endKmInput ? parseInt(endKmInput, 10) : null;

                  if (startKm !== null && isNaN(startKm)) {
                    alert("Please enter a valid start KM number");
                    return;
                  }
                  if (startKm !== null && startKm < 0) {
                    alert("Start odometer reading cannot be negative.");
                    return;
                  }

                  if (trip.status !== 'PLANNED' && trip.status !== 'LOADING') {
                    if (endKm !== null && isNaN(endKm)) {
                      alert("Please enter a valid end KM number");
                      return;
                    }
                    if (endKm !== null && endKm < 0) {
                      alert("End odometer reading cannot be negative.");
                      return;
                    }
                    if (startKm !== null && endKm !== null && endKm < startKm) {
                      alert(`End odometer reading cannot be less than start odometer reading: ${startKm} km.`);
                      return;
                    }
                  }

                  try {
                    await updateStatus.mutateAsync({ 
                      tripId: trip.id, 
                      status: trip.status, 
                      start_km: startKm,
                      end_km: endKm
                    });
                    setShowOdoEditModal(false);
                  } catch (e: any) {
                    alert(e.response?.data?.message || 'Failed to update odometer readings');
                  }
                }}
                style={{ flex: 2, padding: '10px', background: 'var(--brand-primary)', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showAgreementsModal && trip && (
        <TripAgreementsModal tripId={trip.id} onClose={() => setShowAgreementsModal(false)} />
      )}
    </div>
  );
}
