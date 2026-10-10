import { useState, useMemo, useRef } from 'react';
import { Search, ShoppingCart, X, CreditCard, Trash2, Printer, DollarSign, ChevronLeft, ChevronRight, Layers, Tag } from 'lucide-react';
import { usePOSSearch, useAvailableSerials } from '../api';
import { useCategories, useBrands } from '../../catalog/api';
import { useReactToPrint } from 'react-to-print';
import { SinglePageCheckout } from '../components/SinglePageCheckout';
import { useGetSettings, useGetTaxes, useGetMe } from '../../settings/api';
import { PermissionGuard } from '../../../components/PermissionGuard';
import { useBranches } from '../../branches/api';
import { useBranchStore } from '../../../hooks/useBranchStore';

interface CartItem {
  id: string; // unique cart row id
  product_id: string;
  name: string;
  brand_name?: string;
  sku: string;
  is_serialized: boolean;
  serial_item_id?: string;
  serial_number?: string;
  selected_serials?: Array<{ id: string; serial_number: string; unit_cost?: string }>;
  image_signed_url?: string;
  quantity: number;
  available_quantity: number;
  unit_price: number;
  min_downpayment_amount?: string;
  discount_input?: string;
  last_purchase_price?: string;
  warranty_type?: "NONE" | "WARRANTY" | "GUARANTY" | "GUARANTEE";
  warranty_period_years?: number;
  warranty_period_months?: number;
}

export function POS2Page() {
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [selectedProductIdForSerial, setSelectedProductIdForSerial] = useState<any>(null);
  
  const [saleSuccess, setSaleSuccess] = useState(false);
  const [lastCompletedCart, setLastCompletedCart] = useState<CartItem[]>([]);
  const [lastCompletedTotal, setLastCompletedTotal] = useState(0);
  const [lastCompletedDiscount, setLastCompletedDiscount] = useState(0);
  const [lastCompletedTaxAmount, setLastCompletedTaxAmount] = useState(0);
  const [lastCompletedSaleType, setLastCompletedSaleType] = useState<string>('DIRECT');
  const [lastCompletedInvoiceNo, setLastCompletedInvoiceNo] = useState<string>('');
  const [lastCompletedCustomer, setLastCompletedCustomer] = useState<any>(null);
  const [lastCompletedDownpayment, setLastCompletedDownpayment] = useState(0);
  const [lastCompletedScheme, setLastCompletedScheme] = useState<any>(null);
  const [lastCompletedRecoveryDate, setLastCompletedRecoveryDate] = useState<string | null>(null);

  // Calculate interest for completed installment receipts
  const lastCompletedInterest = useMemo(() => {
    if (lastCompletedSaleType !== 'INSTALLMENT' || !lastCompletedScheme) return 0;
    const minPercent = parseFloat(lastCompletedScheme.min_downpayment_percent || 0);
    const requiredDownpayment = lastCompletedCart.reduce((sum, item) => {
      const flatDp = (parseFloat(item.min_downpayment_amount || "0")) * item.quantity;
      const baseLineTotal = item.unit_price * item.quantity;
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
      const schemeDp = (lineTotal * minPercent) / 100;
      return sum + Math.max(flatDp, schemeDp);
    }, 0);
    const effectiveDp = lastCompletedDownpayment < requiredDownpayment ? requiredDownpayment : lastCompletedDownpayment;
    const principal = lastCompletedTotal - effectiveDp;
    return principal * (parseFloat(lastCompletedScheme.interest_rate || 0) / 100);
  }, [lastCompletedSaleType, lastCompletedScheme, lastCompletedCart, lastCompletedDownpayment, lastCompletedTotal]);

  const lastCompletedTotalPayableWithInterest = lastCompletedTotal + lastCompletedInterest;

  const [serialSearchQuery, setSerialSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const brandScrollRef = useRef<HTMLDivElement>(null);

  // We debounce the search input slightly in a real app, here we just use it directly
  const { data: searchResults, isLoading: isSearching } = usePOSSearch(query);
  const { data: availableSerials, isLoading: isLoadingSerials } = useAvailableSerials(selectedProductIdForSerial?.id || null);
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  
  const activeCategories = useMemo(() => categories?.filter((c: any) => c.is_active) || [], [categories]);
  const activeBrands = useMemo(() => brands?.filter((b: any) => b.is_active) || [], [brands]);

  const allProductMatches = useMemo(() => {
    return searchResults?.type === 'PRODUCT_MATCH' && Array.isArray(searchResults.data) ? searchResults.data : [];
  }, [searchResults]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of allProductMatches) {
      const catId = m.product.category_id || m.product.category?.id;
      if (catId) {
        counts[catId] = (counts[catId] || 0) + 1;
      }
    }
    return counts;
  }, [allProductMatches]);

  const brandCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of allProductMatches) {
      const bId = m.product.brand_id || m.product.brand?.id;
      if (bId) {
        counts[bId] = (counts[bId] || 0) + 1;
      }
    }
    return counts;
  }, [allProductMatches]);

  const filteredProducts = useMemo(() => {
    let list = allProductMatches;
    if (selectedCategoryId) {
      list = list.filter((m: any) => {
        const catId = m.product.category_id || m.product.category?.id;
        return catId === selectedCategoryId;
      });
    }
    if (selectedBrandId) {
      list = list.filter((m: any) => {
        const bId = m.product.brand_id || m.product.brand?.id;
        return bId === selectedBrandId;
      });
    }
    return list;
  }, [allProductMatches, selectedCategoryId, selectedBrandId]);

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    return activeCategories.find((c: any) => c.id === selectedCategoryId);
  }, [activeCategories, selectedCategoryId]);

  const selectedBrand = useMemo(() => {
    if (!selectedBrandId) return null;
    return activeBrands.find((b: any) => b.id === selectedBrandId);
  }, [activeBrands, selectedBrandId]);

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      categoryScrollRef.current.scrollBy({ left: direction === 'left' ? -220 : 220, behavior: 'smooth' });
    }
  };

  const scrollBrands = (direction: 'left' | 'right') => {
    if (brandScrollRef.current) {
      brandScrollRef.current.scrollBy({ left: direction === 'left' ? -220 : 220, behavior: 'smooth' });
    }
  };
  
  const { data: settings } = useGetSettings();
  const { data: taxesData } = useGetTaxes();
  const { data: me } = useGetMe();
  const activeTaxes = taxesData?.filter((t: any) => t.is_active) || [];

  const { data: branches } = useBranches();
  const { activeBranchId } = useBranchStore();
  const activeBranch = branches?.find((b: any) => b.id === activeBranchId) || branches?.[0];
  
  const receiptRef = useRef<HTMLDivElement>(null);
  const handlePrintReceipt = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: 'Receipt',
  });

  const maxDiscountAllowed = me?.max_discount_percentage ? parseFloat(me.max_discount_percentage) : 0;

  // Compute total discount based on item-level discounts
  const cartTotal = useMemo(() => cart.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0), [cart]);

  const { totalDiscountAmount, discountedSubtotal } = useMemo(() => {
    let totalDiscount = 0;
    cart.forEach(item => {
      let lineTotal = item.quantity * item.unit_price;
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
  
  // Calculate Exclusive Taxes (added on top of discounted subtotal)
  const exclusiveTaxes = activeTaxes.filter((t: any) => t.type === 'EXCLUSIVE');
  let exclusiveTaxAmount = 0;
  exclusiveTaxes.forEach((tax: any) => {
    const amt = (discountedSubtotal * parseFloat(tax.rate)) / 100;
    exclusiveTaxAmount += amt;
    totalTaxAmount += amt;
    taxDetails.push({ id: tax.id, name: tax.name, rate: tax.rate, type: tax.type, amount: amt });
  });

  // Calculate Inclusive Taxes (already inside the price, so we just break it out)
  const inclusiveTaxes = activeTaxes.filter((t: any) => t.type === 'INCLUSIVE');
  inclusiveTaxes.forEach((tax: any) => {
    const rate = parseFloat(tax.rate);
    const amt = discountedSubtotal - (discountedSubtotal / (1 + rate / 100));
    totalTaxAmount += amt;
    taxDetails.push({ id: tax.id, name: tax.name, rate: tax.rate, type: tax.type, amount: amt });
  });

  const finalTotal = discountedSubtotal + exclusiveTaxAmount;

  const addToCart = (product: any, serial?: any, availableQuantity?: number) => {
    setCart(prev => {
      // If it's a serialized product and specific serial is chosen
      if (serial) {
        if (prev.some(item => item.selected_serials?.some(s => s.serial_number === serial.serial_number))) {
          alert('This serial number is already in the cart.');
          return prev;
        }

        const existing = prev.find(i => i.product_id === product.id && i.is_serialized);
        if (existing) {
          const currentSerials = existing.selected_serials || [];
          return prev.map(i => i.id === existing.id ? {
            ...i,
            quantity: i.quantity + 1,
            selected_serials: [...currentSerials, { id: serial.id, serial_number: serial.serial_number, unit_cost: serial.unit_cost || product.last_purchase_price }]
          } : i);
        }

        return [...prev, {
          id: product.id,
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          brand_name: product.brand?.name,
          is_serialized: true,
          selected_serials: [{ id: serial.id, serial_number: serial.serial_number, unit_cost: serial.unit_cost || product.last_purchase_price }],
          image_signed_url: product.image_signed_url,
          last_purchase_price: product.last_purchase_price,
          quantity: 1,
          available_quantity: availableQuantity ?? 1,
          unit_price: parseFloat(product.base_price),
          min_downpayment_amount: product.min_downpayment_amount,
          warranty_type: product.warranty_type,
          warranty_period_years: product.warranty_period_years,
          warranty_period_months: product.warranty_period_months,
          discount_input: ''
        }];
      }

      // If bulk, validate out of stock
      const qtyLimit = availableQuantity ?? 0;
      if (qtyLimit <= 0) {
        alert('This product is out of stock.');
        return prev;
      }

      const existing = prev.find(i => i.product_id === product.id && !i.is_serialized);
      if (existing) {
        if (existing.quantity >= existing.available_quantity) {
          alert('Cannot exceed available stock limit.');
          return prev;
        }
        return prev.map(i => i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i);
      }

      return [...prev, {
        id: product.id,
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        brand_name: product.brand?.name,
        image_signed_url: product.image_signed_url,
        is_serialized: false,
        last_purchase_price: product.last_purchase_price,
        quantity: 1,
        available_quantity: qtyLimit,
        unit_price: parseFloat(product.base_price),
        min_downpayment_amount: product.min_downpayment_amount,
        warranty_type: product.warranty_type,
        warranty_period_years: product.warranty_period_years,
        warranty_period_months: product.warranty_period_months,
        discount_input: ''
      }];
    });
    setQuery(''); // clear search after adding
  };

  const removeSerialFromCartItem = (productId: string, serialId: string) => {
    setCart(prev => prev.map(item => {
      if (item.product_id === productId && item.is_serialized) {
        const filtered = item.selected_serials?.filter(s => s.id !== serialId) || [];
        if (filtered.length === 0) {
          return null;
        }
        return {
          ...item,
          quantity: filtered.length,
          selected_serials: filtered
        };
      }
      return item;
    }).filter(Boolean) as CartItem[]);
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
        // Validate against maxDiscountAllowed
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
        
        if (pct > maxDiscountAllowed) {
          alert(`Maximum allowed discount for your role is ${maxDiscountAllowed}%`);
          return { ...item, discount_input: `${maxDiscountAllowed}%` };
        }
        return { ...item, discount_input: input };
      }
      return item;
    }));
  };

  const handleCheckoutClick = () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
  };

  const handleSerialSelect = (serialItem: any) => {
    addToCart(selectedProductIdForSerial, serialItem);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', gap: '16px', overflow: 'hidden', padding: '16px 24px' }}>
      
      {/* Top Full-Width Category & Brand Filter Ribbons */}
      {(activeCategories.length > 0 || activeBrands.length > 0) && (
        <div 
          className="glass-panel"
          style={{ 
            display: 'flex', 
            flexDirection: 'column',
            padding: '10px 16px', 
            gap: '8px', 
            flexShrink: 0,
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
          }}
        >
          {/* Row 1: Categories Ribbon */}
          {activeCategories.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700, minWidth: '92px', flexShrink: 0 }}>
                <Layers size={14} color="var(--brand-primary)" />
                <span>Categories:</span>
              </div>

              {/* Scroll Left Button */}
              <button
                type="button"
                onClick={() => scrollCategories('left')}
                title="Scroll Categories Left"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '50%',
                  width: '22px',
                  height: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.background = 'var(--bg-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                }}
              >
                <ChevronLeft size={13} />
              </button>

              {/* Category Scrolling Track */}
              <div
                ref={categoryScrollRef}
                style={{
                  display: 'flex',
                  gap: '6px',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  padding: '2px 0',
                  flex: 1,
                }}
              >
                {/* "All Categories" Chip */}
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId(null)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '16px',
                    border: selectedCategoryId === null ? '1px solid var(--brand-primary)' : '1px solid var(--border-color)',
                    background: selectedCategoryId === null ? 'var(--brand-primary)' : 'var(--bg-tertiary)',
                    color: selectedCategoryId === null ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: selectedCategoryId === null ? 700 : 500,
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease',
                    boxShadow: selectedCategoryId === null ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCategoryId !== null) {
                      e.currentTarget.style.background = 'var(--bg-primary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCategoryId !== null) {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  <span>All Categories</span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: '10px',
                      background: selectedCategoryId === null ? 'rgba(255,255,255,0.25)' : 'var(--bg-primary)',
                      color: selectedCategoryId === null ? '#ffffff' : 'var(--text-muted)',
                    }}
                  >
                    {allProductMatches.length}
                  </span>
                </button>

                {/* Individual Category Chips */}
                {activeCategories.map((cat: any) => {
                  const isSelected = selectedCategoryId === cat.id;
                  const count = categoryCounts[cat.id] || 0;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '16px',
                        border: isSelected ? '1px solid var(--brand-primary)' : '1px solid var(--border-color)',
                        background: isSelected ? 'var(--brand-primary)' : 'var(--bg-tertiary)',
                        color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'var(--bg-primary)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'var(--bg-tertiary)';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }
                      }}
                    >
                      <span>{cat.name}</span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '10px',
                          background: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--bg-primary)',
                          color: isSelected ? '#ffffff' : 'var(--text-muted)',
                        }}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Scroll Right Button */}
              <button
                type="button"
                onClick={() => scrollCategories('right')}
                title="Scroll Categories Right"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '50%',
                  width: '22px',
                  height: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.background = 'var(--bg-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                }}
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}

          {/* Row 2: Brands Ribbon */}
          {activeBrands.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700, minWidth: '92px', flexShrink: 0 }}>
                <Tag size={14} color="#8b5cf6" />
                <span>Brands:</span>
              </div>

              {/* Scroll Left Button */}
              <button
                type="button"
                onClick={() => scrollBrands('left')}
                title="Scroll Brands Left"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '50%',
                  width: '22px',
                  height: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.background = 'var(--bg-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                }}
              >
                <ChevronLeft size={13} />
              </button>

              {/* Brand Scrolling Track */}
              <div
                ref={brandScrollRef}
                style={{
                  display: 'flex',
                  gap: '6px',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  padding: '2px 0',
                  flex: 1,
                }}
              >
                {/* "All Brands" Chip */}
                <button
                  type="button"
                  onClick={() => setSelectedBrandId(null)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '16px',
                    border: selectedBrandId === null ? '1px solid #8b5cf6' : '1px solid var(--border-color)',
                    background: selectedBrandId === null ? '#8b5cf6' : 'var(--bg-tertiary)',
                    color: selectedBrandId === null ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: selectedBrandId === null ? 700 : 500,
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease',
                    boxShadow: selectedBrandId === null ? '0 2px 6px rgba(139,92,246,0.25)' : 'none',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (selectedBrandId !== null) {
                      e.currentTarget.style.background = 'var(--bg-primary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedBrandId !== null) {
                      e.currentTarget.style.background = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  <span>All Brands</span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: '10px',
                      background: selectedBrandId === null ? 'rgba(255,255,255,0.25)' : 'var(--bg-primary)',
                      color: selectedBrandId === null ? '#ffffff' : 'var(--text-muted)',
                    }}
                  >
                    {allProductMatches.length}
                  </span>
                </button>

                {/* Individual Brand Chips */}
                {activeBrands.map((brand: any) => {
                  const isSelected = selectedBrandId === brand.id;
                  const count = brandCounts[brand.id] || 0;

                  return (
                    <button
                      key={brand.id}
                      type="button"
                      onClick={() => setSelectedBrandId(isSelected ? null : brand.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '16px',
                        border: isSelected ? '1px solid #8b5cf6' : '1px solid var(--border-color)',
                        background: isSelected ? '#8b5cf6' : 'var(--bg-tertiary)',
                        color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 2px 6px rgba(139,92,246,0.25)' : 'none',
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'var(--bg-primary)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'var(--bg-tertiary)';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }
                      }}
                    >
                      <span>{brand.name}</span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '10px',
                          background: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--bg-primary)',
                          color: isSelected ? '#ffffff' : 'var(--text-muted)',
                        }}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Scroll Right Button */}
              <button
                type="button"
                onClick={() => scrollBrands('right')}
                title="Scroll Brands Right"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '50%',
                  width: '22px',
                  height: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.background = 'var(--bg-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                }}
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}

          {/* Active Filter Clear Helper Badge */}
          {(selectedCategoryId !== null || selectedBrandId !== null) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px', borderTop: '1px dashed var(--border-color)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                Active Filters: {selectedCategory ? `Category: ${selectedCategory.name}` : ''}{selectedCategory && selectedBrand ? ' · ' : ''}{selectedBrand ? `Brand: ${selectedBrand.name}` : ''} ({filteredProducts.length} matching products)
              </span>
              <button
                type="button"
                onClick={() => { setSelectedCategoryId(null); setSelectedBrandId(null); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  cursor: 'pointer',
                  marginLeft: 'auto'
                }}
              >
                <X size={11} />
                <span>Reset Filters</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Two-Column POS Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 460px', flex: 1, gap: '20px', overflow: 'hidden' }}>
        
        {/* Left side: Products & Search Area */}
        <div className="glass-panel" style={{ order: 1, display: 'flex', flexDirection: 'column', gap: '14px', overflow: 'hidden', padding: '18px' }}>
          
          {/* Search Bar */}
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--brand-primary)' }} size={20} />
            <input 
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                selectedCategory && selectedBrand
                  ? `Search inside ${selectedCategory.name} (${selectedBrand.name}) or scan barcode...`
                  : selectedCategory
                  ? `Search inside ${selectedCategory.name} or scan barcode...`
                  : selectedBrand
                  ? `Search inside ${selectedBrand.name} or scan barcode...`
                  : "Scan barcode or search products..."
              }
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
          {isSearching && <p>Searching...</p>}
          
          {searchResults?.type === 'SERIAL_MATCH' && (
            <div 
              onClick={() => addToCart(searchResults.data.product, searchResults.data.serialItem, 1)}
              style={{ background: 'var(--brand-primary)', color: 'white', padding: '16px', borderRadius: '8px', cursor: 'pointer', gridColumn: '1 / -1' }}
            >
              <h3>EXACT SERIAL MATCH</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <p>{searchResults.data.product.name}</p>
                {searchResults.data.product.brand && <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px' }}>{searchResults.data.product.brand.name}</span>}
                {searchResults.data.product.category && <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px' }}>{searchResults.data.product.category.name}</span>}
                {searchResults.data.product.last_purchase_price && (
                  <PermissionGuard permission="sales:view_cost">
                    <div title={`Last Purchase Price: Rs. ${parseFloat(searchResults.data.product.last_purchase_price).toFixed(2)}`} style={{ display: 'flex', alignItems: 'center', marginLeft: '8px', color: 'var(--brand-primary)' }}>
                      <DollarSign size={14} />
                    </div>
                  </PermissionGuard>
                )}
              </div>
              <p>SN: {searchResults.data.serialItem.serial_number}</p>
              <p>Click or Press Enter to add</p>
            </div>
          )}

          {searchResults?.type === 'PRODUCT_MATCH' && filteredProducts.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
              <p style={{ fontSize: '14px', fontWeight: 600 }}>
                No products found {selectedCategory && selectedBrand ? `for "${selectedCategory.name}" and "${selectedBrand.name}"` : selectedCategory ? `in "${selectedCategory.name}"` : selectedBrand ? `for "${selectedBrand.name}"` : ''}.
              </p>
              {(selectedCategoryId || selectedBrandId) && (
                <button
                  type="button"
                  onClick={() => { setSelectedCategoryId(null); setSelectedBrandId(null); }}
                  style={{
                    marginTop: '10px',
                    padding: '6px 14px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--brand-primary)',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Clear Filters ({allProductMatches.length} Products)
                </button>
              )}
            </div>
          )}

          {searchResults?.type === 'PRODUCT_MATCH' && filteredProducts.map((match: any) => (
            <div 
              key={match.product.id}
              onClick={() => {
                if (match.product.is_serialized) {
                  setSelectedProductIdForSerial(match.product);
                } else {
                  addToCart(match.product, undefined, match.available_quantity);
                }
              }}
              style={{
                background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px',
                cursor: 'pointer', opacity: 1, transition: 'transform 0.2s, border-color 0.2s',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--brand-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
            >
              {match.product.image_signed_url ? (
                <img src={match.product.image_signed_url} alt={match.product.name} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '6px', marginBottom: '12px', background: 'white' }} />
              ) : (
                <div style={{ width: '100%', height: '120px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px dashed var(--border-color)', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No Image</div>
              )}
              <h4 style={{ fontWeight: 600, marginBottom: '4px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {match.product.name}
                {match.product.last_purchase_price && (
                  <PermissionGuard permission="sales:view_cost">
                    <div title={`Last Purchase Price: Rs. ${parseFloat(match.product.last_purchase_price).toFixed(2)}`} style={{ display: 'flex', alignItems: 'center', color: 'var(--brand-primary)' }}>
                      <DollarSign size={14} />
                    </div>
                  </PermissionGuard>
                )}
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{match.product.sku}</span>
                {match.product.brand && (
                  <span style={{ 
                    fontSize: '10px', 
                    padding: '2px 6px', 
                    background: 'var(--bg-tertiary)', 
                    color: 'var(--text-primary)', 
                    borderRadius: '4px',
                    fontWeight: 500,
                    border: '1px solid var(--border-color)'
                  }}>
                    {match.product.brand.name}
                  </span>
                )}
                {match.product.category && (
                  <span style={{ 
                    fontSize: '10px', 
                    padding: '2px 6px', 
                    background: 'rgba(59, 130, 246, 0.08)', 
                    color: '#60a5fa', 
                    borderRadius: '4px',
                    fontWeight: 500,
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}>
                    {match.product.category.name}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--brand-primary)' }}>Rs. {parseFloat(match.product.base_price).toFixed(2)}</span>
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
              </div>
              {match.product.is_serialized && (
                <div style={{ marginTop: '10px', fontSize: '10px', fontWeight: 600, background: 'rgba(245, 158, 11, 0.1)', color: 'var(--brand-primary)', padding: '4px', textAlign: 'center', borderRadius: '4px' }}>
                  Select Serial Number
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Left side visually: The Cart (Main Card) */}
      <div className="glass-panel" style={{ 
        order: 2, display: 'flex', flexDirection: 'column', height: '100%', padding: '0', overflow: 'hidden'
      }}>
        {isCheckingOut ? (
          <SinglePageCheckout 
            cart={cart}
            subtotal={cartTotal}
            total={finalTotal}
            discountAmount={totalDiscountAmount}
            taxAmount={totalTaxAmount}
            taxDetails={taxDetails}
            onCancel={() => setIsCheckingOut(false)}
            onSuccess={(data, type, customer, dp, scheme, recoveryDate) => {
              setLastCompletedCart([...cart]);
              setLastCompletedTotal(finalTotal);
              setLastCompletedDiscount(totalDiscountAmount);
              setLastCompletedTaxAmount(totalTaxAmount);
              setLastCompletedSaleType(type);
              setLastCompletedInvoiceNo(data?.reference_number || '');
              setLastCompletedCustomer(customer);
              setLastCompletedDownpayment(dp || 0);
              setLastCompletedScheme(scheme || null);
              setLastCompletedRecoveryDate(recoveryDate || null);
              
              setCart([]);
              setIsCheckingOut(false);
              setSaleSuccess(true);
            }}
          />
        ) : (
          <>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'var(--brand-primary)', padding: '6px', borderRadius: '6px', color: 'white' }}>
            <ShoppingCart size={18} />
          </div>
          <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Current Sale</h2>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <ShoppingCart size={28} style={{ opacity: 0.3 }} />
              </div>
              <p style={{ fontSize: '14px', fontWeight: 500 }}>Your cart is empty</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>Scan or select products</p>
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
                    <div style={{ width: '40px', height: '40px', background: 'var(--bg-tertiary)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)' }}>Img</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {item.name} 
                      {item.brand_name && <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>({item.brand_name})</span>}
                      {item.is_serialized && <span style={{ color: 'var(--brand-primary)', fontSize: '11px', fontWeight: 700 }}> (Qty: {item.quantity})</span>}
                      {!item.is_serialized && item.last_purchase_price && (
                        <PermissionGuard permission="sales:view_cost">
                          <div title={`Last Purchase Price: Rs. ${parseFloat(item.last_purchase_price).toFixed(2)}`} style={{ display: 'flex', alignItems: 'center', color: 'var(--brand-primary)', marginLeft: '4px' }}>
                            <DollarSign size={14} />
                          </div>
                        </PermissionGuard>
                      )}
                    </h4>
                    {item.is_serialized ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                        {item.selected_serials?.map(s => (
                          <span 
                            key={s.id} 
                            style={{ 
                              fontSize: '10px', 
                              color: 'var(--text-primary)', 
                              fontFamily: 'monospace', 
                              padding: '2px 6px', 
                              background: 'var(--bg-tertiary)', 
                              borderRadius: '4px', 
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              border: '1px solid var(--border-color)'
                            }}
                          >
                            {s.serial_number}
                            {s.unit_cost && (
                              <PermissionGuard permission="sales:view_cost">
                                <div title={`Purchase Price: Rs. ${parseFloat(s.unit_cost).toFixed(2)}`} style={{ display: 'flex', alignItems: 'center', color: 'var(--brand-primary)', marginLeft: '2px' }}>
                                  <DollarSign size={12} />
                                </div>
                              </PermissionGuard>
                            )}
                            <button 
                              onClick={() => removeSerialFromCartItem(item.product_id, s.id)}
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                padding: 0, 
                                cursor: 'pointer', 
                                color: 'var(--text-secondary)',
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}
                              title="Remove serial"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>{item.sku}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    {itemDiscount > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontWeight: 500, fontSize: '12px', color: 'var(--text-secondary)', textDecoration: 'line-through' }}>Rs. {lineTotal.toFixed(2)}</span>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--brand-primary)' }}>Rs. {discountedLineTotal.toFixed(2)}</span>
                      </div>
                    ) : (
                      <span style={{ fontWeight: 700, fontSize: '14px' }}>Rs. {lineTotal.toFixed(2)}</span>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="text"
                          placeholder="Disc (%, Rs, *Rs)"
                          value={item.discount_input || ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => updateItemDiscount(item.id, e.target.value)}
                          style={{ width: '100px', padding: '4px', fontSize: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', textAlign: 'right' }}
                          title="Examples: 10%, 500, *100 (per unit)"
                        />
                        {!item.is_serialized && (
                          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-tertiary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={{ padding: '2px 6px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>-</button>
                            <span style={{ fontSize: '12px', fontWeight: 600, width: '20px', textAlign: 'center' }}>{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ padding: '2px 6px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>+</button>
                          </div>
                        )}
                        <button onClick={() => removeFromCart(item.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '4px', border: 'none', borderRadius: '4px', color: 'var(--status-error)', cursor: 'pointer' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {maxDiscountAllowed > 0 && (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          Max: Rs {((item.quantity * item.unit_price) * (maxDiscountAllowed / 100)).toLocaleString()} ({maxDiscountAllowed}%)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

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
            const taxAmt = taxDetails.find(td => td.id === tax.id)?.amount || 0;
            return (
              <div key={tax.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                <span>{tax.name} ({tax.rate}%) {tax.type === 'INCLUSIVE' ? ' [Incl]' : ''}</span>
                <span style={{ fontWeight: 500, color: tax.type === 'INCLUSIVE' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                  {tax.type === 'EXCLUSIVE' ? '+' : ''} Rs. {taxAmt.toFixed(2)}
                </span>
              </div>
            );
          })}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', marginBottom: '10px', fontSize: '18px', fontWeight: 800, borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
            <span>Total</span>
            <span style={{ color: 'var(--brand-primary)' }}>Rs. {finalTotal.toFixed(2)}</span>
          </div>
          
          <PermissionGuard permission="sales:create" behavior="disable">
            <button 
              onClick={handleCheckoutClick}
              disabled={cart.length === 0}
              style={{
                width: '100%', padding: '10px', background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-cta))', color: 'white',
                border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 700, letterSpacing: '0.5px',
                cursor: cart.length > 0 ? 'pointer' : 'not-allowed', opacity: cart.length > 0 ? 1 : 0.5,
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                boxShadow: cart.length > 0 ? '0 4px 12px rgba(245, 158, 11, 0.3)' : 'none',
                transition: 'transform 0.1s'
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <CreditCard size={18} /> Proceed to Checkout
            </button>
          </PermissionGuard>
        </div>
        </>)}
      </div>
      </div>

      {selectedProductIdForSerial && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ width: '420px', padding: '24px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Select Serial Numbers</h2>
                {(() => {
                  const currentCartItem = cart.find(i => i.product_id === selectedProductIdForSerial.id && i.is_serialized);
                  const selectedCount = currentCartItem?.selected_serials?.length || 0;
                  return (
                    <span style={{ fontSize: '12px', color: 'var(--brand-primary)', fontWeight: 600 }}>
                      {selectedCount > 0 ? `${selectedCount} selected in cart` : 'Click serials to add to cart'}
                    </span>
                  );
                })()}
              </div>
              <button onClick={() => { setSelectedProductIdForSerial(null); setSerialSearchQuery(''); }} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '50%', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
              </button>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 600, fontSize: '13px' }}>{selectedProductIdForSerial.name}</p>

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
                let filteredSerials = availableSerials?.filter(serial => 
                  !cart.some(item => item.selected_serials?.some(s => s.serial_number === serial.serial_number))
                );
                if (serialSearchQuery) {
                  filteredSerials = filteredSerials?.filter(serial => serial.serial_number.toLowerCase().includes(serialSearchQuery.toLowerCase()));
                }
                if (!filteredSerials || filteredSerials.length === 0) {
                  return <p style={{ color: 'var(--status-error)', gridColumn: 'span 2', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', fontSize: '13px' }}>No serial numbers left in stock.</p>;
                }
                return filteredSerials.map(serial => {
                  const displayCost = serial.unit_cost || serial.fallback_cost;
                  return (
                  <button 
                    key={serial.id}
                    onClick={() => { 
                      const serialWithCost = { ...serial, unit_cost: displayCost };
                      handleSerialSelect(serialWithCost); 
                    }}
                    style={{ 
                      padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', 
                      fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, transition: 'all 0.2s',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--brand-primary)';
                      e.currentTarget.style.background = 'rgba(245, 158, 11, 0.05)';
                      e.currentTarget.style.color = 'var(--brand-primary)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.background = 'var(--bg-primary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {serial.serial_number}
                      {displayCost && (
                        <PermissionGuard permission="sales:view_cost">
                          <div title={`Purchase Price: Rs. ${parseFloat(displayCost).toFixed(2)}`} style={{ display: 'flex', alignItems: 'center', color: 'var(--brand-primary)' }}>
                            <DollarSign size={14} />
                          </div>
                        </PermissionGuard>
                      )}
                    </div>
                    {serial.warehouse_name && (
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 'normal', fontFamily: 'sans-serif' }}>
                        {serial.warehouse_name}
                      </div>
                    )}
                  </button>
                  );
                });
              })()}
            </div>

            <button
              onClick={() => { setSelectedProductIdForSerial(null); setSerialSearchQuery(''); }}
              style={{
                marginTop: '16px',
                padding: '10px',
                background: 'var(--brand-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Done Selecting
            </button>
          </div>
        </div>
      )}

      {/* Sale Success Modal */}
      {saleSuccess && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
           <div style={{ width: '340px', padding: '24px', background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 24px 48px rgba(0,0,0,0.4)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--status-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)' }}>
                 <ShoppingCart size={24} color="white" />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Sale Successful!</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>The transaction has been recorded.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                <button onClick={() => handlePrintReceipt()} style={{ padding: '12px', background: 'var(--brand-primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-cta)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--brand-primary)'}>
                  <Printer size={18} /> Print Thermal Bill
                </button>
                <button onClick={() => setSaleSuccess(false)} style={{ padding: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}>
                  Start New Sale
                </button>
              </div>
           </div>
        </div>
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
            <p style={{ margin: 0, fontSize: '12px' }}>{activeBranch?.address || 'Branch Address'}</p>
            <p style={{ margin: 0, fontSize: '12px' }}>Tel: {(activeBranch?.phones?.length ?? 0) > 0 ? activeBranch?.phones?.map((p: any) => p.phone_number).join(' | ') : 'No Phone'}</p>
          </div>
          
          <div style={{ borderBottom: '1px dashed black', margin: '4mm 0' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span>Date: {new Date().toLocaleDateString('en-GB')}</span>
            <span>Time: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '2px' }}>
            <span>Invoice No: {lastCompletedInvoiceNo || 'N/A'}</span>
          </div>
          
          {lastCompletedCustomer && (
            <div style={{ fontSize: '12px', marginTop: '2px' }}>
              Customer: {lastCompletedCustomer.full_name}
            </div>
          )}

          <div style={{ fontSize: '12px', marginTop: '2px' }}>Sale Type: {lastCompletedSaleType === 'DIRECT' ? 'Walk-in Cash' : 'Installment'}</div>
          
          <div style={{ borderBottom: '1px dashed black', margin: '4mm 0' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '2mm' }}>
            <span style={{ flex: 1 }}>Item</span>
            <span style={{ width: '15mm', textAlign: 'right' }}>Qty</span>
            <span style={{ width: '22mm', textAlign: 'right' }}>Total</span>
          </div>

          {lastCompletedCart.map(item => {
            const lineTotal = item.quantity * item.unit_price;
            let itemDiscount = 0;
            let discountLabel = '';
            if (item.discount_input) {
              if (item.discount_input.endsWith('%')) {
                const pct = parseFloat(item.discount_input.replace('%', '')) || 0;
                itemDiscount = (lineTotal * pct) / 100;
                discountLabel = `(-${pct}%)`;
              } else if (item.discount_input.startsWith('*')) {
                const val = parseFloat(item.discount_input.replace('*', '')) || 0;
                itemDiscount = val * item.quantity;
                discountLabel = `(-${val}/ea)`;
              } else {
                itemDiscount = parseFloat(item.discount_input) || 0;
                discountLabel = `(-${itemDiscount})`;
              }
            }
            const finalLineAmt = lineTotal - itemDiscount;
            
            return (
              <div key={item.id} style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '3mm' }}>
                <div style={{ width: '100%', fontWeight: 'bold' }}>
                  {item.name}
                  {item.brand_name && <span style={{ fontWeight: 900, fontSize: '11px', marginLeft: '4px' }}>({item.brand_name})</span>}
                </div>
                <div style={{ flex: 1, paddingLeft: '4mm', color: '#000', fontWeight: 900 }}>
                  {item.is_serialized ? (
                    <>SNs: {item.selected_serials?.map((s: any) => s.serial_number).join(', ')}</>
                  ) : (
                    `SKU: ${item.sku}`
                  )}
                  {item.warranty_type && item.warranty_type !== 'NONE' ? (
                      <><br/>{item.warranty_type === 'WARRANTY' ? 'Warranty' : 'Guarantee'}: {item.warranty_period_years ? `${item.warranty_period_years} Yr ` : ''}{item.warranty_period_months ? `${item.warranty_period_months} Mo` : ''}</>
                    ) : null}
                    <br/>
                  @ Rs.{item.unit_price.toFixed(2)} {itemDiscount > 0 ? <><br/><small style={{color:'#000', fontWeight: 900}}>Discount: {discountLabel}</small></> : null}
                </div>
                <div style={{ width: '15mm', textAlign: 'right' }}>{item.quantity}</div>
                <div style={{ width: '22mm', textAlign: 'right' }}>{finalLineAmt.toFixed(2)}</div>
              </div>
            );
          })}

          <div style={{ borderBottom: '1px dashed black', margin: '4mm 0' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2mm' }}>
            <span>Subtotal</span>
            <span>Rs. {(lastCompletedTotal + lastCompletedDiscount - lastCompletedTaxAmount).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2mm' }}>
            <span>Discount</span>
            <span>Rs. {lastCompletedDiscount.toFixed(2)}</span>
          </div>
          {activeTaxes.length > 0 ? (
            <>
              {activeTaxes.map((t: any) => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#000', fontWeight: 900 }}>
                  <span>{t.name} ({t.rate}%) {t.type === 'INCLUSIVE' ? ' [Incl]' : ''}</span>
                  <span>{t.type === 'EXCLUSIVE' ? '+' : ''} {(() => {
                    const tAmt = t.type === 'EXCLUSIVE' ? (lastCompletedTotal * parseFloat(t.rate)) / 100 : lastCompletedTotal - (lastCompletedTotal / (1 + parseFloat(t.rate) / 100));
                    return tAmt.toFixed(2);
                  })()}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2mm' }}>
                <span>Total Tax</span>
                <span>Rs. {lastCompletedTaxAmount.toFixed(2)}</span>
              </div>
            </>
          ) : null}
          
          <div style={{ borderBottom: '1px dashed black', margin: '2mm 0' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px', margin: '4mm 0' }}>
            <span>GRAND TOTAL</span>
            <span>Rs. {lastCompletedTotalPayableWithInterest.toFixed(2)}</span>
          </div>

          {lastCompletedSaleType === 'INSTALLMENT' && lastCompletedScheme && (
            (() => {
              const total = lastCompletedTotal;
              const minPercent = parseFloat(lastCompletedScheme.min_downpayment_percent || 0);
              const requiredDownpayment = lastCompletedCart.reduce((sum, item) => {
                const flatDp = (parseFloat(item.min_downpayment_amount || "0")) * item.quantity;
                const baseLineTotal = item.unit_price * item.quantity;
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
                const schemeDp = (lineTotal * minPercent) / 100;
                return sum + Math.max(flatDp, schemeDp);
              }, 0);
              const hasRecovery = lastCompletedDownpayment < requiredDownpayment;
              
              const recoveryAmount = hasRecovery ? requiredDownpayment - lastCompletedDownpayment : 0;
              const effectiveDp = hasRecovery ? requiredDownpayment : lastCompletedDownpayment;
              const principal = total - effectiveDp;
              const interest = principal * (parseFloat(lastCompletedScheme.interest_rate || 0) / 100);
              const installmentAmount = (principal + interest) / parseFloat(lastCompletedScheme.terms || 1);
              
              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2mm' }}>
                    <span>Amount Paid (Downpayment)</span>
                    <span>Rs. {lastCompletedDownpayment.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '2mm' }}>
                    <span>Remaining Balance</span>
                    <span>Rs. {(lastCompletedTotalPayableWithInterest - lastCompletedDownpayment).toFixed(2)}</span>
                  </div>
                  <div style={{ borderBottom: '1px dashed black', margin: '2mm 0' }} />
                  <div style={{ textAlign: 'center', margin: '2mm 0' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '12px' }}>Installment Structure</div>
                    {hasRecovery && (
                      <div style={{ fontWeight: 900, marginBottom: '2px', color: '#000' }}>
                        Downpayment Recovery: Rs. {recoveryAmount.toFixed(2)}
                        {lastCompletedRecoveryDate && ` (Due: ${new Date(lastCompletedRecoveryDate).toLocaleDateString('en-GB')})`}
                      </div>
                    )}
                    <div style={{ fontWeight: 'bold' }}>
                      Rs. {installmentAmount.toFixed(2)} X {lastCompletedScheme.terms} {lastCompletedScheme.frequency.toLowerCase()}s
                    </div>
                    <div style={{ marginTop: '2px', fontWeight: 'bold' }}>Next Due: {
                      (() => {
                        const d = new Date();
                        if(lastCompletedScheme.frequency === 'MONTHLY') d.setMonth(d.getMonth() + 1);
                        else if(lastCompletedScheme.frequency === 'WEEKLY') d.setDate(d.getDate() + 7);
                        else if(lastCompletedScheme.frequency === 'DAILY') d.setDate(d.getDate() + 1);
                        return d.toLocaleDateString('en-GB');
                      })()
                    }</div>
                  </div>
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
