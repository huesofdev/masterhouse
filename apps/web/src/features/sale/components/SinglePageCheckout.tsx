import { useState, useEffect, useMemo } from 'react';
import { useCustomerSearch, useInstallmentSchemes, useCreateSale } from '../api';
import { useCustomerDetails } from '../../customers/api';
import { useGetSettings } from '../../settings/api';
import { User, Shield, CreditCard, Search, ArrowLeft, Loader2, ArrowRight, X, Star } from 'lucide-react';
import { apiClient } from '../../../lib/axios';
import { CustomerFormModal } from '../../customers/components/CustomerFormModal';
import { GuarantorFormModal } from './GuarantorFormModal';

export function SinglePageCheckout({ 
  cart,
  subtotal,
  total,
  onCancel, 
  onSuccess,
  discountAmount,
  taxAmount,
  taxDetails,
  prefillBooking
}: { 
  cart: any[];
  subtotal: number;
  total: number;
  onCancel: () => void;
  onSuccess: (data: any, type: string, customer?: any, downpayment?: number, scheme?: any, recoveryDate?: string) => void;
  discountAmount?: number;
  taxAmount?: number;
  taxDetails?: any[];
  prefillBooking?: any;
}) {
  const [saleType, setSaleType] = useState<'DIRECT' | 'INSTALLMENT'>('DIRECT');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');

  // Customer
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  
  // Scheme & Downpayment
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>('');
  const [downpayment, setDownpayment] = useState<number | ''>('');
  const [recoveryDate, setRecoveryDate] = useState<string>('');
  
  // Guarantor
  const [selectedGuarantorId, setSelectedGuarantorId] = useState<string>('');
  const [showGuarantorModal, setShowGuarantorModal] = useState(false);
  const [newGuarantor, setNewGuarantor] = useState<any>(null); // holds data + files

  // Notes
  const [notes, setNotes] = useState('');

  // Uploads
  const [isUploading, setIsUploading] = useState(false);

  const { data: searchResults } = useCustomerSearch(customerQuery);
  const { data: schemes } = useInstallmentSchemes();
  const { data: customerDetails } = useCustomerDetails(selectedCustomer?.id || '');
  const { data: settings } = useGetSettings();
  const maxRecoveryDays = settings?.downpayment_partial_recovery_days_max ? parseInt(settings.downpayment_partial_recovery_days_max) : 14;
  
  const createSale = useCreateSale();

  const selectedScheme = schemes?.find(s => s.id === selectedSchemeId);
  const minDownpayment = useMemo(() => {
    if (!selectedScheme) return 0;
    const schemePercent = parseFloat(selectedScheme.min_downpayment_percent) / 100;
    return cart.reduce((sum, item) => {
      const flatDp = (parseFloat(item.min_downpayment_amount || "0")) * item.quantity;
      const baseLineTotal = (item.unit_price || item.price || 0) * item.quantity;
      
      let actualDiscount = 0;
      if (item.discount_input) {
        if (item.discount_input.endsWith('%')) {
          const amt = parseFloat(item.discount_input.replace('%', '')) || 0;
          actualDiscount = (baseLineTotal * amt) / 100;
        } else if (item.discount_input.startsWith('*')) {
          const amt = parseFloat(item.discount_input.replace('*', '')) || 0;
          actualDiscount = amt * item.quantity;
        } else {
          actualDiscount = parseFloat(item.discount_input) || 0;
        }
      }
      
      const lineTotal = baseLineTotal - actualDiscount;
      const schemeDp = lineTotal * schemePercent;
      return sum + Math.max(flatDp, schemeDp);
    }, 0);
  }, [cart, selectedScheme]);
  const downpaymentVal = typeof downpayment === 'number' ? downpayment : 0;
  const isDownpaymentValid = selectedScheme && (downpaymentVal >= minDownpayment || (downpaymentVal < minDownpayment && recoveryDate !== ''));

  // Initialize from Booking
  useEffect(() => {
    if (prefillBooking) {
      if (prefillBooking.sale_type_preference === 'INSTALLMENT') {
        setSaleType('INSTALLMENT');
      } else {
        setSaleType('DIRECT');
      }
      if (prefillBooking.payment_method) {
        setPaymentMode(prefillBooking.payment_method);
      }
      if (prefillBooking.advance_payment) {
        setDownpayment(parseFloat(prefillBooking.advance_payment));
      }
    }
  }, [prefillBooking]);

  // Handle auto-fetching customer from booking
  useEffect(() => {
    const loadBookingCustomer = async () => {
      if (prefillBooking?.customer_id && !selectedCustomer) {
        try {
          const res = await apiClient.get('/customers/' + prefillBooking.customer_id);
          setSelectedCustomer(res.data);
        } catch (e) {
          console.error("Failed to load booking customer", e);
        }
      }
    };
    loadBookingCustomer();
  }, [prefillBooking?.customer_id]);

  useEffect(() => {
    if (selectedScheme && (!prefillBooking || !prefillBooking.advance_payment)) {
      setDownpayment(minDownpayment);
    }
  }, [selectedSchemeId, minDownpayment, selectedScheme, prefillBooking]);

  const handleCompleteSale = async () => {
    // Validation
    if (saleType === 'INSTALLMENT') {
      if (!selectedCustomer) return alert('Customer is required for installments');
      if (!isDownpaymentValid) {
        if (downpaymentVal < minDownpayment) {
          if (!recoveryDate) return alert(`A Recovery Date is required since the downpayment is less than the minimum (Rs. ${minDownpayment.toFixed(2)}).`);
          const recDateObj = new Date(recoveryDate);
          const maxDateObj = new Date();
          maxDateObj.setDate(maxDateObj.getDate() + maxRecoveryDays);
          if (recDateObj > maxDateObj) {
            return alert(`Recovery date cannot exceed ${maxRecoveryDays} days from today.`);
          }
        }
        return alert('Valid downpayment is required');
      }
      if (newGuarantor && (!newGuarantor.full_name || !newGuarantor.nic)) return alert('Guarantor Name and NIC required');
      if (!newGuarantor && !selectedGuarantorId) return alert('Guarantor is required');
      if (newGuarantor && (!newGuarantor.frontFile || !newGuarantor.backFile)) {
        return alert('Both front and back images of the Guarantor\'s NIC are required.');
      }
      // Validate downpayment is not equal to or greater than the full total
      // (if they're paying everything, they should use Direct / Cash mode)
      if (downpaymentVal >= total) {
        return alert(`If the customer is paying the full amount of Rs. ${total.toFixed(2)}, please select 'Cash / Direct' mode instead of Installment.`);
      }
    }

    setIsUploading(true); // Reusing this state for overall processing

    try {
      let finalCustomerId = selectedCustomer?.id;

      // Handle Guarantor NIC uploads if new Guarantor is provided
      let guarantorPayload: any = undefined;
      
      if (saleType === 'INSTALLMENT' && newGuarantor) {
        let nic_front_url = '';
        let nic_back_url = '';

        if (newGuarantor.frontFile) {
          const frontData = new FormData();
          frontData.append('file', newGuarantor.frontFile);
          const res = await apiClient.post('/sync/upload', frontData, { headers: { 'Content-Type': 'multipart/form-data' }});
          nic_front_url = res.data.key;
        }

        if (newGuarantor.backFile) {
          const backData = new FormData();
          backData.append('file', newGuarantor.backFile);
          const res = await apiClient.post('/sync/upload', backData, { headers: { 'Content-Type': 'multipart/form-data' }});
          nic_back_url = res.data.key;
        }

        guarantorPayload = {
          full_name: newGuarantor.full_name,
          nic: newGuarantor.nic,
          mobile: newGuarantor.mobile,
          address: newGuarantor.address,
          nic_front_url,
          nic_back_url
        };
      }

      // Build payload
      const payload: any = {
        sale_type: saleType,
        payment_mode: paymentMode,
        subtotal: subtotal,
        total: total,
        items: cart.flatMap(item => {
          let amt = 0;
          let type: 'PERCENTAGE' | 'FLAT_LINE' | 'FLAT_UNIT' | null = null;
          if (item.discount_input) {
            if (item.discount_input.endsWith('%')) {
              amt = parseFloat(item.discount_input.replace('%', '')) || 0;
              type = 'PERCENTAGE';
            } else if (item.discount_input.startsWith('*')) {
              amt = parseFloat(item.discount_input.replace('*', '')) || 0;
              type = 'FLAT_UNIT';
            } else {
              amt = parseFloat(item.discount_input) || 0;
              type = 'FLAT_LINE';
            }
          }

          if (item.is_serialized && item.selected_serials && item.selected_serials.length > 0) {
            let actualDiscount = 0;
            const baseLineTotal = item.quantity * item.unit_price;
            if (type === 'PERCENTAGE') actualDiscount = (baseLineTotal * amt) / 100;
            else if (type === 'FLAT_UNIT') actualDiscount = amt * item.quantity;
            else if (type === 'FLAT_LINE') actualDiscount = amt;

            const discountPerUnit = actualDiscount / item.quantity;

            return item.selected_serials.map((serial: any) => ({
              product_id: item.product_id,
              serial_item_id: serial.id,
              quantity: 1,
              unit_price: item.unit_price,
              discount_amount: discountPerUnit,
              discount_type: 'FLAT_UNIT' as const,
              line_total: item.unit_price - discountPerUnit
            }));
          } else {
            let actualDiscount = 0;
            const baseLineTotal = item.quantity * item.unit_price;
            if (type === 'PERCENTAGE') actualDiscount = (baseLineTotal * amt) / 100;
            else if (type === 'FLAT_UNIT') actualDiscount = amt * item.quantity;
            else if (type === 'FLAT_LINE') actualDiscount = amt;

            return [{
              product_id: item.product_id,
              serial_item_id: null,
              quantity: item.quantity,
              unit_price: item.unit_price,
              discount_amount: amt,
              discount_type: type,
              line_total: baseLineTotal - actualDiscount
            }];
          }
        }),
        manual_discount: discountAmount || 0,
        tax_amount: taxAmount || 0,
        tax_details: taxDetails ? JSON.stringify(taxDetails) : '[]',
        pre_order_id: prefillBooking?.id || undefined,
        notes: notes || undefined
      };

      if (saleType === 'DIRECT') {
        payload.customer_id = finalCustomerId || null;
        payload.downpayment = 0;
      } else {
        payload.customer_id = finalCustomerId;
        payload.downpayment = downpaymentVal;
        if (downpaymentVal < minDownpayment) {
           payload.partial_downpayment_recovery_date = recoveryDate;
        }
        payload.scheme_id = selectedSchemeId;
        payload.guarantor_id = !newGuarantor ? selectedGuarantorId : undefined;
        payload.new_guarantor = newGuarantor ? guarantorPayload : undefined;
      }

      const saleRes = await createSale.mutateAsync(payload);
      onSuccess(saleRes, saleType, selectedCustomer, typeof downpayment === 'number' ? downpayment : 0, selectedScheme, recoveryDate);

    } catch (e: any) {
      alert(e.response?.data?.message || e.message || 'Failed to complete sale');
    } finally {
      setIsUploading(false);
    }
  };

  const calculateInstallment = () => {
    if (!selectedScheme) return 0;
    const dp = typeof downpayment === 'number' ? downpayment : 0;
    const effectiveDp = dp < minDownpayment ? minDownpayment : dp;
    const principal = total - effectiveDp;
    const interest = principal * (parseFloat(selectedScheme.interest_rate) / 100);
    return (principal + interest) / selectedScheme.terms;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onCancel} style={{ background: 'var(--bg-tertiary)', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={18} />
        </button>
        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Checkout</h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Sale Type */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setSaleType('DIRECT')}
            style={{ flex: 1, padding: '12px', background: saleType === 'DIRECT' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-tertiary)', border: `2px solid ${saleType === 'DIRECT' ? 'var(--status-success)' : 'var(--border-color)'}`, borderRadius: '8px', color: saleType === 'DIRECT' ? 'var(--status-success)' : 'var(--text-primary)', fontWeight: 700, cursor: 'pointer' }}
          >
            Direct Sale
          </button>
          <button 
            onClick={() => setSaleType('INSTALLMENT')}
            style={{ flex: 1, padding: '12px', background: saleType === 'INSTALLMENT' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-tertiary)', border: `2px solid ${saleType === 'INSTALLMENT' ? 'var(--brand-primary)' : 'var(--border-color)'}`, borderRadius: '8px', color: saleType === 'INSTALLMENT' ? 'var(--brand-primary)' : 'var(--text-primary)', fontWeight: 700, cursor: 'pointer' }}
          >
            Installment Plan
          </button>
        </div>

        {saleType === 'DIRECT' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Payment Method</label>
            <select value={paymentMode} onChange={e => setPaymentMode(e.target.value as any)} style={{ padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', fontSize: '15px', outline: 'none' }}>
              <option value="CASH">Cash</option>
              <option value="CARD">Credit Card</option>
              <option value="TRANSFER">Bank Transfer</option>
            </select>
          </div>
        )}

        {/* Customer Section (Available for both, required for Installment) */}
        <div style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-tertiary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}><User size={16} color="var(--brand-primary)"/> Customer {saleType === 'DIRECT' && <span style={{fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'normal'}}>(Optional)</span>}</h3>
            <button onClick={() => setShowCustomerModal(true)} style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
              + Add New
            </button>
          </div>

          {selectedCustomer ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '10px', borderRadius: '6px', border: '1px solid var(--brand-primary)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {selectedCustomer.full_name}
                  {parseFloat(selectedCustomer.rating ?? '0') > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={11}
                          fill={s <= Math.round(parseFloat(selectedCustomer.rating)) ? 'var(--brand-primary)' : 'none'}
                          color={s <= Math.round(parseFloat(selectedCustomer.rating)) ? 'var(--brand-primary)' : 'var(--text-muted)'}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{selectedCustomer.mobile}</div>
              </div>
              <button onClick={() => setSelectedCustomer(null)} style={{ background: 'none', border: 'none', color: 'var(--status-error)', cursor: 'pointer' }}><X size={16}/></button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} size={16} />
              <input 
                value={customerQuery} onChange={e => setCustomerQuery(e.target.value)}
                placeholder="Search by phone, name, or NIC..."
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 36px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
              />
              {customerQuery && searchResults && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', marginTop: '4px', zIndex: 10, maxHeight: '150px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  {searchResults.map((c: any) => {
                    const r = parseFloat(c.rating ?? '0');
                    return (
                      <div key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerQuery(''); }} style={{ padding: '10px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}>
                        <div style={{ fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {c.full_name}
                          {r > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} size={10}
                                  fill={s <= Math.round(r) ? 'var(--brand-primary)' : 'none'}
                                  color={s <= Math.round(r) ? 'var(--brand-primary)' : 'var(--text-muted)'}
                                />
                              ))}
                              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--brand-primary)' }}>{r.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{c.mobile}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {saleType === 'INSTALLMENT' && (
          <>
            {/* Scheme & Downpayment */}
            <div style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-tertiary)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}><CreditCard size={16} color="var(--brand-primary)"/> Terms</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <select value={selectedSchemeId} onChange={e => setSelectedSchemeId(e.target.value)} style={{ padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', width: '100%', boxSizing: 'border-box' }}>
                  <option value="">-- Select Scheme --</option>
                  {schemes?.map(s => (
                    <option key={s.id} value={s.id}>{s.name} | {s.terms} {s.frequency.toLowerCase()}s</option>
                  ))}
                </select>

                {selectedScheme && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ width: '100%' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Downpayment (Rs.)</label>
                      <input 
                        type="number" value={downpayment} onChange={e => setDownpayment(e.target.value ? parseFloat(e.target.value) : '')}
                        style={{ padding: '10px', background: 'var(--bg-primary)', border: `1px solid ${isDownpaymentValid ? 'var(--border-color)' : 'var(--status-error)'}`, borderRadius: '6px', color: 'var(--text-primary)', width: '100%', boxSizing: 'border-box', fontSize: '15px', fontWeight: 600, marginTop: '4px' }}
                      />
                      <div style={{ fontSize: '11px', marginTop: '4px', color: downpaymentVal >= minDownpayment ? 'var(--status-success)' : 'var(--status-error)' }}>Min: Rs. {minDownpayment.toFixed(2)}</div>
                      {downpaymentVal < minDownpayment && (
                        <div style={{ marginTop: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--status-error)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                              Downpayment Shortfall
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--status-error)' }}>
                              Rs. {(minDownpayment - downpaymentVal).toFixed(2)}
                            </span>
                          </div>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>When will the customer pay this gap? *</label>
                          <input 
                            type="date"
                            value={recoveryDate}
                            min={new Date().toISOString().split('T')[0]}
                            max={(() => { const d = new Date(); d.setDate(d.getDate() + maxRecoveryDays); return d.toISOString().split('T')[0]; })()}
                            onChange={e => setRecoveryDate(e.target.value)}
                            style={{ padding: '10px', background: 'var(--bg-primary)', border: `1px solid ${recoveryDate ? 'var(--border-color)' : 'var(--status-error)'}`, borderRadius: '6px', color: 'var(--text-primary)', width: '100%', boxSizing: 'border-box', fontSize: '14px', fontWeight: 600 }}
                          />
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '10px', borderRadius: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Installment Simulation</span>
                      <strong style={{ fontSize: '15px', color: 'var(--brand-primary)' }}>Rs. {calculateInstallment().toFixed(2)} X {selectedScheme.terms} {selectedScheme.frequency}s</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-tertiary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}><Shield size={16} color="var(--brand-primary)"/> Guarantor</h3>
                <button onClick={() => setShowGuarantorModal(true)} style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  {newGuarantor ? 'Edit Details' : '+ Add New'}
                </button>
              </div>

              {newGuarantor ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '10px', borderRadius: '6px', border: '1px solid var(--brand-primary)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{newGuarantor.full_name} <span style={{fontSize: '11px', color: 'var(--brand-primary)'}}>(New)</span></div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>NIC: {newGuarantor.nic}</div>
                  </div>
                  <button onClick={() => setNewGuarantor(null)} style={{ background: 'none', border: 'none', color: 'var(--status-error)', cursor: 'pointer' }}><X size={16}/></button>
                </div>
              ) : customerDetails?.guarantors?.length > 0 ? (
                <select value={selectedGuarantorId} onChange={e => setSelectedGuarantorId(e.target.value)} style={{ padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', width: '100%', boxSizing: 'border-box' }}>
                  <option value="">-- Select Existing Guarantor --</option>
                  {customerDetails.guarantors.map((g: any) => (
                    <option key={g.id} value={g.id}>{g.full_name} ({g.nic})</option>
                  ))}
                </select>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '10px', border: '1px dashed var(--border-color)', borderRadius: '6px', textAlign: 'center' }}>
                  No existing guarantors for this customer. Click Add New.
                </div>
              )}
            </div>
          </>
        )}

        <div style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-tertiary)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
             Sale Notes
          </h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any optional notes or remarks..."
            style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', minHeight: '60px', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>

      </div>

      <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '20px', fontWeight: 800 }}>
          <span>Total to Pay</span>
          <span style={{ color: 'var(--brand-primary)' }}>Rs. {saleType === 'DIRECT' ? total.toFixed(2) : (typeof downpayment === 'number' ? downpayment : 0).toFixed(2)}</span>
        </div>
        
        <button 
          onClick={handleCompleteSale}
          disabled={isUploading}
          style={{
            width: '100%', padding: '14px', background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-cta))', color: 'white',
            border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 700, cursor: isUploading ? 'not-allowed' : 'pointer', opacity: isUploading ? 0.7 : 1,
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
          }}
        >
          {isUploading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
          Complete Sale
        </button>
      </div>

      {showCustomerModal && (
        <CustomerFormModal 
          onClose={() => setShowCustomerModal(false)}
          onSuccess={async (id) => {
            setShowCustomerModal(false);
            if (id) {
              try {
                const res = await apiClient.get('/customers/' + id);
                setSelectedCustomer(res.data);
              } catch (e) {
                console.error('Failed to fetch new customer details', e);
              }
            }
          }}
        />
      )}

      {showGuarantorModal && (
        <GuarantorFormModal 
          initialData={newGuarantor}
          onClose={() => setShowGuarantorModal(false)}
          onSuccess={(data) => {
            setNewGuarantor(data);
            setSelectedGuarantorId('');
            setShowGuarantorModal(false);
          }}
        />
      )}
    </div>
  );
}
