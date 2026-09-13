import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient as api } from '../../../lib/axios';
import { useBranchStore } from '../../../hooks/useBranchStore';
import { useGetTrip, useLoadTripStock } from '../api';
import { useCategories } from '../../catalog/api';
import { useAvailableSerials } from '../../sale/api';
import { Search, ArrowLeft, Package, Trash2, ScanBarcode, Check, X, ListPlus } from 'lucide-react';
import { PermissionGuard } from '../../../components/PermissionGuard';

export function LoadTripStockPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const activeBranchId = useBranchStore(state => state.activeBranchId);
  const { data: trip, isLoading: isLoadingTrip } = useGetTrip(id || '');
  const loadStock = useLoadTripStock();
  const { data: categories } = useCategories();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [barcodeInput, setBarcodeInput] = useState('');
  
  // Batch Scan Mode
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchBarcodes, setBatchBarcodes] = useState('');
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  // Manual Serial Selection Modal
  const [selectedProductIdForSerial, setSelectedProductIdForSerial] = useState<any>(null);
  const [serialSearchQuery, setSerialSearchQuery] = useState('');
  const { data: availableSerials, isLoading: isLoadingSerials } = useAvailableSerials(selectedProductIdForSerial?.id || null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Keep focus on barcode scanner by default for rapid scanning
  useEffect(() => {
    if (!isBatchMode && !selectedProductIdForSerial && barcodeInputRef.current && document.activeElement?.tagName !== 'INPUT') {
      barcodeInputRef.current.focus();
    }
  }, [isBatchMode, selectedProductIdForSerial]);

  // Cart State: { product, serials: string[], qty: number }
  const [cart, setCart] = useState<any[]>([]);

  // POS Search Query
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['pos-search', searchQuery, activeBranchId],
    queryFn: async () => {
      const res = await api.get(`/sales/pos-search?q=${searchQuery}`, {
        headers: { 'x-branch-id': activeBranchId }
      });
      return res.data;
    },
    enabled: !!activeBranchId,
  });

  const addToCart = (product: any, serialItem?: any, availableQty?: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      
      if (product.is_serialized && serialItem) {
        if (existing) {
          if (existing.serials.includes(serialItem.id)) return prev; // Already in cart
          return prev.map(item => item.product.id === product.id 
            ? { ...item, serials: [...item.serials, serialItem.id], qty: item.qty + 1, available_qty: availableQty ?? item.available_qty }
            : item
          );
        }
        return [...prev, { product, serials: [serialItem.id], qty: 1, available_qty: availableQty }];
      } else {
        const limit = availableQty !== undefined ? availableQty : (existing?.available_qty ?? 999999);
        if (existing) {
          if (existing.qty >= limit) {
            alert(`Cannot add more. Only ${limit} units of ${product.name} are available in stock.`);
            return prev;
          }
          return prev.map(item => item.product.id === product.id 
            ? { ...item, qty: item.qty + 1, available_qty: limit }
            : item
          );
        }
        if (limit <= 0) {
          alert(`Cannot add. ${product.name} is out of stock.`);
          return prev;
        }
        return [...prev, { product, qty: 1, available_qty: limit }];
      }
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId && !item.product.is_serialized) {
        const limit = item.available_qty ?? 999999;
        const newQty = item.qty + delta;
        if (newQty > limit) {
          alert(`Cannot increase quantity. Only ${limit} units of ${item.product.name} are available in stock.`);
          return item;
        }
        return { ...item, qty: Math.max(1, newQty) };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string, serialId?: string) => {
    setCart(prev => {
      if (serialId) {
        return prev.map(item => {
          if (item.product.id === productId) {
            const newSerials = item.serials.filter((s: string) => s !== serialId);
            return { ...item, serials: newSerials, qty: newSerials.length };
          }
          return item;
        }).filter(item => item.qty > 0);
      }
      return prev.filter(item => item.product.id !== productId);
    });
  };

  // Handle Barcode Scan
  const handleBarcodeSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && barcodeInput) {
      try {
        const res = await api.get(`/sales/pos-search?q=${barcodeInput}`, {
          headers: { 'x-branch-id': activeBranchId }
        });
        
        const data = res.data;
        if (data.type === 'SERIAL_MATCH') {
          addToCart(data.data.product, data.data.serialItem);
          setBarcodeInput('');
        } else if (data.type === 'PRODUCT_MATCH' && data.data.length === 1 && !data.data[0].product.is_serialized) {
          addToCart(data.data[0].product, undefined, data.data[0].available_quantity);
          setBarcodeInput('');
        } else {
          alert("Barcode not found in active inventory or multiple matches found.");
        }
      } catch (err) {
        alert("Error scanning barcode.");
      }
    }
  };

  const processBatchBarcodes = async () => {
    if (!batchBarcodes.trim()) return;
    setIsProcessingBatch(true);
    
    // Split by newline and remove empty lines
    const codes = batchBarcodes.split('\n').map(code => code.trim()).filter(Boolean);
    let notFoundCount = 0;
    
    for (const code of codes) {
      try {
        const res = await api.get(`/sales/pos-search?q=${code}`, {
          headers: { 'x-branch-id': activeBranchId }
        });
        const data = res.data;
        if (data.type === 'SERIAL_MATCH') {
          addToCart(data.data.product, data.data.serialItem);
        } else if (data.type === 'PRODUCT_MATCH' && data.data.length === 1 && !data.data[0].product.is_serialized) {
          addToCart(data.data[0].product, undefined, data.data[0].available_quantity);
        } else {
          notFoundCount++;
        }
      } catch (err) {
        notFoundCount++;
      }
    }
    
    setIsProcessingBatch(false);
    setBatchBarcodes('');
    if (notFoundCount > 0) {
      alert(`Batch complete. ${notFoundCount} barcodes were invalid or not found.`);
    } else {
      alert("All barcodes successfully processed and added to cart!");
    }
  };

  const handleConfirmLoad = async () => {
    if (cart.length === 0) return;
    
    // Flatten cart into API payload
    const items: any[] = [];
    cart.forEach(item => {
      if (item.product.is_serialized) {
        item.serials.forEach((serialId: string) => {
          items.push({ product_id: item.product.id, serial_item_id: serialId, loaded_qty: 1 });
        });
      } else {
        items.push({ product_id: item.product.id, loaded_qty: item.qty });
      }
    });

    try {
      await loadStock.mutateAsync({ tripId: trip.id, payload: { items } });
      navigate(`/trips/${trip.id}`);
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to load stock");
    }
  };

  if (isLoadingTrip) return <div style={{ padding: '24px' }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', background: 'var(--bg-secondary)' }}>
      
      {/* LEFT COLUMN: THE CART */}
      <div style={{ width: '400px', background: 'var(--bg-primary)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate(`/trips/${trip.id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><ArrowLeft size={20}/></button>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Van Staging Area</h2>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Trip to {trip.route?.name}</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px' }}>
              <Package size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
              <div>Cart is empty. Scan or search items to load.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {cart.map((item, idx) => (
                <div key={idx} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-tertiary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.product.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.product.sku} | {item.product.is_serialized ? 'Serialized' : 'Bulk'}</div>
                      {!item.product.is_serialized && item.available_qty !== undefined && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Available Branch Stock: {item.available_qty}
                        </div>
                      )}
                    </div>
                    {!item.product.is_serialized && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-primary)', padding: '4px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <button onClick={() => updateCartQty(item.product.id, -1)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px' }}>-</button>
                        <span style={{ fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                        <button 
                          onClick={() => updateCartQty(item.product.id, 1)} 
                          disabled={item.qty >= (item.available_qty ?? 999999)}
                          style={{ border: 'none', background: 'none', cursor: item.qty >= (item.available_qty ?? 999999) ? 'not-allowed' : 'pointer', opacity: item.qty >= (item.available_qty ?? 999999) ? 0.3 : 1, padding: '4px' }}
                        >
                          +
                        </button>
                        <button onClick={() => removeFromCart(item.product.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: 'var(--status-error)' }}><Trash2 size={16}/></button>
                      </div>
                    )}
                  </div>
                  
                  {item.product.is_serialized && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Scanned Serials ({item.qty}):</div>
                      {item.serials.map((sId: string) => (
                        <div key={sId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'var(--bg-primary)', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '13px', fontFamily: 'monospace' }}>
                          <span><Check size={14} color="var(--status-success)" style={{ marginRight: '8px', verticalAlign: 'middle' }}/>{sId.substring(0,8)}...</span>
                          <button onClick={() => removeFromCart(item.product.id, sId)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--status-error)' }}><Trash2 size={14}/></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
          <PermissionGuard permission="trips:update" behavior="disable">
            <button 
              onClick={handleConfirmLoad}
              disabled={cart.length === 0 || loadStock.isPending}
              style={{ width: '100%', padding: '14px', background: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '15px', cursor: cart.length === 0 ? 'not-allowed' : 'pointer', opacity: cart.length === 0 || loadStock.isPending ? 0.5 : 1 }}
            >
              {loadStock.isPending ? 'Loading...' : 'Confirm Load to Van'}
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* RIGHT COLUMN: INVENTORY / BROWSER */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', gap: '20px', overflowY: 'auto' }}>
        
        {/* Scanner & Search Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Barcode Scanner</span>
              <button 
                onClick={() => setIsBatchMode(!isBatchMode)}
                style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ListPlus size={16} /> {isBatchMode ? 'Switch to Single Scan' : 'Switch to Batch Scan'}
              </button>
            </div>
            
            {isBatchMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea 
                  placeholder="Scan or paste multiple barcodes here (one per line)..."
                  value={batchBarcodes}
                  onChange={e => setBatchBarcodes(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '12px', background: 'var(--bg-primary)', border: '2px solid var(--brand-primary)', borderRadius: '12px', fontSize: '14px', fontFamily: 'monospace', outline: 'none', minHeight: '120px', resize: 'vertical' }}
                />
                <button 
                  onClick={processBatchBarcodes}
                  disabled={isProcessingBatch || !batchBarcodes.trim()}
                  style={{ padding: '12px', background: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: isProcessingBatch || !batchBarcodes.trim() ? 'not-allowed' : 'pointer', opacity: isProcessingBatch || !batchBarcodes.trim() ? 0.5 : 1 }}
                >
                  {isProcessingBatch ? 'Processing Scans...' : 'Process Batch Barcodes'}
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <ScanBarcode size={20} style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--brand-primary)' }} />
                <input 
                  ref={barcodeInputRef}
                  placeholder="Scan Barcode here..."
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  onKeyDown={handleBarcodeSubmit}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px 14px 48px', background: 'var(--bg-primary)', border: '2px solid var(--brand-primary)', borderRadius: '12px', fontSize: '15px', fontWeight: 600, outline: 'none', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)' }}
                />
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={20} style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-secondary)' }} />
            <input 
              placeholder="Search product manually by name or SKU..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px 14px 48px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', fontSize: '15px', outline: 'none' }}
            />
          </div>
        </div>

        {/* Category Filters */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
          <button 
            onClick={() => setSelectedCategory('ALL')}
            style={{ padding: '8px 16px', borderRadius: '20px', fontWeight: 600, border: '1px solid var(--border-color)', cursor: 'pointer', whiteSpace: 'nowrap', background: selectedCategory === 'ALL' ? 'var(--brand-primary)' : 'var(--bg-primary)', color: selectedCategory === 'ALL' ? 'white' : 'var(--text-primary)' }}
          >
            All Categories
          </button>
          {categories?.map((cat: any) => (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{ padding: '8px 16px', borderRadius: '20px', fontWeight: 600, border: '1px solid var(--border-color)', cursor: 'pointer', whiteSpace: 'nowrap', background: selectedCategory === cat.id ? 'var(--brand-primary)' : 'var(--bg-primary)', color: selectedCategory === cat.id ? 'white' : 'var(--text-primary)' }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search Results Grid */}
        <div>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>
            {searchQuery.length > 2 ? 'Search Results' : 'Available Inventory'}
          </h3>
          {isSearching ? (
            <div style={{ color: 'var(--text-secondary)' }}>Loading branch inventory...</div>
          ) : searchResults?.data?.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)' }}>No matches found in your active branch warehouses.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
              {searchResults?.data?.map((match: any, idx: number) => {
                if (searchResults.type === 'PRODUCT_MATCH' && (!selectedCategory || selectedCategory === 'ALL' || match.product.category_id === selectedCategory)) {
                  return (
                    <div key={idx} style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ fontWeight: 600 }}>{match.product.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{match.product.sku} | {match.product.is_serialized ? 'Serialized' : 'Bulk'}</div>
                      </div>
                      
                      {/* Warehouse breakdown badges */}
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {match.warehouse_breakdown?.map((wb: any) => {
                          const isTrip = wb.warehouse_name?.startsWith('Trip');
                          return (
                            <span key={wb.warehouse_id} style={{ 
                              fontSize: '10px', 
                              fontWeight: 600, 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              background: isTrip 
                                ? 'rgba(245, 158, 11, 0.1)' 
                                : wb.quantity > 0 
                                  ? 'rgba(16, 185, 129, 0.1)' 
                                  : 'rgba(239, 68, 68, 0.1)', 
                              color: isTrip 
                                ? '#b45309' 
                                : wb.quantity > 0 
                                  ? 'var(--status-success)' 
                                  : 'var(--status-error)' 
                            }}>
                              {wb.warehouse_name}: {wb.quantity}
                            </span>
                          );
                        })}
                        {(!match.warehouse_breakdown || match.warehouse_breakdown.length === 0) && (
                          <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-error)' }}>
                            Out of stock
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          Total: {match.available_quantity}
                        </span>
                        <button 
                          onClick={() => match.product.is_serialized ? setSelectedProductIdForSerial(match.product) : addToCart(match.product, undefined, match.available_quantity)}
                          disabled={match.available_quantity <= 0}
                          style={{ padding: '6px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: match.available_quantity > 0 ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: '12px' }}
                        >
                          {match.product.is_serialized ? 'Select Serial' : 'Add to Cart'}
                        </button>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>

      </div>

      {/* Manual Serial Selection Modal */}
      {selectedProductIdForSerial && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ width: '400px', padding: '24px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Select Serial Number</h2>
              <button onClick={() => { setSelectedProductIdForSerial(null); setSerialSearchQuery(''); }} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '50%', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
              </button>
            </div>
            
            <p style={{ color: 'var(--brand-primary)', margin: '0 0 12px 0', fontWeight: 600, fontSize: '13px' }}>{selectedProductIdForSerial.name}</p>

            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <Search style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} size={16} />
              <input 
                autoFocus
                placeholder="Search serial..." 
                value={serialSearchQuery} 
                onChange={(e) => setSerialSearchQuery(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 36px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingRight: '8px' }}>
              {isLoadingSerials ? (
                <p style={{ color: 'var(--text-secondary)', gridColumn: 'span 2', fontSize: '13px' }}>Loading available serials...</p>
              ) : (() => {
                let filteredSerials = availableSerials?.filter((serial: any) => {
                  const cartItem = cart.find((item: any) => item.product.id === selectedProductIdForSerial.id);
                  if (cartItem && cartItem.serials.includes(serial.id)) return false;
                  return true;
                });
                if (serialSearchQuery) {
                  filteredSerials = filteredSerials?.filter((serial: any) => serial.serial_number.toLowerCase().includes(serialSearchQuery.toLowerCase()));
                }
                if (!filteredSerials || filteredSerials.length === 0) {
                  return <p style={{ color: 'var(--status-error)', gridColumn: 'span 2', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', fontSize: '13px' }}>No serial numbers left in stock.</p>;
                }
                return filteredSerials.map((serial: any) => (
                  <button 
                    key={serial.id}
                    onClick={() => {
                      addToCart(selectedProductIdForSerial, serial);
                    }}
                    style={{ 
                      padding: '8px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', 
                      transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--brand-primary)';
                      e.currentTarget.style.background = 'rgba(245, 158, 11, 0.05)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.background = 'var(--bg-primary)';
                    }}
                  >
                    <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600 }}>{serial.serial_number}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>
                      {serial.warehouse_name || 'Branch Stock'}
                    </span>
                  </button>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
