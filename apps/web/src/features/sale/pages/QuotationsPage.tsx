import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, X, Trash2, Printer, Plus, User, CheckCircle, ArrowLeft } from 'lucide-react';
import { usePOSSearch, useCreateQuotation, useCustomerSearch } from '../api';
import { useGetSettings, useGetTaxes, useGetMe } from '../../settings/api';
import { printQuotationDocument } from '../../../lib/printQuotation';
import { CustomerFormModal } from '../../customers/components/CustomerFormModal';
import { useBranches } from '../../branches/api';
import { useBranchStore } from '../../../hooks/useBranchStore';

interface CartItem {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  is_serialized: boolean;
  image_signed_url?: string;
  quantity: number;
  available_quantity: number;
  unit_price: number;
  discount_input?: string;
}

export function QuotationsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustomerSearchModal, setShowCustomerSearchModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [quoteSaved, setQuoteSaved] = useState(false);
  const [quoteRefNumber, setQuoteRefNumber] = useState<string | null>(null);

  // APIs
  const { data: searchResults, isLoading: isSearching } = usePOSSearch(query);
  const { data: customerSearchResults, isLoading: isSearchingCustomer } = useCustomerSearch(customerQuery);
  const { data: settings } = useGetSettings();
  const { data: taxesData } = useGetTaxes();
  const { data: me } = useGetMe();
  const { data: branches } = useBranches();
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  const activeBranch = branches?.find((b: any) => b.id === activeBranchId);
  const activeTaxes = taxesData?.filter((t: any) => t.is_active) || [];

  const createQuotation = useCreateQuotation();
  const maxDiscountAllowed = me?.max_discount_percentage ? parseFloat(me.max_discount_percentage) : 0;

  // Totals
  const cartTotal = useMemo(() => cart.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0), [cart]);

  const { totalDiscountAmount, discountedSubtotal } = useMemo(() => {
    let totalDiscount = 0;
    cart.forEach(item => {
      const lineTotal = item.quantity * item.unit_price;
      let itemDiscount = 0;
      if (item.discount_input) {
        if (item.discount_input.endsWith('%')) {
          const pct = parseFloat(item.discount_input.replace('%', '')) || 0;
          itemDiscount = (lineTotal * pct) / 100;
        } else if (item.discount_input.startsWith('*')) {
          const val = parseFloat(item.discount_input.replace('*', '')) || 0;
          itemDiscount = val * item.quantity;
        } else {
          itemDiscount = parseFloat(item.discount_input) || 0;
        }
      }
      totalDiscount += itemDiscount;
    });
    return {
      totalDiscountAmount: totalDiscount,
      discountedSubtotal: cartTotal - totalDiscount
    };
  }, [cart, cartTotal]);

  // Taxes
  let totalTaxAmount = 0;
  const taxDetails: any[] = [];

  const exclusiveTaxes = activeTaxes.filter((t: any) => t.type === 'EXCLUSIVE');
  let exclusiveTaxAmount = 0;
  exclusiveTaxes.forEach((tax: any) => {
    const amt = (discountedSubtotal * parseFloat(tax.rate)) / 100;
    exclusiveTaxAmount += amt;
    totalTaxAmount += amt;
    taxDetails.push({ id: tax.id, name: tax.name, rate: tax.rate, type: tax.type, amount: amt });
  });

  const inclusiveTaxes = activeTaxes.filter((t: any) => t.type === 'INCLUSIVE');
  inclusiveTaxes.forEach((tax: any) => {
    const rate = parseFloat(tax.rate);
    const amt = discountedSubtotal - (discountedSubtotal / (1 + rate / 100));
    totalTaxAmount += amt;
    taxDetails.push({ id: tax.id, name: tax.name, rate: tax.rate, type: tax.type, amount: amt });
  });

  const grandTotal = discountedSubtotal + exclusiveTaxAmount;

  // Handlers
  const addToCart = (product: any, availableQuantity: number) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id && !i.is_serialized);
      if (existing) {
        if (existing.quantity >= existing.available_quantity) {
          alert('Cannot exceed available stock limit.');
          return prev;
        }
        return prev.map(i => i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        id: crypto.randomUUID(),
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        image_signed_url: product.image_signed_url,
        is_serialized: false,
        quantity: 1,
        available_quantity: availableQuantity ?? 0,
        unit_price: parseFloat(product.base_price),
        discount_input: ''
      }];
    });
    setQuery('');
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty < 1) return;
    setCart(prev => prev.map(i => {
      if (i.id === id && !i.is_serialized) {
        if (qty > i.available_quantity) {
          alert('Cannot exceed available stock limit.');
          return i;
        }
        return { ...i, quantity: qty };
      }
      return i;
    }));
  };

  const updateItemDiscount = (id: string, input: string) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        let pct = 0;
        if (input.endsWith('%')) {
          pct = parseFloat(input.replace('%', '')) || 0;
        } else if (input.startsWith('*')) {
          const val = parseFloat(input.replace('*', '')) || 0;
          pct = (val / item.unit_price) * 100;
        } else {
          const val = parseFloat(input) || 0;
          const lineTotal = item.quantity * item.unit_price;
          pct = (val / lineTotal) * 100;
        }
        if (maxDiscountAllowed > 0 && pct > maxDiscountAllowed) {
          alert(`Maximum allowed discount for your role is ${maxDiscountAllowed}%`);
          return { ...item, discount_input: `${maxDiscountAllowed}%` };
        }
        return { ...item, discount_input: input };
      }
      return item;
    }));
  };

  const handleSaveAndPrint = async () => {
    if (cart.length === 0) return alert('Cart is empty');
    if (!selectedCustomer) return alert('Please select a customer before printing the quotation.');

    const totals = {
      subtotal: cartTotal,
      discount: totalDiscountAmount,
      tax: totalTaxAmount,
      grandTotal,
      taxes: taxDetails
    };

    try {
      const createdQuote = await createQuotation.mutateAsync({
        customer_id: selectedCustomer?.id || null,
        subtotal: cartTotal,
        manual_discount: totalDiscountAmount,
        tax_amount: totalTaxAmount,
        tax_details: taxDetails,
        total: grandTotal,
        items: cart.map(item => {
          const lineTotal = item.quantity * item.unit_price;
          let itemDiscount = 0;
          if (item.discount_input) {
            if (item.discount_input.endsWith('%')) {
              const pct = parseFloat(item.discount_input.replace('%', '')) || 0;
              itemDiscount = (lineTotal * pct) / 100;
            } else if (item.discount_input.startsWith('*')) {
              const val = parseFloat(item.discount_input.replace('*', '')) || 0;
              itemDiscount = val * item.quantity;
            } else {
              itemDiscount = parseFloat(item.discount_input) || 0;
            }
          }
          return {
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_amount: itemDiscount,
            discount_type: item.discount_input?.endsWith('%') ? 'PERCENTAGE' : item.discount_input?.startsWith('*') ? 'FLAT_UNIT' : 'FLAT_LINE',
            line_total: lineTotal - itemDiscount
          };
        })
      });

      // Save the generated reference number for re-printing without creating another quote
      setQuoteRefNumber(createdQuote.reference_number);

      printQuotationDocument(cart, selectedCustomer, totals, settings, activeBranch, createdQuote.reference_number);
      setQuoteSaved(true);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to create quotation');
    }
  };

  const handleNewQuotation = () => {
    setCart([]);
    setSelectedCustomer(null);
    setCustomerQuery('');
    setQuery('');
    setQuoteSaved(false);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 460px', height: 'calc(100vh - 80px)', gap: '24px', overflow: 'hidden', padding: '24px' }}>

      {/* LEFT: Product Search + Cart */}
      <div className="glass-panel" style={{ order: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden', padding: '20px' }}>

        {/* Header & Back Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <button
            onClick={() => navigate('/quotations')}
            style={{
              background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)',
              borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Create Quotation</h2>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--brand-primary)' }} size={20} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Scan barcode or search products..."
            style={{
              width: '100%', padding: '12px 16px 12px 48px', fontSize: '15px', fontWeight: 500,
              background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
              borderRadius: '8px', color: 'var(--text-primary)', outline: 'none',
              transition: 'all 0.2s', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
            }}
            onFocus={e => e.target.style.border = '1px solid var(--brand-primary)'}
            onBlur={e => e.target.style.border = '1px solid var(--border-color)'}
          />
        </div>

        {/* Product Grid */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', alignContent: 'start', paddingRight: '4px' }}>
          {isSearching && <p style={{ color: 'var(--text-secondary)', fontSize: '13px', gridColumn: '1/-1' }}>Searching...</p>}



          {searchResults?.type === 'SERIAL_MATCH' && (
            <div
              onClick={() => addToCart(searchResults.data.product, 1)}
              style={{ background: 'var(--brand-primary)', color: 'white', padding: '16px', borderRadius: '8px', cursor: 'pointer', gridColumn: '1/-1' }}
            >
              <h3 style={{ margin: '0 0 4px 0' }}>EXACT SERIAL MATCH</h3>
              <p style={{ margin: '2px 0' }}>{searchResults.data.product.name}</p>
              <p style={{ margin: '2px 0' }}>SN: {searchResults.data.serialItem.serial_number}</p>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', opacity: 0.8 }}>Click to add</p>
            </div>
          )}

          {searchResults?.type === 'PRODUCT_MATCH' && searchResults.data.map((match: any) => (
            <div
              key={match.product.id}
              onClick={() => addToCart(match.product, match.available_quantity)}
              style={{
                background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px',
                cursor: 'pointer', transition: 'transform 0.2s, border-color 0.2s',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--brand-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
            >
              {match.product.image_signed_url ? (
                <img src={match.product.image_signed_url} alt={match.product.name} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '6px', marginBottom: '12px', background: 'white' }} />
              ) : (
                <div style={{ width: '100%', height: '120px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px dashed var(--border-color)', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>No Image</div>
              )}
              <h4 style={{ fontWeight: 600, marginBottom: '4px', fontSize: '13px' }}>{match.product.name}</h4>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{match.product.sku}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--brand-primary)' }}>Rs. {parseFloat(match.product.base_price).toFixed(2)}</span>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: match.available_quantity > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: match.available_quantity > 0 ? 'var(--status-success)' : 'var(--status-error)' }}>
                  {match.available_quantity || 0} left
                </span>
              </div>
            </div>
          ))}

          {searchResults?.type === 'PRODUCT_MATCH' && searchResults.data.length === 0 && query.trim() && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 0' }}>
              <p style={{ fontSize: '14px' }}>No products found for "{query}"</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Bill To + Cart */}
      <div className="glass-panel" style={{
        order: 2, display: 'flex', flexDirection: 'column', height: '100%', padding: '0', overflow: 'hidden'
      }}>
        {quoteSaved ? (
          /* Success State */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '16px', padding: '24px', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--status-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)' }}>
              <CheckCircle size={28} color="white" />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Quotation Saved!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>The quotation has been saved and sent to print.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '12px' }}>
              <button
                onClick={() => printQuotationDocument(cart, selectedCustomer, { subtotal: cartTotal, discount: totalDiscountAmount, tax: totalTaxAmount, grandTotal, taxes: taxDetails }, settings, activeBranch, quoteRefNumber || undefined)}
                style={{ padding: '12px', background: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}
              >
                <Printer size={18} /> Re-Print Quotation
              </button>
              <button
                onClick={handleNewQuotation}
                style={{ padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                New Quotation
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Bill To Header — shows selected customer or search trigger */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px', minHeight: '60px' }}>
              <div style={{ background: 'var(--brand-primary)', padding: '6px', borderRadius: '6px', color: 'white', flexShrink: 0 }}>
                <User size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bill To</div>
                {selectedCustomer ? (
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedCustomer.full_name}
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '6px' }}>{selectedCustomer.mobile}</span>
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No customer selected</div>
                )}
              </div>
              {selectedCustomer ? (
                <button
                  onClick={() => setSelectedCustomer(null)}
                  title="Remove customer"
                  style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '50%', padding: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--status-error)', cursor: 'pointer', flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                >
                  <X size={15} />
                </button>
              ) : (
                <button
                  onClick={() => { setCustomerQuery(''); setShowCustomerSearchModal(true); }}
                  title="Select customer"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, flexShrink: 0, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-primary)'; e.currentTarget.style.color = 'var(--brand-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <Search size={14} /> Select
                </button>
              )}
            </div>

            {/* Cart Items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <ShoppingCart size={28} style={{ opacity: 0.3 }} />
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: 500 }}>Cart is empty</p>
                  <p style={{ fontSize: '12px', marginTop: '4px' }}>Search and add products on the left</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {cart.map(item => {
                    const lineTotal = item.quantity * item.unit_price;
                    let itemDiscount = 0;
                    if (item.discount_input) {
                      if (item.discount_input.endsWith('%')) {
                        const pct = parseFloat(item.discount_input.replace('%', '')) || 0;
                        itemDiscount = (lineTotal * pct) / 100;
                      } else if (item.discount_input.startsWith('*')) {
                        const val = parseFloat(item.discount_input.replace('*', '')) || 0;
                        itemDiscount = val * item.quantity;
                      } else {
                        itemDiscount = parseFloat(item.discount_input) || 0;
                      }
                    }
                    const discountedLineTotal = lineTotal - itemDiscount;

                    return (
                      <div key={item.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        {item.image_signed_url ? (
                          <img src={item.image_signed_url} alt={item.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                        ) : (
                          <div style={{ width: '40px', height: '40px', background: 'var(--bg-tertiary)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', flexShrink: 0 }}>Img</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h4>
                          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{item.sku}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                          {itemDiscount > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                              <span style={{ fontWeight: 500, fontSize: '11px', color: 'var(--text-secondary)', textDecoration: 'line-through' }}>Rs. {lineTotal.toFixed(2)}</span>
                              <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--brand-primary)' }}>Rs. {discountedLineTotal.toFixed(2)}</span>
                            </div>
                          ) : (
                            <span style={{ fontWeight: 700, fontSize: '14px' }}>Rs. {lineTotal.toFixed(2)}</span>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="text"
                              placeholder="Disc"
                              value={item.discount_input || ''}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => updateItemDiscount(item.id, e.target.value)}
                              style={{ width: '70px', padding: '4px', fontSize: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', textAlign: 'right' }}
                              title="Examples: 10%, 500, *100 (per unit)"
                            />
                            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-tertiary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                              <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={{ padding: '2px 6px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>-</button>
                              <span style={{ fontSize: '12px', fontWeight: 600, width: '20px', textAlign: 'center' }}>{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ padding: '2px 6px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>+</button>
                            </div>
                            <button onClick={() => removeFromCart(item.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '4px', border: 'none', borderRadius: '4px', color: 'var(--status-error)', cursor: 'pointer' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Totals & Print Button */}
            <div style={{ padding: '12px 16px', background: 'var(--bg-tertiary)', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                <span>Subtotal</span>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Rs. {cartTotal.toFixed(2)}</span>
              </div>

              {totalDiscountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'var(--status-error)', fontSize: '13px' }}>
                  <span>Total Discount</span>
                  <span style={{ fontWeight: 500 }}>- Rs. {totalDiscountAmount.toFixed(2)}</span>
                </div>
              )}

              {activeTaxes.map((tax: any) => {
                const taxAmt = taxDetails.find((td: any) => td.id === tax.id)?.amount || 0;
                return (
                  <div key={tax.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    <span>{tax.name} ({tax.rate}%){tax.type === 'INCLUSIVE' ? ' [Incl]' : ''}</span>
                    <span style={{ fontWeight: 500, color: tax.type === 'INCLUSIVE' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                      {tax.type === 'EXCLUSIVE' ? '+' : ''} Rs. {taxAmt.toFixed(2)}
                    </span>
                  </div>
                );
              })}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', marginBottom: '10px', fontSize: '18px', fontWeight: 800, borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                <span>Total</span>
                <span style={{ color: 'var(--brand-primary)' }}>Rs. {grandTotal.toFixed(2)}</span>
              </div>

              <button
                onClick={handleSaveAndPrint}
                disabled={cart.length === 0 || createQuotation.isPending || !selectedCustomer}
                title={!selectedCustomer ? 'Select a customer first' : ''}
                style={{
                  width: '100%', padding: '10px',
                  background: (cart.length > 0 && selectedCustomer) ? 'linear-gradient(135deg, var(--brand-primary), var(--brand-cta))' : 'var(--bg-tertiary)',
                  color: (cart.length > 0 && selectedCustomer) ? 'white' : 'var(--text-muted)',
                  border: (cart.length > 0 && selectedCustomer) ? 'none' : '1px solid var(--border-color)',
                  borderRadius: '8px', fontSize: '16px', fontWeight: 700, letterSpacing: '0.5px',
                  cursor: (cart.length > 0 && selectedCustomer) ? 'pointer' : 'not-allowed',
                  opacity: (cart.length > 0 && selectedCustomer) ? 1 : 0.5,
                  display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                  boxShadow: (cart.length > 0 && selectedCustomer) ? '0 4px 12px rgba(245, 158, 11, 0.3)' : 'none',
                  transition: 'transform 0.1s, background 0.2s'
                }}
                onMouseDown={e => { if (cart.length > 0 && selectedCustomer) e.currentTarget.style.transform = 'scale(0.98)'; }}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {createQuotation.isPending ? 'Saving...' : <><Printer size={18} /> Save & Print Quotation</>}
              </button>
              {!selectedCustomer && cart.length > 0 && (
                <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--status-error)', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  ⚠ Select a customer from "Bill To" to print
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Customer Search Modal */}
      {showCustomerSearchModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={() => { setShowCustomerSearchModal(false); setCustomerQuery(''); }}
        >
          <div
            style={{ width: '440px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 24px 48px rgba(0,0,0,0.4)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Select Customer</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Search existing or create new</p>
              </div>
              <button
                onClick={() => { setShowCustomerSearchModal(false); setCustomerQuery(''); }}
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '50%', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Input */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brand-primary)' }} size={18} />
                <input
                  autoFocus
                  placeholder="Type name, phone or NIC..."
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '12px 14px 12px 44px',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                    borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px',
                    transition: 'border-color 0.15s'
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
                />
              </div>
            </div>

            {/* Results */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: '100px' }}>
              {isSearchingCustomer && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>Searching...</div>
              )}
              {!isSearchingCustomer && customerQuery.trim().length >= 2 && (!customerSearchResults || customerSearchResults.length === 0) && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No customers found for "{customerQuery}"
                </div>
              )}
              {!isSearchingCustomer && customerQuery.trim().length < 2 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Type at least 2 characters to search
                </div>
              )}
              {customerSearchResults && customerSearchResults.map((c: any) => (
                <div
                  key={c.id}
                  onClick={() => { setSelectedCustomer(c); setCustomerQuery(''); setShowCustomerSearchModal(false); }}
                  style={{ padding: '14px 24px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{c.full_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{c.mobile} &nbsp;|&nbsp; NIC: {c.nic}</div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--brand-primary)', fontWeight: 600, background: 'rgba(245,158,11,0.1)', padding: '3px 8px', borderRadius: '4px' }}>Select →</div>
                </div>
              ))}
            </div>

            {/* Divider + Create New */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
              <button
                onClick={() => { setShowCustomerSearchModal(false); setCustomerQuery(''); setShowCustomerModal(true); }}
                style={{
                  width: '100%', padding: '11px', background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-cta))',
                  color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 4px 12px rgba(245,158,11,0.25)', transition: 'opacity 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <Plus size={16} /> Create New Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Create Modal */}
      {showCustomerModal && (
        <CustomerFormModal
          onClose={() => setShowCustomerModal(false)}
          onSuccess={(cust) => {
            setSelectedCustomer(cust);
            setShowCustomerModal(false);
          }}
        />
      )}
    </div>
  );
}
