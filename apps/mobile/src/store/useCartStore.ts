import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';

export interface CartItem {
  cartItemId: string; // Unique ID in cart: productId for bulk, serialItemId for serialized
  productId: string;
  name: string;
  price: number;
  qty: number;
  serialItemId?: string;
  serialNumber?: string;
  discountInput?: string;
  isFulfillmentPlaceholder?: boolean;
  warrantyMonths?: number;
  minDownpaymentAmount?: number;
  imageUrl?: string | null;
}

export interface GuarantorDetails {
  full_name: string;
  nic: string;
  mobile: string;
  address: string;
}

interface CartState {
  items: CartItem[];
  customerId: string | null;
  saleType: 'DIRECT' | 'INSTALLMENT';
  downpayment: number;
  schemeId: string | null;
  guarantorDetails: GuarantorDetails | null;
  signatureUri: string | null;
  preOrderId: string | null;
  partialRecoveryDate: string | null;
  
  addItem: (item: Omit<CartItem, 'qty'> & { qty?: number }) => void;
  addItemWithQty: (item: CartItem) => void;
  updateQty: (cartItemId: string, qty: number) => void;
  removeItem: (cartItemId: string) => void;
  setCustomer: (id: string | null) => void;
  setSaleType: (type: 'DIRECT' | 'INSTALLMENT') => void;
  setDownpayment: (amount: number) => void;
  setScheme: (id: string | null) => void;
  setGuarantor: (details: GuarantorDetails | null) => void;
  setSignature: (uri: string | null) => void;
  setPreOrderId: (id: string | null) => void;
  setPartialRecoveryDate: (date: string | null) => void;
  setItemDiscount: (cartItemId: string, discountInput: string) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemLineTotal: (item: CartItem) => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerId: null,
  saleType: 'DIRECT',
  downpayment: 0,
  schemeId: null,
  guarantorDetails: null,
  signatureUri: null,
  preOrderId: null,
  partialRecoveryDate: null,
  
  addItem: (product) => set((state) => {
    const existing = state.items.find(i => i.cartItemId === product.cartItemId);
    if (existing) {
      return { 
        items: state.items.map(i => 
          i.cartItemId === product.cartItemId ? { ...i, qty: i.qty + (product.qty || 1) } : i
        ) 
      };
    }
    return { items: [...state.items, { ...product, qty: product.qty || 1 }] };
  }),

  addItemWithQty: (product) => set((state) => {
    // Explicitly set qty — used by fulfillment flow to load exact booked quantities
    const existing = state.items.find(i => i.cartItemId === product.cartItemId);
    if (existing) {
      return {
        items: state.items.map(i =>
          i.cartItemId === product.cartItemId ? { ...i, qty: i.qty + (product.qty || 1) } : i
        )
      };
    }
    return { items: [...state.items, { ...product }] };
  }),
  
  updateQty: (cartItemId, qty) => set((state) => {
    if (qty <= 0) {
      return { items: state.items.filter(i => i.cartItemId !== cartItemId) };
    }
    return { 
      items: state.items.map(i => 
        i.cartItemId === cartItemId ? { ...i, qty } : i
      ) 
    };
  }),

  removeItem: (cartItemId) => set((state) => ({
    items: state.items.filter(i => i.cartItemId !== cartItemId)
  })),

  setCustomer: (id) => set({ customerId: id }),
  setSaleType: (type) => set({ saleType: type }),
  setDownpayment: (amount) => set({ downpayment: amount }),
  setScheme: (id) => set({ schemeId: id }),
  setGuarantor: (details) => set({ guarantorDetails: details }),
  setSignature: (uri) => set({ signatureUri: uri }),
  setPreOrderId: (id) => set({ preOrderId: id }),
  setPartialRecoveryDate: (date) => set({ partialRecoveryDate: date }),
  
  setItemDiscount: (cartItemId, discountInput) => {
    const state = get();
    const item = state.items.find(i => i.cartItemId === cartItemId);
    if (!item) return;

    // Load max discount from auth store
    const user = useAuthStore.getState().user;
    const maxDiscountPercent = user?.max_discount_percentage || 0;

    const baseTotal = item.price * item.qty;
    const maxAllowedDiscountTotal = baseTotal * (maxDiscountPercent / 100);

    let parsedDisc = 0;
    if (discountInput.endsWith('%')) {
      const pct = parseFloat(discountInput.replace('%', '')) || 0;
      parsedDisc = baseTotal * (pct / 100);
    } else if (discountInput.startsWith('*')) {
      const val = parseFloat(discountInput.replace('*', '')) || 0;
      parsedDisc = val * item.qty;
    } else {
      parsedDisc = parseFloat(discountInput) || 0;
    }

    if (parsedDisc > maxAllowedDiscountTotal) {
      // Revert or show alert? We will just clamp it in getItemLineTotal,
      // but maybe better to also clamp it or show an alert. 
      // For now, let it save but getItemLineTotal clamps it to maxAllowedDiscountTotal
      // Or we can just reject the input? Let's just save it, and getItemLineTotal handles clamping.
    }

    set({
      items: state.items.map(i =>
        i.cartItemId === cartItemId ? { ...i, discountInput } : i
      )
    });
  },

  clearCart: () => set({ 
    items: [], 
    customerId: null, 
    saleType: 'DIRECT', 
    downpayment: 0,
    schemeId: null,
    guarantorDetails: null,
    signatureUri: null,
    preOrderId: null,
    partialRecoveryDate: null
  }),
  
  getItemLineTotal: (item: CartItem) => {
    const baseTotal = item.price * item.qty;
    if (!item.discountInput) return baseTotal;
    
    let disc = 0;
    if (item.discountInput.endsWith('%')) {
      const pct = parseFloat(item.discountInput.replace('%', '')) || 0;
      disc = baseTotal * (pct / 100);
    } else if (item.discountInput.startsWith('*')) {
      const val = parseFloat(item.discountInput.replace('*', '')) || 0;
      disc = val * item.qty;
    } else {
      disc = parseFloat(item.discountInput) || 0;
    }
    
    // Clamp to max discount percentage from user config
    const user = useAuthStore.getState().user;
    const maxDiscountPercent = user?.max_discount_percentage || 0;
    const maxAllowedDiscountTotal = baseTotal * (maxDiscountPercent / 100);

    disc = Math.min(disc, maxAllowedDiscountTotal); // Cannot exceed max discount
    disc = Math.min(baseTotal, Math.max(0, disc)); // Cannot exceed base total and cannot be negative
    
    return baseTotal - disc;
  },

  getTotal: () => {
    return get().items
      .filter(item => !item.isFulfillmentPlaceholder)
      .reduce((sum, item) => sum + get().getItemLineTotal(item), 0);
  }
}));
