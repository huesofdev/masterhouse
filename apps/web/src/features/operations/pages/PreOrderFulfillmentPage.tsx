import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../../lib/axios';
import { ArrowLeft, CheckCircle2, User, Search, X, Printer, DollarSign } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { useGetTaxes, useGetMe, useGetSettings } from '../../settings/api';
import { useAvailableSerials } from '../../sale/api';
import { PermissionGuard } from '../../../components/PermissionGuard';
import { useBranches } from '../../branches/api';
import { useBranchStore } from '../../../hooks/useBranchStore';

interface BookingItem {
  product_id: string;
  product_name: string;
  brand_name?: string;
  quantity: number;
  base_price?: number;
  min_downpayment_amount?: number;
  is_serialized?: boolean;
  selected_serials?: any[];
  discount_input?: string;
}

export function PreOrderFulfillmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [items, setItems] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [saleType, setSaleType] = useState<'DIRECT' | 'INSTALLMENT'>('DIRECT');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');

  // Serial Selection State
  const [serialModalProduct, setSerialModalProduct] = useState<string | null>(null);
  const [serialSearchQuery, setSerialSearchQuery] = useState('');
  const { data: availableSerials, isLoading: isLoadingSerials } = useAvailableSerials(serialModalProduct);

  // Installment States
  const [schemes, setSchemes] = useState<any[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState('');
  const [extraCashPaidInput, setExtraCashPaidInput] = useState<string>('');
  const [recoveryDate, setRecoveryDate] = useState<string>('');
  const [saleSuccess, setSaleSuccess] = useState(false);
  const [completedInvoiceNo, setCompletedInvoiceNo] = useState<string | null>(null);

  const { activeBranchId } = useBranchStore();
  const { data: branches } = useBranches();
  const activeBranch = branches?.find((b: any) => b.id === activeBranchId);
  const { data: taxesData } = useGetTaxes();
  const { data: me } = useGetMe();
  const { data: settings } = useGetSettings();
  const activeTaxes = taxesData?.filter((t: any) => t.is_active) || [];
  
  
  const receiptRef = useRef<HTMLDivElement>(null);
  const handlePrintReceipt = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: 'Receipt',
  });
  
  const maxDiscountAllowed = me?.max_discount_percentage ? parseFloat(me.max_discount_percentage) : 0;

  useEffect(() => {
    loadBooking();
    loadSchemes();
  }, [id]);

  const loadBooking = async () => {
    setLoading(true);
    try {
      // 1. Fetch booking
      const res = await apiClient.get('/orders?status=PENDING');
      const b = res.data?.data?.find((o: any) => o.id === id);
      if (!b) {
        alert("Booking not found or already fulfilled.");
        navigate('/bookings');
        return;
      }
      setBooking(b);
      setSaleType(b.sale_type_preference || 'DIRECT');

      // 2. Fetch customer details
      if (b.customer_id) {
        const custRes = await apiClient.get(`/customers/${b.customer_id}/details`);
        setCustomer(custRes.data?.data?.profile);
      }

      // 3. Fetch products to get prices and serialization status
      const prodRes = await apiClient.get('/catalog/products?limit=1000');
      const allProds = prodRes.data?.data || [];

      if (b.items && b.items.length > 0) {
        const enrichedItems = b.items.map((item: any) => {
          const prod = allProds.find((p: any) => p.id === item.product_id);
          return {
            ...item,
            brand_name: prod?.brand?.name,
            is_serialized: prod?.is_serialized || false,
            base_price: parseFloat(prod?.base_price || '0'),
            min_downpayment_amount: parseFloat(prod?.min_downpayment_amount || '0'),
            selected_serials: [],
            discount_input: ''
          };
        });
        setItems(enrichedItems);
      }

    } catch (err) {
      console.error(err);
      alert('Failed to load booking details.');
    } finally {
      setLoading(false);
    }
  };

  const loadSchemes = async () => {
    try {
      const res = await apiClient.get('/collections/schemes');
      setSchemes(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Discount Calculation Helpers
  const getItemDiscount = (item: BookingItem) => {
    const lineTotal = item.quantity * (item.base_price || 0);
    if (!item.discount_input) return 0;
    let disc = 0;
    if (item.discount_input.endsWith('%')) {
      const pct = parseFloat(item.discount_input.replace('%', '')) || 0;
      disc = lineTotal * (pct / 100);
    } else if (item.discount_input.startsWith('*')) {
      const val = parseFloat(item.discount_input.replace('*', '')) || 0;
      disc = val * item.quantity;
    } else {
      disc = parseFloat(item.discount_input) || 0;
    }
    return Math.min(lineTotal, Math.max(0, disc));
  };

  const { subtotal, totalDiscount } = useMemo(() => {
    let sub = 0;
    let disc = 0;
    items.forEach(item => {
      sub += item.quantity * (item.base_price || 0);
      disc += getItemDiscount(item);
    });
    return { subtotal: sub, totalDiscount: disc };
  }, [items]);

  const { totalTax, finalTotal } = useMemo(() => {
    let taxAmt = 0;
    const discountedSubtotal = Math.max(0, subtotal - totalDiscount);
    
    activeTaxes.forEach((tax: any) => {
      if (tax.type === 'EXCLUSIVE') {
        taxAmt += (discountedSubtotal * parseFloat(tax.rate)) / 100;
      }
    });
    return {
      totalTax: taxAmt,
      finalTotal: discountedSubtotal + taxAmt
    };
  }, [subtotal, totalDiscount, activeTaxes]);

  const advancePayment = parseFloat(booking?.advance_payment || '0');
  const selectedScheme = useMemo(() => schemes.find(s => s.id === selectedSchemeId), [schemes, selectedSchemeId]);

  const minRequiredDownpayment = useMemo(() => {
    if (saleType !== 'INSTALLMENT' || !selectedScheme) return 0;
    const schemePercent = parseFloat(selectedScheme.min_downpayment_percent || '0') / 100;
    return items.reduce((sum, item) => {
      const flatDp = (item.min_downpayment_amount || 0) * item.quantity;
      const baseTotal = (item.base_price || 0) * item.quantity;
      const lineTotal = baseTotal - getItemDiscount(item);
      const schemeDp = lineTotal * schemePercent;
      return sum + Math.max(flatDp, schemeDp);
    }, 0);
  }, [saleType, selectedScheme, items]);

  const minGap = Math.max(0, minRequiredDownpayment - advancePayment);
  const maxExtraCash = Math.max(0, finalTotal - advancePayment);
  
  // Extra cash is either what the user typed, or the minimum gap if they haven't typed enough
  const parsedExtraCash = parseFloat(extraCashPaidInput);
  const extraCashPaid = !isNaN(parsedExtraCash) ? parsedExtraCash : 0;
  const maxRecoveryDays = settings?.downpayment_partial_recovery_days_max ? parseInt(settings.downpayment_partial_recovery_days_max) : 14;
  
  const totalDownpaymentCredited = advancePayment + extraCashPaid;

  const balanceToPay = saleType === 'DIRECT' 
    ? Math.max(0, finalTotal - advancePayment)
    : Math.max(0, extraCashPaid);

  const effectiveExtraCash = extraCashPaid < minGap ? minGap : extraCashPaid;
  const financedAmount = saleType === 'INSTALLMENT' ? Math.max(0, finalTotal - (advancePayment + effectiveExtraCash)) : 0;

  const interestAmount = useMemo(() => {
    if (saleType !== 'INSTALLMENT' || !selectedScheme) return 0;
    return financedAmount * (parseFloat(selectedScheme.interest_rate) / 100);
  }, [saleType, selectedScheme, financedAmount]);

  const totalPayableWithInterest = finalTotal + interestAmount;
  const financedAmountWithInterest = financedAmount + interestAmount;

  const calculateInstallment = () => {
    if (!selectedScheme) return 0;
    const interest = financedAmount * (parseFloat(selectedScheme.interest_rate) / 100);
    return (financedAmount + interest) / selectedScheme.terms;
  };

  const handleToggleSerial = (serialObj: any) => {
    if (!serialModalProduct) return;
    setItems(prev => prev.map(item => {
      if (item.product_id !== serialModalProduct) return item;
      
      const currentSerials = item.selected_serials || [];
      const isSelected = currentSerials.some(s => s.id === serialObj.id);
      
      if (isSelected) {
        return { ...item, selected_serials: currentSerials.filter(s => s.id !== serialObj.id) };
      } else {
        if (currentSerials.length >= item.quantity) {
          alert(`You only need ${item.quantity} serial(s) for this item.`);
          return item;
        }
        return { ...item, selected_serials: [...currentSerials, serialObj] };
      }
    }));
  };

  const updateItemDiscount = (product_id: string, input: string) => {
    setItems(prev => prev.map(item => {
      if (item.product_id === product_id) {
        let pct = 0;
        if (input.endsWith('%')) {
          pct = parseFloat(input.replace('%', '')) || 0;
        } else if (input.startsWith('*')) {
          const val = parseFloat(input.replace('*', '')) || 0;
          pct = (val / (item.base_price || 1)) * 100;
        } else {
          const val = parseFloat(input) || 0;
          const lineTotal = item.quantity * (item.base_price || 0);
          pct = lineTotal > 0 ? (val / lineTotal) * 100 : 0;
        }
        
        if (pct > maxDiscountAllowed) {
          alert(`Maximum allowed discount for your role is ${maxDiscountAllowed}%`);
          return { ...item, discount_input: `${maxDiscountAllowed}%` };
        }
        return { ...item, discount_input: input };
      }
      return item;
    }));
  };

  const handleFulfill = async () => {
    // Validations
    if (saleType === 'INSTALLMENT') {
        if (!selectedSchemeId) return alert('Installment scheme is required');
        if (extraCashPaid < minGap) {
          if (!recoveryDate) return alert(`A Recovery Date is required since the extra cash paid is less than the required gap of Rs. ${minGap.toFixed(2)}`);
          const recDateObj = new Date(recoveryDate);
          const maxDateObj = new Date();
          maxDateObj.setDate(maxDateObj.getDate() + maxRecoveryDays);
          if (recDateObj > maxDateObj) {
            return alert(`Recovery date cannot exceed ${maxRecoveryDays} days from today.`);
          }
        }
    }

    const unfulfilledSerial = items.find(i => i.is_serialized && i.selected_serials?.length !== i.quantity);
    if (unfulfilledSerial) {
      alert(`Please select exactly ${unfulfilledSerial.quantity} serial numbers for ${unfulfilledSerial.product_name}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      // For serialized items, we generate a separate payload line for EACH serial item
      // For bulk, just one line with quantity
      const payloadItems: any[] = [];
      
      items.forEach(item => {
        if (item.is_serialized && item.selected_serials) {
          const discountAmt = getItemDiscount(item);
          // Split the discount evenly across the serial items
          const discountPerUnit = discountAmt / item.quantity;
          
          item.selected_serials.forEach(serial => {
            payloadItems.push({
              product_id: item.product_id,
              serial_item_id: serial.id,
              quantity: 1,
              unit_price: item.base_price,
              discount_amount: discountPerUnit,
              discount_type: 'FLAT_UNIT',
              line_total: (item.base_price || 0) - discountPerUnit
            });
          });
        } else {
          const discountAmt = getItemDiscount(item);
          const lineTotalOriginal = (item.base_price || 0) * item.quantity;
          payloadItems.push({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.base_price,
            discount_amount: discountAmt,
            discount_type: 'FLAT_UNIT',
            line_total: lineTotalOriginal - discountAmt
          });
        }
      });

      const discountedSubtotal = Math.max(0, subtotal - totalDiscount);
      const taxDetails = activeTaxes.map((tax: any) => {
        const amt = tax.type === 'EXCLUSIVE' ? (discountedSubtotal * parseFloat(tax.rate)) / 100 : (discountedSubtotal - (discountedSubtotal / (1 + parseFloat(tax.rate) / 100)));
        return { id: tax.id, name: tax.name, rate: tax.rate, type: tax.type, amount: amt };
      });

      const payload = {
        pre_order_id: id,
        customer_id: booking.customer_id,
        sale_type: saleType,
        payment_mode: paymentMode,
        subtotal: subtotal,
        total: finalTotal,
        tax_amount: totalTax,
        tax_details: JSON.stringify(taxDetails),
        downpayment: saleType === 'INSTALLMENT' ? totalDownpaymentCredited : advancePayment, 
        manual_discount: totalDiscount,
        promotion_discount: 0,
        items: payloadItems,
        ...(saleType === 'INSTALLMENT' ? {
          scheme_id: selectedSchemeId,
          partial_downpayment_recovery_date: extraCashPaid < minGap ? recoveryDate : undefined,
          guarantor_id: booking.customer_id, // For simplicity in this demo, customer acts as guarantor if none provided, or we'd need a guarantor picker
        } : {})
      };

      const res = await apiClient.post('/sales', payload);
      // alert("Booking successfully fulfilled!");
      // navigate('/sales');
      setCompletedInvoiceNo(res.data.reference_number || '');
      setSaleSuccess(true);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to fulfill booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading booking details...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate('/bookings')} style={{ background: 'var(--bg-tertiary)', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Fulfill Booking</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>Convert PreOrder #{id?.split('-')[0]} to a Sale</p>
        </div>
      </div>

      {customer && (
        <div style={{ padding: '16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'var(--brand-primary)', color: 'var(--bg-primary)', padding: '12px', borderRadius: '50%' }}>
            <User size={24} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700 }}>{customer.full_name}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{customer.mobile} • {customer.nic || 'No NIC'}</div>
          </div>
        </div>
      )}

      <div style={{ padding: '24px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Items to Fulfill</h3>
        
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ textAlign: 'left', padding: '12px 8px', color: 'var(--text-secondary)' }}>Product</th>
              <th style={{ textAlign: 'center', padding: '12px 8px', color: 'var(--text-secondary)' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '12px 8px', color: 'var(--text-secondary)' }}>Unit Price</th>
              <th style={{ textAlign: 'right', padding: '12px 8px', color: 'var(--text-secondary)' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '16px 8px' }}>
                  <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                  {item.brand_name && <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.brand_name}</div>}
                  {item.is_serialized && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ fontSize: '12px', color: item.selected_serials?.length === item.quantity ? 'var(--status-success)' : 'var(--status-warning)', fontWeight: 600, marginBottom: '6px' }}>
                        Selected: {item.selected_serials?.length || 0} / {item.quantity} serials
                      </div>
                      <button 
                        onClick={() => setSerialModalProduct(item.product_id)}
                        style={{ padding: '6px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--brand-primary)', color: 'var(--brand-primary)', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Select Serials
                      </button>
                    </div>
                  )}
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Discount:</label>
                      <input 
                        type="text" 
                        value={item.discount_input || ''}
                        onChange={e => updateItemDiscount(item.product_id, e.target.value)}
                        placeholder="Amt, %, or *Amt"
                        style={{ width: '100px', padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    {maxDiscountAllowed > 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', paddingLeft: '60px' }}>
                        Max allowed: Rs {((item.quantity * (item.base_price || 0)) * (maxDiscountAllowed / 100)).toLocaleString()} ({maxDiscountAllowed}%)
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ padding: '16px 8px', textAlign: 'center', fontWeight: 600, verticalAlign: 'top' }}>{item.quantity}</td>
                <td style={{ padding: '16px 8px', textAlign: 'right', verticalAlign: 'top' }}>Rs {(item.base_price || 0).toLocaleString()}</td>
                <td style={{ padding: '16px 8px', textAlign: 'right', fontWeight: 600, verticalAlign: 'top' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span>Rs {((item.base_price || 0) * item.quantity).toLocaleString()}</span>
                    {getItemDiscount(item) > 0 && (
                      <span style={{ fontSize: '12px', color: 'var(--status-success)' }}>- Rs {getItemDiscount(item).toLocaleString()}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Subtotal:</span>
              <span>Rs {subtotal.toLocaleString()}</span>
            </div>
            {totalDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--status-success)', fontWeight: 600 }}>
                <span>Discount:</span>
                <span>- Rs {totalDiscount.toLocaleString()}</span>
              </div>
            )}
            {totalTax > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Tax:</span>
                <span>Rs {totalTax.toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '18px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <span>Order Total:</span>
              <span>Rs {totalPayableWithInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--status-success)', fontWeight: 600 }}>
              <span>Advance Paid (Deposit):</span>
              <span>- Rs {advancePayment.toLocaleString()}</span>
            </div>
            
            {saleType === 'INSTALLMENT' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--brand-primary)', fontWeight: 600, borderTop: '1px dashed var(--border-color)', paddingTop: '8px' }}>
                <span>Remaining Balance (w/ Interest):</span>
                <span>Rs {financedAmountWithInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--brand-primary)', fontWeight: saleType === 'DIRECT' ? 700 : 600, fontSize: saleType === 'DIRECT' ? '18px' : '15px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <span>{saleType === 'DIRECT' ? 'Balance to Pay:' : 'Extra Cash Needed Now:'}</span>
              <span>Rs {balanceToPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px' }}>
        {/* Fulfillment Terms Box (already exists) */}
        <div style={{ flex: 1, padding: '24px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>Fulfillment Terms</h3>
          
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <button 
              onClick={() => setSaleType('DIRECT')}
              style={{ flex: 1, padding: '12px', background: saleType === 'DIRECT' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-primary)', border: `2px solid ${saleType === 'DIRECT' ? 'var(--status-success)' : 'var(--border-color)'}`, borderRadius: '8px', color: saleType === 'DIRECT' ? 'var(--status-success)' : 'var(--text-primary)', fontWeight: 700, cursor: 'pointer' }}
            >
              Direct Sale
            </button>
            <button 
              onClick={() => setSaleType('INSTALLMENT')}
              style={{ flex: 1, padding: '12px', background: saleType === 'INSTALLMENT' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-primary)', border: `2px solid ${saleType === 'INSTALLMENT' ? 'var(--brand-primary)' : 'var(--border-color)'}`, borderRadius: '8px', color: saleType === 'INSTALLMENT' ? 'var(--brand-primary)' : 'var(--text-primary)', fontWeight: 700, cursor: 'pointer' }}
            >
              Installment Plan
            </button>
          </div>

          {saleType === 'DIRECT' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Payment Method</label>
              <select value={paymentMode} onChange={e => setPaymentMode(e.target.value as any)} style={{ padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', fontSize: '15px', outline: 'none' }}>
                <option value="CASH">Cash</option>
                <option value="CARD">Credit Card</option>
                <option value="TRANSFER">Bank Transfer</option>
              </select>
            </div>
          )}

          {saleType === 'INSTALLMENT' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <select value={selectedSchemeId} onChange={e => setSelectedSchemeId(e.target.value)} style={{ padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}>
                  <option value="">-- Select Installment Scheme --</option>
                  {schemes?.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.terms} {s.frequency.toLowerCase()}s @ {s.interest_rate}%)</option>
                  ))}
                </select>

                {selectedScheme && (
                  <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '16px', borderRadius: '8px', border: '1px dashed var(--brand-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Advance Booking Deposit</span>
                      <span style={{ fontWeight: 600, color: 'var(--status-success)' }}>Rs {advancePayment.toLocaleString()}</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: 'var(--status-warning)', fontWeight: 500 }}>Extra Cash Payment (Due Now)</span>
                        {minGap > 0 && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Min required: Rs {minGap.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Rs</span>
                        <input 
                          type="number"
                          value={extraCashPaidInput}
                          onChange={e => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val > maxExtraCash) {
                              setExtraCashPaidInput(maxExtraCash.toString());
                            } else {
                              setExtraCashPaidInput(e.target.value);
                            }
                          }}
                          placeholder="0"
                          min={0}
                          max={maxExtraCash}
                          style={{ width: '140px', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--brand-primary)', background: 'var(--bg-primary)', textAlign: 'right', fontWeight: 700, fontSize: '14px', color: 'var(--status-warning)' }}
                        />
                      </div>
                    </div>

                    {extraCashPaid < minGap && (
                        <div style={{ marginTop: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--status-error)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                              Downpayment Shortfall
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--status-error)' }}>
                              Rs. {(minGap - extraCashPaid).toFixed(2)}
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
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', borderTop: '1px dashed var(--border-color)', paddingTop: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Total Downpayment Credited</span>
                      <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>Rs {totalDownpaymentCredited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Interest Rate</span>
                      <span style={{ fontWeight: 600 }}>{selectedScheme.interest_rate}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(59, 130, 246, 0.2)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>{selectedScheme.frequency} Installment</span>
                      <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--brand-primary)' }}>Rs {calculateInstallment().toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}
             </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
        <button 
          onClick={handleFulfill}
          disabled={isSubmitting}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            background: 'var(--brand-primary)', color: 'white', border: 'none', 
            padding: '12px 32px', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}
        >
          {isSubmitting ? 'Processing...' : (
            <>
              <CheckCircle2 size={20} />
              Complete Fulfillment
            </>
          )}
        </button>
      </div>

      {/* Serial Selection Modal */}
      {serialModalProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: '12px', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', maxHeight: '80vh', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Select Serial Numbers</h3>
              <button onClick={() => { setSerialModalProduct(null); setSerialSearchQuery(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>
            
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                <input 
                  type="text"
                  placeholder="Scan or search serial..."
                  value={serialSearchQuery}
                  onChange={e => setSerialSearchQuery(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 36px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
              {isLoadingSerials ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading serials...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {availableSerials?.filter((s: any) => s.serial_number.toLowerCase().includes(serialSearchQuery.toLowerCase())).length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No serials found.</div>
                  ) : (
                    availableSerials?.filter((s: any) => s.serial_number.toLowerCase().includes(serialSearchQuery.toLowerCase())).map((s: any) => {
                      const itemData = items.find(i => i.product_id === serialModalProduct);
                      const isSelected = itemData?.selected_serials?.some(sel => sel.id === s.id);
                      
                      return (
                        <div 
                          key={s.id} 
                          onClick={() => handleToggleSerial(s)}
                          style={{ 
                            padding: '12px 16px', border: `1px solid ${isSelected ? 'var(--brand-primary)' : 'var(--border-color)'}`, borderRadius: '8px', 
                            cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-primary)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 600 }}>{s.serial_number}</span>
                            {(s.unit_cost || s.fallback_cost) && (
                              <PermissionGuard permission="sales:view_cost">
                                <div title={`Purchase Price: Rs. ${parseFloat(s.unit_cost || s.fallback_cost).toFixed(2)}`} style={{ display: 'flex', alignItems: 'center', color: 'var(--brand-primary)' }}>
                                  <DollarSign size={14} />
                                </div>
                              </PermissionGuard>
                            )}
                          </div>
                          {isSelected && <CheckCircle2 size={18} color="var(--brand-primary)" />}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Selected: {items.find(i => i.product_id === serialModalProduct)?.selected_serials?.length || 0} / {items.find(i => i.product_id === serialModalProduct)?.quantity || 0}
              </span>
              <button 
                onClick={() => { setSerialModalProduct(null); setSerialSearchQuery(''); }} 
                style={{ padding: '8px 16px', background: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Sale Success Modal */}
      {saleSuccess && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
           <div style={{ width: '340px', padding: '24px', background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 24px 48px rgba(0,0,0,0.4)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--status-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)' }}>
                 <CheckCircle2 size={24} color="white" />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Fulfillment Successful!</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>The booking has been successfully converted into a sale.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                <button onClick={() => handlePrintReceipt()} style={{ padding: '12px', background: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)', transition: 'background 0.2s' }}>
                  <Printer size={18} /> Print Thermal Bill
                </button>
                <button onClick={() => navigate('/sales')} style={{ padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
                  Go to Sales
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Hidden Receipt Output (80mm Thermal Format) */}
      <div style={{ display: 'none' }}>
        <div ref={receiptRef} style={{ padding: '4mm', width: '80mm', color: 'black', background: 'white', fontFamily: '"Courier New", Courier, monospace', fontSize: '12px', lineHeight: '1.4', fontWeight: 'bold' }}>
          <div style={{ textAlign: 'center', marginBottom: '4mm' }}>
            {settings?.company_logo_signed_url && (
              <img 
                src={settings.company_logo_signed_url} 
                style={{ width: '30mm', height: '30mm', objectFit: 'contain', margin: '0 auto 2mm auto', display: 'block', filter: 'grayscale(100%) contrast(120%)' }}
                alt="Logo"
              />
            )}
            <h2 style={{ margin: '0 0 2px 0', fontSize: '18px', fontWeight: 'bold' }}>{settings?.company_name || 'MASTER-H STORE'}</h2>
            <p style={{ margin: 0, fontSize: '12px' }}>{activeBranch?.address || 'Branch Address'}</p>
            <p style={{ margin: 0, fontSize: '12px' }}>Tel: {(activeBranch?.phones?.length ?? 0) > 0 ? activeBranch?.phones?.map((p: any) => p.phone_number).join(' | ') : 'No Phone'}</p>
          </div>
          
          <div style={{ borderBottom: '1px dashed black', margin: '4mm 0' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span>Date: {new Date().toLocaleDateString('en-GB')}</span>
            <span>Time: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '2px' }}>
            <span>Invoice No: {completedInvoiceNo || 'N/A'}</span>
          </div>

          <div style={{ fontSize: '12px', marginTop: '2px' }}>Sale Type: {saleType === 'DIRECT' ? 'Walk-in Cash' : 'Installment'}</div>
          {customer && (
             <div style={{ fontSize: '12px', marginTop: '2px' }}>Customer: {customer.full_name}</div>
          )}
          
          <div style={{ borderBottom: '1px dashed black', margin: '4mm 0' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '2mm' }}>
            <span style={{ flex: 1 }}>Item</span>
            <span style={{ width: '15mm', textAlign: 'right' }}>Qty</span>
            <span style={{ width: '22mm', textAlign: 'right' }}>Total</span>
          </div>

          {items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '3mm' }}>
              <div style={{ width: '100%', fontWeight: 'bold' }}>
                {item.product_name}
                {item.brand_name && <span style={{ fontWeight: 'normal', fontSize: '11px', marginLeft: '4px' }}>({item.brand_name})</span>}
              </div>
              <div style={{ flex: 1, paddingLeft: '4mm', color: '#444' }}>
                @ Rs.{(item.base_price || 0).toFixed(2)}
              </div>
              <div style={{ width: '15mm', textAlign: 'right' }}>{item.quantity}</div>
              <div style={{ width: '22mm', textAlign: 'right' }}>{(item.quantity * (item.base_price || 0)).toFixed(2)}</div>
            </div>
          ))}

          <div style={{ borderBottom: '1px dashed black', margin: '4mm 0' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2mm' }}>
            <span>Subtotal</span>
            <span>Rs. {subtotal.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2mm' }}>
            <span>Discount</span>
            <span>- Rs. {totalDiscount.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2mm' }}>
            <span>Taxes</span>
            <span>+ Rs. {totalTax.toFixed(2)}</span>
          </div>
          
          <div style={{ borderBottom: '1px dashed black', margin: '4mm 0' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginBottom: '4mm' }}>
            <span>Order Total</span>
            <span>Rs. {totalPayableWithInterest.toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2mm' }}>
            <span>Advance Paid</span>
            <span>- Rs. {advancePayment.toFixed(2)}</span>
          </div>

          {saleType === 'INSTALLMENT' && (
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2mm' }}>
              <span>Extra Cash Paid</span>
              <span>- Rs. {extraCashPaid.toFixed(2)}</span>
            </div>
          )}
          
          <div style={{ borderBottom: '1px dashed black', margin: '4mm 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
            <span>{saleType === 'DIRECT' ? 'Balance Paid' : 'Remaining Balance'}</span>
            <span>Rs. {saleType === 'DIRECT' ? balanceToPay.toFixed(2) : financedAmountWithInterest.toFixed(2)}</span>
          </div>
          
          <div style={{ borderBottom: '1px dashed black', margin: '4mm 0' }} />
          
          <div style={{ textAlign: 'center', marginTop: '6mm', fontSize: '12px' }}>
            <p style={{ margin: '0 0 2px 0' }}>Thank you for your business!</p>
            <p style={{ margin: 0 }}>Please come again</p>
          </div>
        </div>
      </div>
    </div>
  );
}
