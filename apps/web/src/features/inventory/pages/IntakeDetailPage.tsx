import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, User, FileText, Calendar, Building, Barcode, X, Activity, Printer } from 'lucide-react';
import { useIntakeById } from '../api';
import { PrintBarcodesModal } from '../components/PrintBarcodesModal';

export function IntakeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: intake, isLoading } = useIntakeById(id!);
  
  const [selectedSerials, setSelectedSerials] = useState<any[] | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  if (isLoading) return <div style={{ padding: 'var(--spacing-6)' }}>Loading intake details...</div>;
  if (!intake) return <div style={{ padding: 'var(--spacing-6)' }}>Intake order not found</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      {/* Header section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>Intake Details</h1>
          <p style={{ color: 'var(--text-secondary)' }}>ID: {intake.id}</p>
        </div>
        <button
          onClick={() => setShowPrintModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)',
            fontWeight: 600, cursor: 'pointer'
          }}
        >
          <Printer size={18} />
          Print Barcodes
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-6)' }}>
        {/* Info Card */}
        <div className="glass-panel" style={{ padding: 'var(--spacing-5)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            General Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> Date Received</p>
              <p style={{ fontWeight: 500 }}>{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(intake.received_at))}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}><User size={14} /> Received By</p>
              <p style={{ fontWeight: 500 }}>{intake.creator?.name || intake.creator?.email}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}><Building size={14} /> Destination Warehouse</p>
              <p style={{ fontWeight: 500 }}>{intake.warehouse?.name}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={14} /> Total Cost</p>
              <p style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>Rs {parseFloat(intake.total_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        {/* Supplier Card */}
        <div className="glass-panel" style={{ padding: 'var(--spacing-5)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            Supplier Information
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Supplier</p>
              <p style={{ fontWeight: 500, fontSize: '16px' }}>{intake.supplier?.name || intake.supplier_name}</p>
            </div>
            {intake.invoice_number && (
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={14} /> Invoice Number</p>
                <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '4px', fontSize: '13px', marginTop: '4px' }}>
                  {intake.invoice_number}
                </span>
              </div>
            )}
            {intake.supplier?.phone && (
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Phone</p>
                <p style={{ fontWeight: 400 }}>{intake.supplier.phone}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="glass-panel" style={{ padding: 'var(--spacing-5)' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Package size={20} /> Received Items
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px' }}>PRODUCT</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px' }}>SKU</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px' }}>QTY</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px' }}>UNIT COST</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {intake.items?.map((item: any) => (
                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '16px', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {item.product?.name}
                      {item.product?.is_serialized && (
                        <button 
                          onClick={() => {
                            setSelectedSerials(item.serials || []);
                            setSelectedProduct(item.product?.name);
                          }}
                          style={{ 
                            background: 'rgba(59, 130, 246, 0.1)', color: 'var(--brand-primary)', 
                            border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '10px', 
                            padding: '4px 8px', borderRadius: '4px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600
                          }}
                          title="View Serials"
                        >
                          <Barcode size={12} />
                          {item.serials?.length || 0} SERIALS
                        </button>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{item.product?.sku}</td>
                  <td style={{ padding: '16px' }}>{item.quantity}</td>
                  <td style={{ padding: '16px' }}>Rs {parseFloat(item.unit_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '16px', fontWeight: 600 }}>Rs {(item.quantity * parseFloat(item.unit_cost)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Serials Modal */}
      {selectedSerials !== null && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 110, padding: 'var(--spacing-4)'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', position: 'relative'
          }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Serial Numbers</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedProduct}</p>
              </div>
              <button onClick={() => setSelectedSerials(null)} style={{
                background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer'
              }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedSerials.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>No serial numbers recorded for this item.</p>
              ) : (
                selectedSerials.map((s, idx) => (
                  <div key={idx} style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: '6px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 500 }}>{s.serial_number}</span>
                    <span style={{ 
                      display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600,
                      padding: '4px 8px', borderRadius: '12px',
                      background: s.status === 'IN_STOCK' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: s.status === 'IN_STOCK' ? '#4ade80' : '#f87171'
                    }}>
                      <Activity size={12} /> {s.status.replace('_', ' ')}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedSerials(null)} style={{
                padding: '8px 16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                color: 'var(--text-primary)', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer', fontWeight: 500
              }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Print Barcodes Modal */}
      {showPrintModal && (
        <PrintBarcodesModal 
          intakeItems={intake.items || []} 
          onClose={() => setShowPrintModal(false)} 
        />
      )}
    </div>
  );
}
