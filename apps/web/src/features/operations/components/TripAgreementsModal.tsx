import { useState } from 'react';
import { useGetTripAgreements } from '../api';
import { openTripAgreementsPrintWindow } from './printTripAgreements';
import { X, Printer, FileText, ChevronLeft, ChevronRight, User, Shield, AlertCircle } from 'lucide-react';

export function TripAgreementsModal({ tripId, onClose }: { tripId: string; onClose: () => void }) {
  const { data, isLoading, error } = useGetTripAgreements(tripId);
  const [currentIndex, setCurrentIndex] = useState(0);

  const agreements = data?.agreements || [];
  const currentAgreement = agreements[currentIndex];

  const formatCurrency = (val: string | number) => 
    Number(val || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-GB');
    } catch (e) {
      return d;
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ width: '900px', maxHeight: '90vh', background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 24px 48px rgba(0,0,0,0.4)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        {/* Modal Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} color="var(--brand-primary)" /> Trip Installment Agreements
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              {data ? `Trip: ${data.trip.route_name} (${data.trip.planned_date}) • ${data.total_agreements} Installment Sale(s)` : 'Loading...'}
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {data && data.agreements.length > 0 && (
              <button 
                onClick={() => openTripAgreementsPrintWindow(data)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                <Printer size={16} /> Print / Save All ({data.total_agreements} A4 Pages)
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading agreement documents and signature assets...
            </div>
          ) : error ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--status-error)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={32} />
              <div>Failed to load agreements: {(error as any)?.response?.data?.message || (error as any)?.message}</div>
            </div>
          ) : agreements.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <FileText size={40} style={{ opacity: 0.4 }} />
              <div>No installment sales agreements found for this trip.</div>
            </div>
          ) : (
            <div>
              {/* Pagination Controls between multiple agreements */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', background: 'var(--bg-secondary)', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>
                  Agreement <strong>{currentIndex + 1}</strong> of <strong>{agreements.length}</strong>
                </span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button 
                    onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentIndex === 0}
                    style={{ padding: '6px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', opacity: currentIndex === 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <button 
                    onClick={() => setCurrentIndex(prev => Math.min(agreements.length - 1, prev + 1))}
                    disabled={currentIndex === agreements.length - 1}
                    style={{ padding: '6px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: currentIndex === agreements.length - 1 ? 'not-allowed' : 'pointer', opacity: currentIndex === agreements.length - 1 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Agreement Preview Card */}
              {currentAgreement && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Agreement Header Details */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Hire Purchase Contract: {currentAgreement.contract.id.slice(0, 13).toUpperCase()}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Invoice No: <strong>{currentAgreement.sale.reference_number}</strong> • Date: {formatDate(currentAgreement.sale.created_at)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        {currentAgreement.contract.status}
                      </span>
                    </div>
                  </div>

                  {/* Customer & Guarantor Details */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ background: 'var(--bg-primary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <User size={14} /> Customer (Hirer)
                      </div>
                      {currentAgreement.customer ? (
                        <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div><strong>Name:</strong> {currentAgreement.customer.full_name}</div>
                          <div><strong>NIC:</strong> {currentAgreement.customer.nic}</div>
                          <div><strong>Mobile:</strong> {currentAgreement.customer.mobile}</div>
                          <div><strong>Address:</strong> {currentAgreement.customer.address}</div>
                        </div>
                      ) : <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Customer details not found</div>}
                    </div>

                    <div style={{ background: 'var(--bg-primary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <Shield size={14} /> Guarantor (Surety)
                      </div>
                      {currentAgreement.guarantor ? (
                        <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div><strong>Name:</strong> {currentAgreement.guarantor.full_name}</div>
                          <div><strong>NIC:</strong> {currentAgreement.guarantor.nic}</div>
                          <div><strong>Mobile:</strong> {currentAgreement.guarantor.mobile}</div>
                          <div><strong>Address:</strong> {currentAgreement.guarantor.address}</div>
                        </div>
                      ) : <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No guarantor recorded</div>}
                    </div>
                  </div>

                  {/* Items */}
                  <div style={{ background: 'var(--bg-primary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      Purchased Items
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {currentAgreement.sale.items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: idx < currentAgreement.sale.items.length - 1 ? '1px dashed var(--border-color)' : 'none', paddingBottom: '4px' }}>
                          <div>
                            <span style={{ fontWeight: 600 }}>{item.quantity}x {item.product_name}</span>
                            {item.serial_number && <span style={{ fontFamily: 'monospace', marginLeft: '6px', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>S/N: {item.serial_number}</span>}
                          </div>
                          <div style={{ fontWeight: 700 }}>Rs. {formatCurrency(item.line_total)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Terms */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Downpayment</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>Rs. {formatCurrency(currentAgreement.contract.downpayment)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Financed Balance</div>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>Rs. {formatCurrency(currentAgreement.contract.balance)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Terms / Frequency</div>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>{currentAgreement.contract.terms} ({currentAgreement.contract.schedule_frequency})</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Payable</div>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>Rs. {formatCurrency(currentAgreement.contract.total_payable)}</div>
                    </div>
                  </div>

                  {/* Signatures Preview */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Customer Signature</div>
                      {currentAgreement.contract.signature_signed_url ? (
                        <img 
                          src={currentAgreement.contract.signature_signed_url} 
                          alt="Customer Sig" 
                          style={{ maxHeight: '60px', maxWidth: '185px', objectFit: 'contain', mixBlendMode: 'multiply', background: 'transparent' }} 
                        />
                      ) : <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Digital signature not captured</div>}
                    </div>

                    <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Guarantor Signature</div>
                      {currentAgreement.contract.guarantor_signature_signed_url ? (
                        <img 
                          src={currentAgreement.contract.guarantor_signature_signed_url} 
                          alt="Guarantor Sig" 
                          style={{ maxHeight: '60px', maxWidth: '185px', objectFit: 'contain', mixBlendMode: 'multiply', background: 'transparent' }} 
                        />
                      ) : <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Digital signature not captured</div>}
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
