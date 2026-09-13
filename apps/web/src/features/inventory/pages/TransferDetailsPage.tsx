import { useParams, useNavigate } from 'react-router-dom';
import { useTransferById } from '../api';
import { ArrowLeft, Package, Calendar, User, MapPin, Hash, ArrowRight, Printer } from 'lucide-react';
import { format } from 'date-fns';

export function TransferDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: transfer, isLoading } = useTransferById(id || '');

  if (isLoading) return <div style={{ padding: '24px' }}>Loading...</div>;
  if (!transfer) return <div style={{ padding: '24px' }}>Transfer not found</div>;

  const totalQty = transfer.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;

  // Group items by product ID to merge quantities and serials into a single row
  const groupedItems = transfer.items?.reduce((acc: any[], item: any) => {
    const existing = acc.find(i => i.product_id === item.product_id);
    if (existing) {
      existing.quantity += item.quantity;
      if (item.serials && item.serials.length > 0) {
        existing.serials = [...(existing.serials || []), ...item.serials];
      }
    } else {
      // Deep copy to avoid mutating the original data
      acc.push({ 
        ...item, 
        serials: item.serials ? [...item.serials] : [] 
      });
    }
    return acc;
  }, []) || [];

  const handlePrint = () => {
    if (!transfer) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>Stock Transfer - ${transfer.reference_number}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; color: #111827; padding: 40px; margin: 0; line-height: 1.5; }
            .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
            .title { font-size: 24px; font-weight: bold; margin: 0 0 8px 0; }
            .subtitle { color: #6b7280; font-size: 14px; margin: 0; }
            
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 40px; }
            .info-box { padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; }
            .info-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; font-weight: 600; }
            .info-value { font-size: 16px; font-weight: 600; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            th { text-align: left; padding: 12px; background: #f3f4f6; color: #374151; font-weight: 600; border-bottom: 2px solid #e5e7eb; font-size: 14px; }
            td { padding: 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; font-size: 14px; }
            
            .serial-tag { display: inline-block; padding: 2px 6px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; font-family: monospace; font-size: 12px; margin: 2px; }
            
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 80px; }
            .sig-line { border-top: 1px solid #9ca3af; padding-top: 8px; text-align: center; color: #4b5563; font-size: 14px; }
            
            @media print {
              body { padding: 0; }
              @page { margin: 1.5cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">Stock Transfer Report</h1>
            <p class="subtitle">Reference: ${transfer.reference_number} | Generated: ${new Date().toLocaleString('en-GB')}</p>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <div class="info-label">Transfer Details</div>
              <div class="info-value">Date: ${format(new Date(transfer.transferred_at), 'PPP p')}</div>
              <div class="info-value">By: ${transfer.transferredBy?.name || 'Unknown'}</div>
              ${transfer.notes ? `<div style="font-size: 13px; margin-top: 8px; color: #4b5563;">Notes: ${transfer.notes}</div>` : ''}
            </div>
            <div class="info-box">
              <div class="info-label">Locations</div>
              <div style="margin-bottom: 8px;">
                <div style="font-size: 12px; color: #6b7280;">From:</div>
                <div class="info-value">${transfer.sourceWarehouse?.name}</div>
              </div>
              <div>
                <div style="font-size: 12px; color: #6b7280;">To:</div>
                <div class="info-value">${transfer.destinationWarehouse?.name}</div>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Serials / Notes</th>
                <th style="text-align: right;">Qty</th>
              </tr>
            </thead>
            <tbody>
              ${groupedItems.map((item: any) => `
                <tr>
                  <td style="font-weight: 600;">${item.product?.name}</td>
                  <td style="font-family: monospace;">${item.product?.sku}</td>
                  <td>
                    ${item.serials && item.serials.length > 0 
                      ? item.serials.map((s: any) => `<span class="serial-tag">${s.serial?.serial_number}</span>`).join('') 
                      : 'Bulk Transfer'}
                  </td>
                  <td style="text-align: right; font-weight: 600;">${item.quantity}</td>
                </tr>
              `).join('')}
              <tr style="background: #f9fafb;">
                <td colspan="3" style="text-align: right; font-weight: bold; padding: 16px 12px;">Total Items Transferred:</td>
                <td style="text-align: right; font-weight: bold; font-size: 16px; padding: 16px 12px;">${totalQty}</td>
              </tr>
            </tbody>
          </table>

          <div class="signatures">
            <div>
              <div style="height: 60px;"></div>
              <div class="sig-line">
                Handed Over By<br>
                <span style="font-size: 12px;">${transfer.transferredBy?.name || 'Name & Signature'}</span>
              </div>
            </div>
            <div>
              <div style="height: 60px;"></div>
              <div class="sig-line">
                Received By<br>
                <span style="font-size: 12px;">Name & Signature</span>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => navigate(-1)} 
            className="btn-icon" 
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}
          >
            <ArrowLeft size={20} color="var(--text-secondary)" />
          </button>
          <div>
            <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={24} color="var(--brand-primary)" />
              Transfer Details
            </h1>
            <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
              Reference: {transfer.reference_number}
            </p>
          </div>
        </div>
        <button 
          onClick={handlePrint}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            background: 'var(--brand-primary)', color: 'white', 
            border: 'none', padding: '10px 16px', borderRadius: '8px', 
            fontWeight: 600, cursor: 'pointer' 
          }}
        >
          <Printer size={18} /> Print Transfer Report
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={16}/> Date & Time
            </div>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>{format(new Date(transfer.transferred_at), 'PPP p')}</div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={16}/> Transferred By
            </div>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>{transfer.transferredBy?.name || 'Unknown User'}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{transfer.transferredBy?.email}</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-tertiary)', padding: '24px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--border-color)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={16}/> Source Warehouse
            </div>
            <div style={{ fontWeight: 600, fontSize: '18px', color: 'var(--text-primary)' }}>{transfer.sourceWarehouse?.name}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{transfer.sourceWarehouse?.address || 'No address provided'}</div>
          </div>
          <div style={{ padding: '0 32px', color: 'var(--brand-primary)' }}>
            <ArrowRight size={32} />
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
              <MapPin size={16}/> Destination Warehouse
            </div>
            <div style={{ fontWeight: 600, fontSize: '18px', color: 'var(--text-primary)' }}>{transfer.destinationWarehouse?.name}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{transfer.destinationWarehouse?.address || 'No address provided'}</div>
          </div>
        </div>

        {transfer.notes && (
          <div>
            <h4 style={{ fontSize: '15px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Notes</h4>
            <p style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', fontSize: '14px', border: '1px solid var(--border-color)' }}>{transfer.notes}</p>
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Items Transferred</span>
          <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--brand-primary)', padding: '6px 12px', borderRadius: '100px', fontSize: '14px', fontWeight: 600 }}>
            {totalQty} Total Items
          </span>
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {groupedItems.map((item: any) => (
            <div key={item.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: item.serials?.length > 0 ? '16px' : '0' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)' }}>{item.product?.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', gap: '12px' }}>
                    <span>SKU: <strong style={{ color: 'var(--text-secondary)' }}>{item.product?.sku}</strong></span>
                    {item.product?.brand && <span>Brand: <strong style={{ color: 'var(--text-secondary)' }}>{item.product?.brand}</strong></span>}
                    {item.product?.category && <span>Category: <strong style={{ color: 'var(--text-secondary)' }}>{item.product?.category}</strong></span>}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', padding: '6px 16px', borderRadius: '100px', fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                  Qty: {item.quantity}
                </div>
              </div>
              
              {item.serials?.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '8px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Hash size={14} /> Serial Numbers
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {item.serials.map((s: any) => (
                      <span key={s.serial_id} style={{ 
                        background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', 
                        padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, fontFamily: 'monospace' 
                      }}>
                        {s.serial?.serial_number}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
