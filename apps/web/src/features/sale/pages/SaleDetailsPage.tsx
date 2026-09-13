import { useState, useRef, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetSaleDetails, useVoidSale, useUpdateSaleNotes } from '../api';
import { useGetContractHistory } from '../../collections/api';
import { useGetSettings } from '../../settings/api';
import { ArrowLeft, CornerUpLeft, ShieldAlert, Receipt, User, CreditCard, FileSignature, Image as ImageIcon, MapPin, Clock, CheckCircle2, AlertCircle, Printer, Trash2 } from 'lucide-react';
import { NICViewModal } from '../../customers/components/NICViewModal';

export function SaleDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sale, isLoading } = useGetSaleDetails(id || '');
  const { data: settings } = useGetSettings();
  const voidSaleMutation = useVoidSale();
  const updateNotesMutation = useUpdateSaleNotes();
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editNotesText, setEditNotesText] = useState('');

  const groupedItems = useMemo(() => {
    if (!sale?.items) return [];
    const map = new Map<string, any>();
    for (const item of sale.items) {
      const key = item.product.id;
      if (map.has(key)) {
        const existing = map.get(key);
        existing.quantity += item.quantity;
        existing.line_total = (Number(existing.line_total) + Number(item.line_total)).toString();
        existing.discount_amount = (Number(existing.discount_amount || 0) + Number(item.discount_amount || 0)).toString();
        if (item.serialItem) {
          existing.serialItems.push(item.serialItem);
        }
      } else {
        map.set(key, {
          ...item,
          quantity: item.quantity,
          line_total: item.line_total,
          discount_amount: item.discount_amount || '0',
          serialItems: item.serialItem ? [item.serialItem] : []
        });
      }
    }
    return Array.from(map.values());
  }, [sale?.items]);

  // Total discount = sum of all item-level discounts + any sale-level manual/promotion discount
  // Mobile sales store discount per item; web POS sales store as manual_discount/promotion_discount
  const totalItemDiscount = useMemo(() =>
    (sale?.items || []).reduce((sum: number, item: any) => sum + Number(item.discount_amount || 0), 0)
  , [sale?.items]);
  const totalDiscount = totalItemDiscount + Number(sale?.promotion_discount || 0) + Number(sale?.manual_discount || 0);

  const receiptRef = useRef<HTMLDivElement>(null);
  const handlePrintReceipt = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Receipt-${sale?.id || 'Bill'}`,
  });

  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading sale details...</div>;
  if (!sale) return <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>Sale not found.</div>;

  const handleVoidSale = () => {
    if (sale.status === 'CANCELLED') return;
    const confirm = window.confirm("Are you SURE you want to VOID this sale?\n\nThis will completely cancel any installment schedules, wipe out any associated collections, and return the items to inventory (or trip stock).\n\nThis action cannot be undone.");
    if (confirm) {
      voidSaleMutation.mutate(sale.id, {
        onSuccess: () => {
          alert('Sale successfully voided.');
        },
        onError: (err: any) => {
          alert(`Failed to void sale: ${err.response?.data?.message || err.message}`);
        }
      });
    }
  };

  const handleSaveNotes = () => {
    updateNotesMutation.mutate(
      { saleId: sale.id, notes: editNotesText },
      {
        onSuccess: () => {
          setIsEditingNotes(false);
        },
        onError: (err: any) => {
          alert(`Failed to update notes: ${err.response?.data?.message || err.message}`);
        }
      }
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <button 
        onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '24px', fontWeight: 600 }}
      >
        <ArrowLeft size={18} /> Back to Sales
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={24} /> Sale Receipt
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>ID: {sale.id}</p>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>{new Date(sale.created_at).toLocaleString('en-GB')}</p>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <User size={12} /> Sold by: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sale.creator?.name || 'Unknown Staff'}</span>
          </p>
          {sale.status === 'CANCELLED' && (
            <div style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--status-error-light)', color: 'var(--status-error)', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}>
              <AlertCircle size={15} /> VOIDED / CANCELLED
            </div>
          )}
          {(sale.is_fully_returned || sale.status === 'RETURNED') && (
            <div style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
              <CornerUpLeft size={15} /> REFUNDED / FULLY RETURNED {sale.total_refunded > 0 ? `(Rs. ${Number(sale.total_refunded).toLocaleString('en-GB')})` : ''}
            </div>
          )}
          {sale.is_partially_returned && !sale.is_fully_returned && sale.status !== 'RETURNED' && (
            <div style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
              <CornerUpLeft size={15} /> PARTIALLY RETURNED {sale.total_refunded > 0 ? `(Refund: Rs. ${Number(sale.total_refunded).toLocaleString('en-GB')})` : ''}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={handlePrintReceipt}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--brand-primary)', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: 'white', boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)' }}
          >
            <Printer size={16} /> Print Bill 
          </button>
          <button 
            onClick={() => navigate(`/returns?saleId=${sale.id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)' }}
          >
            <CornerUpLeft size={16} /> Process Return
          </button>
          <button 
            onClick={() => navigate(`/warranty?saleId=${sale.id}`)}
            disabled={sale.status === 'CANCELLED'}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 600, cursor: sale.status === 'CANCELLED' ? 'not-allowed' : 'pointer', color: 'var(--text-primary)', opacity: sale.status === 'CANCELLED' ? 0.5 : 1 }}
          >
            <ShieldAlert size={16} /> Open Warranty Claim
          </button>
          {sale.status !== 'CANCELLED' && (
            <button 
              onClick={handleVoidSale}
              disabled={voidSaleMutation.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--status-error-light)', border: '1px solid var(--status-error)', borderRadius: '8px', fontWeight: 600, cursor: voidSaleMutation.isPending ? 'not-allowed' : 'pointer', color: 'var(--status-error)' }}
            >
              <Trash2 size={16} /> {voidSaleMutation.isPending ? 'Voiding...' : 'Void Sale'}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}><User size={16} /> Customer Info</h3>
          {sale.customer ? (
            <div 
              style={{ cursor: 'pointer', transition: 'opacity 0.2s' }} 
              onClick={() => navigate(`/customers/${sale.customer.id}`)}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px', color: 'var(--brand-primary)' }}>{sale.customer.full_name}</div>
              <div style={{ color: 'var(--text-secondary)' }}>{sale.customer.mobile}</div>
              <div style={{ color: 'var(--text-secondary)' }}>{sale.customer.nic}</div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-secondary)' }}>Walk-in Customer</div>
          )}
        </div>

        <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}><CreditCard size={16} /> Payment Info</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Sale Type</span>
            <span style={{ fontWeight: 600 }}>{sale.sale_type}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
            <span>Rs. {sale.subtotal}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Discount</span>
            <span style={{ color: totalDiscount > 0 ? 'var(--status-error)' : undefined }}>
              {totalDiscount > 0 ? `-Rs. ${totalDiscount.toFixed(2)}` : 'Rs. 0.00'}
            </span>
          </div>
          {sale.taxes && sale.taxes.length > 0 && sale.taxes.map((t: any) => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{t.name} ({t.rate}%)</span>
              <span>Rs. {t.amount}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-color)', marginTop: '8px' }}>
            <span style={{ fontWeight: 600 }}>Total</span>
            <span style={{ fontWeight: 700, fontSize: '18px', color: 'var(--brand-primary)' }}>
              Rs. {(() => {
                const baseTotal = Number(sale.total);
                if (sale.sale_type === 'INSTALLMENT' && sale.contract?.scheme) {
                  const downpaymentPaid = Number(sale.contract.downpayment);
                  // Use actual recovery schedule (installment_number=0) for accurate effectiveDp
                  const recoverySchedule = sale.contract.schedules?.find((s: any) => s.installment_number === 0);
                  const recoveryAmount = recoverySchedule ? Number(recoverySchedule.amount_due) : 0;
                  const effectiveDp = downpaymentPaid + recoveryAmount;
                  const principal = baseTotal - effectiveDp;
                  const interest = principal * (Number(sale.contract.scheme.interest_rate || 0) / 100);
                  return (baseTotal + interest).toFixed(2);
                }
                return baseTotal.toFixed(2);
              })()}
            </span>
          </div>
          {sale.sale_type === 'INSTALLMENT' && sale.contract?.scheme && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                <span>Downpayment Paid</span>
                <span>Rs. {Number(sale.contract.downpayment).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>
                <span>Remaining Balance</span>
                <span>
                  Rs. {(() => {
                    const baseTotal = Number(sale.total);
                    const downpaymentPaid = Number(sale.contract.downpayment);
                    // Use actual recovery schedule (installment_number=0) for accurate effectiveDp
                    const recoverySchedule = sale.contract.schedules?.find((s: any) => s.installment_number === 0);
                    const recoveryAmount = recoverySchedule ? Number(recoverySchedule.amount_due) : 0;
                    const effectiveDp = downpaymentPaid + recoveryAmount;
                    const principal = baseTotal - effectiveDp;
                    const interest = principal * (Number(sale.contract.scheme.interest_rate || 0) / 100);
                    return (baseTotal + interest - downpaymentPaid).toFixed(2);
                  })()}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {sale.contract && (
        <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}><FileSignature size={16} /> Contract & Guarantor</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '12px' }}>Guarantor Details</div>
              <div style={{ fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Name: </span> <span style={{ fontWeight: 500 }}>{sale.contract.guarantor?.full_name || 'N/A'}</span>
              </div>
              <div style={{ fontSize: '14px', marginTop: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>NIC: </span> <span style={{ fontWeight: 500 }}>{sale.contract.guarantor?.nic || 'N/A'}</span>
              </div>
              <div style={{ fontSize: '14px', marginTop: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Mobile: </span> <span style={{ fontWeight: 500 }}>{sale.contract.guarantor?.mobile || 'N/A'}</span>
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '12px' }}>Documents & Signatures</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <ImageLinkButton label="Guarantor NIC Front" url={sale.contract.guarantor?.nic_front_signed_url} onClick={() => sale.contract.guarantor?.nic_front_signed_url && setPreviewDoc({ url: sale.contract.guarantor.nic_front_signed_url, title: `Guarantor NIC - Front Side (${sale.contract.guarantor?.full_name || ''})` })} />
                <ImageLinkButton label="Guarantor NIC Back" url={sale.contract.guarantor?.nic_back_signed_url} onClick={() => sale.contract.guarantor?.nic_back_signed_url && setPreviewDoc({ url: sale.contract.guarantor.nic_back_signed_url, title: `Guarantor NIC - Back Side (${sale.contract.guarantor?.full_name || ''})` })} />
                <ImageLinkButton label="Customer Sig" url={sale.contract.signature_signed_url} onClick={() => sale.contract.signature_signed_url && setPreviewDoc({ url: sale.contract.signature_signed_url, title: `Customer Signature (${sale.customer?.full_name || 'Customer'})` })} />
                <ImageLinkButton label="Guarantor Sig" url={sale.contract.guarantor_signature_signed_url} onClick={() => sale.contract.guarantor_signature_signed_url && setPreviewDoc({ url: sale.contract.guarantor_signature_signed_url, title: `Guarantor Signature (${sale.contract.guarantor?.full_name || ''})` })} />
              </div>
            </div>
          </div>
        </div>
      )}

      {sale.contract && (
        <CollectionHistoryTimeline contractId={sale.contract.id} customerLat={sale.customer?.gps_lat} customerLng={sale.customer?.gps_lng} />
      )}

      <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
             Sale Notes
          </h3>
          <button 
            onClick={() => {
              if (isEditingNotes) {
                setIsEditingNotes(false);
              } else {
                setEditNotesText(sale.notes || '');
                setIsEditingNotes(true);
              }
            }}
            style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            {isEditingNotes ? 'Cancel' : (sale.notes ? 'Edit Notes' : '+ Add Notes')}
          </button>
        </div>
        
        {isEditingNotes ? (
          <div>
            <textarea
              value={editNotesText}
              onChange={(e) => setEditNotesText(e.target.value)}
              placeholder="Enter notes..."
              style={{ width: '100%', minHeight: '80px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontFamily: 'inherit', marginBottom: '12px', boxSizing: 'border-box' }}
            />
            <button 
              onClick={handleSaveNotes}
              disabled={updateNotesMutation.isPending}
              style={{ padding: '8px 16px', background: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: updateNotesMutation.isPending ? 'not-allowed' : 'pointer' }}
            >
              {updateNotesMutation.isPending ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        ) : (
          <div style={{ fontSize: '14px', color: sale.notes ? 'var(--text-primary)' : 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
            {sale.notes || 'No notes added.'}
          </div>
        )}
      </div>

      <div style={{ background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Order Items</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 20px' }}>Item</th>
              <th style={{ padding: '12px 20px', textAlign: 'center' }}>Qty</th>
              <th style={{ padding: '12px 20px', textAlign: 'right' }}>Unit Price</th>
              <th style={{ padding: '12px 20px', textAlign: 'right' }}>Discount</th>
              <th style={{ padding: '12px 20px', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {groupedItems.map((item: any) => {
              const hasDiscount = Number(item.discount_amount) > 0;
              const discountLabel = hasDiscount
                ? item.discount_type === 'PERCENTAGE'
                  ? `${((Number(item.discount_amount) / (Number(item.unit_price) * item.quantity)) * 100).toFixed(1)}%`
                  : `-Rs. ${Number(item.discount_amount).toFixed(2)}`
                : null;
              return (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ fontWeight: 600 }}>{item.product.name}</div>
                  {item.serialItems && item.serialItems.length > 0 && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      S/Ns: {item.serialItems.map((s: any) => s.serial_number).join(', ')}
                    </div>
                  )}
                </td>
                <td style={{ padding: '16px 20px', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ padding: '16px 20px', textAlign: 'right' }}>Rs. {item.unit_price}</td>
                <td style={{ padding: '16px 20px', textAlign: 'right', color: hasDiscount ? 'var(--status-error)' : 'var(--text-secondary)', fontWeight: hasDiscount ? 600 : 400 }}>
                  {hasDiscount ? discountLabel : '—'}
                </td>
                <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600 }}>Rs. {Number(item.line_total).toFixed(2)}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {previewDoc && (
        <NICViewModal 
          imageUrl={previewDoc.url}
          title={previewDoc.title}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      {/* Hidden Receipt Output (80mm Thermal Format) */}
      <div style={{ display: 'none' }}>
        <div ref={receiptRef} style={{ padding: '4mm', width: '80mm', color: '#000', background: 'white', fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif', fontSize: '13px', lineHeight: '1.4', fontWeight: 900, WebkitFontSmoothing: 'none', textRendering: 'optimizeSpeed', letterSpacing: '0.3px' }}>
          <div style={{ textAlign: 'center', marginBottom: '4mm' }}>
            {settings?.company_logo_signed_url && (
              <img 
                src={settings.company_logo_signed_url} 
                style={{ width: '30mm', height: '30mm', objectFit: 'contain', margin: '0 auto 2mm auto', display: 'block', filter: 'contrast(200%) grayscale(100%)' }}
                alt="Logo"
              />
            )}
            <h2 style={{ margin: '0 0 2px 0', fontSize: '18px', fontWeight: 'bold' }}>{settings?.company_name || 'MASTER-H STORE'}</h2>
            <p style={{ margin: 0, fontSize: '12px' }}>{sale.branch?.address || 'Branch Address'}</p>
            <p style={{ margin: 0, fontSize: '12px' }}>Tel: {sale.branch?.phones?.length > 0 ? sale.branch.phones.map((p: any) => p.phone_number).join(' | ') : 'No Phone'}</p>
          </div>
          
          <div style={{ borderBottom: '1px dashed black', margin: '4mm 0' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span>Date: {new Date(sale.created_at).toLocaleDateString('en-GB')}</span>
            <span>Time: {new Date(sale.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '2px' }}>
            <span>Invoice No: {sale.reference_number || sale.id.slice(0, 8)}</span>
          </div>
          
          {sale.customer && (
            <div style={{ fontSize: '12px', marginTop: '2px' }}>
              Customer: {sale.customer.full_name}
            </div>
          )}

          <div style={{ fontSize: '12px', marginTop: '2px' }}>Sale Type: {sale.sale_type === 'DIRECT' ? 'Walk-in Cash' : 'Installment'}</div>
          <div style={{ fontSize: '12px', marginTop: '2px' }}>
            Cashier / Rep: {sale.creator?.name || 'Staff'} {sale.creator?.phone_number ? `(Tel: ${sale.creator.phone_number})` : ''}
          </div>
          
          <div style={{ borderBottom: '1px dashed black', margin: '4mm 0' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '2mm' }}>
            <span style={{ flex: 1 }}>Item</span>
            <span style={{ width: '15mm', textAlign: 'right' }}>Qty</span>
            <span style={{ width: '22mm', textAlign: 'right' }}>Total</span>
          </div>

          {groupedItems.map((item: any) => {
            const hasDiscount = Number(item.discount_amount) > 0;
            return (
            <div key={item.id} style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '3mm' }}>
              <div style={{ width: '100%', fontWeight: 'bold' }}>{item.product?.name || 'Unknown Item'}</div>
              <div style={{ flex: 1, paddingLeft: '4mm', color: '#444' }}>
                {item.serialItems && item.serialItems.length > 0 ? (
                  <>SNs: {item.serialItems.map((s: any) => s.serial_number).join(', ')}</>
                ) : (
                  `SKU: ${item.product?.sku || 'N/A'}`
                )}
                {item.product?.warranty_type && item.product.warranty_type !== 'NONE' ? (
                  <><br/>{item.product.warranty_type === 'WARRANTY' ? 'Warranty' : 'Guaranty'}: {item.product.warranty_period_years ? `${item.product.warranty_period_years} Yr ` : ''}{item.product.warranty_period_months ? `${item.product.warranty_period_months} Mo` : ''}</>
                ) : null}
                <br/>
                @ Rs.{Number(item.unit_price).toFixed(2)}
                {hasDiscount && (
                  <> | Disc: -Rs.{Number(item.discount_amount).toFixed(2)}</>
                )}
              </div>
              <div style={{ width: '15mm', textAlign: 'right' }}>{item.quantity}</div>
              <div style={{ width: '22mm', textAlign: 'right' }}>{Number(item.line_total).toFixed(2)}</div>
            </div>
            );
          })}

          <div style={{ borderBottom: '1px dashed black', margin: '4mm 0' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2mm' }}>
            <span>Subtotal</span>
            <span>Rs. {Number(sale.subtotal).toFixed(2)}</span>
          </div>
          {totalDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2mm' }}>
              <span>Discount</span>
              <span>-Rs. {totalDiscount.toFixed(2)}</span>
            </div>
          )}
          {sale.taxes && sale.taxes.length > 0 && sale.taxes.map((t: any) => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2mm' }}>
              <span>{t.name} ({t.rate}%)</span>
              <span>Rs. {Number(t.amount || 0).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ borderBottom: '1px dashed black', margin: '2mm 0' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px', margin: '4mm 0' }}>
            <span>GRAND TOTAL</span>
            <span>Rs. {(() => {
              const baseTotal = Number(sale.total);
              if (sale.sale_type === 'INSTALLMENT' && sale.contract?.scheme) {
                const downpaymentPaid = Number(sale.contract.downpayment);
                // Use actual recovery schedule (installment_number=0) for accurate effectiveDp
                const recoverySchedule = sale.contract.schedules?.find((s: any) => s.installment_number === 0);
                const recoveryAmount = recoverySchedule ? Number(recoverySchedule.amount_due) : 0;
                const effectiveDp = downpaymentPaid + recoveryAmount;
                const principal = baseTotal - effectiveDp;
                const interest = principal * (Number(sale.contract.scheme.interest_rate || 0) / 100);
                return (baseTotal + interest).toFixed(2);
              }
              return baseTotal.toFixed(2);
            })()}</span>
          </div>

          {sale.sale_type === 'INSTALLMENT' && sale.contract && (
            (() => {
              const total = Number(sale.total);
              const downpaymentPaid = Number(sale.contract.downpayment);
              
              const recoverySchedule = sale.contract.schedules?.find((s: any) => s.installment_number === 0);
              const recoveryDueDate = recoverySchedule ? recoverySchedule.due_date : null;
              
              const regularSchedule = sale.contract.schedules?.find((s: any) => s.installment_number === 1);
              
              let recoveryAmount = recoverySchedule ? Number(recoverySchedule.amount_due) : 0;
              let installmentAmount = regularSchedule ? Number(regularSchedule.amount_due) : 0;
              
              // Derive effectiveDp from actual schedules: paid DP + recovery gap
              const effectiveDp = downpaymentPaid + recoveryAmount;
              const principal = total - effectiveDp;
              
              const interest = sale.contract.scheme ? (principal * (Number(sale.contract.scheme?.interest_rate || 0) / 100)) : 0;
              const totalPayableWithInterest = total + interest;

              // Fallback to on-the-fly math if schedules are missing
              if (!sale.contract.schedules || sale.contract.schedules.length === 0) {
                const minPercent = Number(sale.contract.scheme?.min_downpayment_percent || 0);
                const requiredDownpayment = (total * minPercent) / 100;
                const hasRecovery = downpaymentPaid < requiredDownpayment;
                recoveryAmount = hasRecovery ? requiredDownpayment - downpaymentPaid : 0;
                installmentAmount = (principal + interest) / Number(sale.contract.scheme?.terms || 1);
              }
              
              const hasRecovery = recoveryAmount > 0;
              
              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2mm' }}>
                    <span>Amount Paid (Downpayment)</span>
                    <span>Rs. {downpaymentPaid.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '2mm' }}>
                    <span>Remaining Balance</span>
                    <span>Rs. {(totalPayableWithInterest - downpaymentPaid).toFixed(2)}</span>
                  </div>
                  {sale.contract.scheme && (
                    <>
                      <div style={{ borderBottom: '1px dashed black', margin: '2mm 0' }} />
                      <div style={{ textAlign: 'center', margin: '2mm 0' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '12px' }}>Installment Structure</div>
                        {hasRecovery && (
                          <div style={{ fontWeight: 'bold', marginBottom: '2px', color: '#b45309' }}>
                            Downpayment Recovery: Rs. {recoveryAmount.toFixed(2)}
                            {recoveryDueDate && ` (Due: ${new Date(recoveryDueDate).toLocaleDateString('en-GB')})`}
                          </div>
                        )}
                        <div style={{ fontWeight: 'bold' }}>
                          Rs. {installmentAmount.toFixed(2)} X {sale.contract.scheme.terms} {sale.contract.scheme.frequency.toLowerCase()}s
                        </div>
                        <div style={{ marginTop: '2px', fontWeight: 'bold' }}>Next Due: {
                          (() => {
                            const d = new Date(sale.created_at);
                            if(sale.contract.scheme.frequency === 'MONTHLY') d.setMonth(d.getMonth() + 1);
                            else if(sale.contract.scheme.frequency === 'WEEKLY') d.setDate(d.getDate() + 7);
                            else if(sale.contract.scheme.frequency === 'DAILY') d.setDate(d.getDate() + 1);
                            return d.toLocaleDateString('en-GB');
                          })()
                        }</div>
                      </div>
                    </>
                  )}
                </>
              );
            })()
          )}
          
          <div style={{ borderBottom: '1px dashed black', margin: '2mm 0' }} />
          
          <div style={{ textAlign: 'center', marginTop: '4mm', fontSize: '12px' }}>
            <p style={{ margin: '0 0 2px 0' }}>Thank you for shopping with us!</p>
            <p style={{ margin: 0 }}>Please retain receipt for warranty.</p>
          </div>
        </div>
      </div>

    </div>
  );
}

function ImageLinkButton({ label, url, onClick }: { label: string, url: string | null, onClick: () => void }) {
  if (!url) {
    return (
      <div style={{ padding: '8px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-secondary)', flex: 1, textAlign: 'center', opacity: 0.5, cursor: 'not-allowed' }}>
        {label} (N/A)
      </div>
    );
  }
  return (
    <button onClick={onClick} style={{ padding: '8px 12px', background: 'var(--bg-primary)', border: '1px solid var(--brand-primary)', color: 'var(--brand-primary)', borderRadius: '6px', fontSize: '12px', fontWeight: 600, flex: 1, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
      <ImageIcon size={14} /> {label}
    </button>
  );
}

function CollectionHistoryTimeline({ contractId, customerLat, customerLng }: { contractId: string, customerLat?: string | null, customerLng?: string | null }) {
  const { data: history, isLoading } = useGetContractHistory(contractId);

  if (isLoading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading history...</div>;
  if (!history || history.length === 0) return null;

  return (
    <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Clock size={16} /> Collection & Visit History
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '12px' }}>
        {/* Vertical line */}
        <div style={{ position: 'absolute', top: '0', bottom: '0', left: '19px', width: '2px', background: 'var(--border-color)', zIndex: 0 }}></div>
        
        {history.map((event: any) => {
          const isSuccess = event.type === 'RECEIPT' || event.status === 'COLLECTED';
          
          return (
            <div key={event.id} style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 1 }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: isSuccess ? 'var(--brand-primary)' : 'var(--danger-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '4px' }}>
                {isSuccess ? <CheckCircle2 size={10} color="#fff" /> : <AlertCircle size={10} color="#fff" />}
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px', flex: 1, border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, color: isSuccess ? 'var(--brand-primary)' : 'var(--danger-color)' }}>
                    {isSuccess ? `Payment Collected (Rs. ${event.amount})` : `Missed Visit: ${event.status.replace(/_/g, ' ')}`}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {new Date(event.date).toLocaleString('en-GB')}
                  </span>
                </div>
                
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  {event.remarks}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={12} /> {event.user}
                  </span>
                  {event.gps_lat && event.gps_lng && event.gps_lat !== 'null' && event.gps_lng !== 'null' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} /> {event.gps_lat}, {event.gps_lng}
                      </span>
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&origin=${event.gps_lat},${event.gps_lng}&destination=${(customerLat && customerLat !== 'null') ? customerLat : event.gps_lat},${(customerLng && customerLng !== 'null') ? customerLng : event.gps_lng}&travelmode=driving`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ padding: '4px 8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', textDecoration: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <MapPin size={12} /> Deviation Route
                      </a>
                    </div>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.5 }}>
                      <MapPin size={12} /> No GPS Data (Office Visit)
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
