import { useState, useMemo } from 'react';
import { X, Save, ArrowLeft, PackageSearch, Search, User, Trash2 } from 'lucide-react';
import { apiClient } from '../../../lib/axios';
import { useNavigate } from 'react-router-dom';
import { useCustomerSearch } from '../../sale/api';
import { CustomerFormModal } from '../../customers/components/CustomerFormModal';
import { Combobox } from '../../../components/Combobox';
import { useProducts } from '../../catalog/api';
import { useRoutes } from '../../routes/api';

export function CreateBookingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const { data: productsResponse } = useProducts(1, 1000, '');
  const products = productsResponse?.data || [];
  
  const { data: routes } = useRoutes();

  const [cart, setCart] = useState<{product_id: string, quantity: number, name: string, unit_price: number}[]>([]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0), [cart]);
  
  const [customerQuery, setCustomerQuery] = useState('');
  const { data: searchResults } = useCustomerSearch(customerQuery);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const [formData, setFormData] = useState({
    advance_payment: 0,
    payment_method: 'CASH',
    sale_type_preference: 'DIRECT',
    receipt_number: '',
    remarks: ''
  });

  const handleAddToCart = (product_id: string) => {
    if (!product_id) return;
    const prod = products.find(p => p.id === product_id);
    if (!prod) return;

    setCart(prev => {
      const existing = prev.find(item => item.product_id === product_id);
      if (existing) {
        return prev.map(item => item.product_id === product_id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product_id, quantity: 1, name: prod.name, unit_price: parseFloat(prod.base_price || '0') }];
    });
  };

  const updateCartQty = (product_id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product_id === product_id) {
        const newQ = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQ };
      }
      return item;
    }));
  };

  const removeFromCart = (product_id: string) => {
    setCart(prev => prev.filter(item => item.product_id !== product_id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      alert("Please select a customer.");
      return;
    }
    if (!selectedCustomer.route_id) {
      alert("Selected customer does not have a route assigned. Please assign a route to the customer first.");
      return;
    }
    if (cart.length === 0) {
      alert("Please add at least one product to the booking.");
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/orders', {
        ...formData,
        customer_id: selectedCustomer.id,
        items: cart.map(item => ({ product_id: item.product_id, quantity: item.quantity })),
        advance_payment: Number(formData.advance_payment)
      });
      navigate('/bookings');
    } catch (err) {
      console.error(err);
      alert('Failed to create booking.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-sm)',
    color: 'var(--text-primary)', outline: 'none',
    fontSize: 'var(--font-size-sm)',
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
        <button onClick={() => navigate('/bookings')} style={{ background: 'var(--bg-tertiary)', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
            <PackageSearch size={28} color="var(--brand-primary)" />
            Create New Booking
          </h1>
          <p className="page-description">Draft a new customer order and capture advance deposits</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: 'var(--spacing-5)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }}>
          
          {/* Customer Selection Combobox */}
          <div style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-tertiary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={16} color="var(--brand-primary)"/> Customer *
              </label>
              <button type="button" onClick={() => setShowCustomerModal(true)} style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                + Add New
              </button>
            </div>

            {selectedCustomer ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--brand-primary)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{selectedCustomer.full_name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <span>{selectedCustomer.mobile}</span>
                    {selectedCustomer.nic && (
                      <>
                        <span style={{ color: 'var(--border-color)' }}>|</span>
                        <span>NIC: {selectedCustomer.nic}</span>
                      </>
                    )}
                    <span style={{ color: 'var(--border-color)' }}>|</span>
                    <span style={{ fontWeight: 600, color: selectedCustomer.route_id ? 'inherit' : 'var(--status-error)' }}>
                      Route: {selectedCustomer.route_id ? (routes?.find(r => r.id === selectedCustomer.route_id)?.name || 'Unknown Route') : 'No Route Assigned'}
                    </span>
                  </div>
                </div>
                <button type="button" onClick={() => setSelectedCustomer(null)} style={{ background: 'none', border: 'none', color: 'var(--status-error)', cursor: 'pointer' }}>
                  <X size={18}/>
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} size={16} />
                <input 
                  value={customerQuery} onChange={e => setCustomerQuery(e.target.value)}
                  placeholder="Search by phone, name, or NIC..."
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 36px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
                />
                {customerQuery && searchResults && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '4px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    {searchResults.map((c: any) => (
                      <div key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerQuery(''); }} style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{c.full_name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <span>{c.mobile}</span>
                          {c.nic && (
                            <>
                              <span style={{ color: 'var(--border-color)' }}>|</span>
                              <span>NIC: {c.nic}</span>
                            </>
                          )}
                          <span style={{ color: 'var(--border-color)' }}>|</span>
                          <span style={{ fontWeight: 600, color: c.route_id ? 'inherit' : 'var(--status-error)' }}>
                            {c.route_id ? (routes?.find(r => r.id === c.route_id)?.name || 'Unknown Route') : 'No Route Assigned'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Product Search (Outside the Cart Card) */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Add Product to Booking</label>
            <Combobox
              options={products.filter((p: any) => p.is_active).map((p: any) => ({ 
                value: p.id, 
                label: p.name,
                data: { sku: p.sku, categoryName: (p.category as any)?.name ?? '', price: parseFloat(p.base_price || '0') }
              })) || []}
              value=""
              onChange={(val) => {
                if (val) handleAddToCart(val);
              }}
              placeholder="Search products by name or SKU..."
              renderOption={(opt) => (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontWeight: 500, fontSize: '13px' }}>{opt.label}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {opt.data.sku}{opt.data.categoryName ? ` • ${opt.data.categoryName}` : ''}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--brand-primary)' }}>
                    Rs {opt.data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              )}
              renderValue={() => "-- Select Product to Add --"}
            />
          </div>

          {/* Cart Section */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Booking Cart</h3>
              {cart.length > 0 && (
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Total: <span style={{ color: 'var(--brand-primary)' }}>Rs {cartTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-primary)' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: '13px' }}>
                  No products added yet.
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.product_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '14px' }}>{item.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Rs {item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} each
                        <span style={{ margin: '0 8px', color: 'var(--border-color)' }}>|</span>
                        <span style={{ fontWeight: 600 }}>Line Total: Rs {(item.unit_price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '6px' }}>
                        <button type="button" onClick={() => updateCartQty(item.product_id, -1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '0 8px' }}>-</button>
                        <span style={{ fontSize: '14px', fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                        <button type="button" onClick={() => updateCartQty(item.product_id, 1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '0 8px' }}>+</button>
                      </div>
                      <button type="button" onClick={() => removeFromCart(item.product_id)} style={{ background: 'none', border: 'none', color: 'var(--status-error)', cursor: 'pointer', padding: '4px' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.1)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand-primary)' }}>Advance Deposit (Rs)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  style={inputStyle} 
                  value={formData.advance_payment || ''} 
                  placeholder="0.00" 
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val > cartTotal) {
                      setFormData(f => ({...f, advance_payment: cartTotal}));
                    } else {
                      setFormData(f => ({...f, advance_payment: isNaN(val) ? 0 : val}));
                    }
                  }} 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Payment Mode</label>
                <select style={inputStyle} value={formData.payment_method} onChange={e => setFormData(f => ({...f, payment_method: e.target.value}))}>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Sale Type Preference</label>
                <select style={inputStyle} value={formData.sale_type_preference} onChange={e => setFormData(f => ({...f, sale_type_preference: e.target.value}))}>
                  <option value="DIRECT">Direct Sale</option>
                  <option value="INSTALLMENT">Installment</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Receipt No. (Optional)</label>
                <input type="text" style={inputStyle} value={formData.receipt_number} onChange={e => setFormData(f => ({...f, receipt_number: e.target.value}))} placeholder="e.g. REC-1001" />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Remarks</label>
            <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} value={formData.remarks} onChange={e => setFormData(f => ({...f, remarks: e.target.value}))} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <button type="submit" disabled={loading || (selectedCustomer && !selectedCustomer.route_id)} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 24px', background: (selectedCustomer && !selectedCustomer.route_id) ? 'var(--bg-tertiary)' : 'var(--brand-primary)', color: (selectedCustomer && !selectedCustomer.route_id) ? 'var(--text-muted)' : 'var(--bg-primary)',
              border: 'none', borderRadius: 'var(--border-radius-sm)', fontWeight: 600, cursor: (selectedCustomer && !selectedCustomer.route_id) ? 'not-allowed' : 'pointer', fontSize: '15px'
            }}>
              <Save size={18} />
              {loading ? 'Saving...' : 'Create Booking'}
            </button>
            {selectedCustomer && !selectedCustomer.route_id && (
              <span style={{ fontSize: '12px', color: 'var(--status-error)', fontWeight: 500 }}>
                A route must be assigned to this customer before booking.
              </span>
            )}
            <button type="button" onClick={() => navigate('/bookings')} style={{
              padding: '10px 24px', background: 'transparent', border: '1px solid var(--border-color)',
              color: 'var(--text-primary)', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer', fontSize: '15px', fontWeight: 500
            }}>Cancel</button>
          </div>
        </form>
      </div>
      
      {showCustomerModal && (
        <CustomerFormModal 
          onClose={() => setShowCustomerModal(false)}
          onSuccess={() => setShowCustomerModal(false)}
        />
      )}
    </div>
  );
}
