import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';

export interface CalculatorItem {
  cartItemId: string; // Unique ID in cart (e.g., productId)
  productId: string;
  name: string;
  price: number;
  qty: number;
  discountInput?: string;
  imageUrl?: string | null;
  minDownpaymentAmount?: number;
}

interface CalculatorState {
  items: CalculatorItem[];
  downpayment: number;
  schemeId: string | null;
  
  addItem: (item: Omit<CalculatorItem, 'qty'> & { qty?: number }) => void;
  updateQty: (cartItemId: string, qty: number) => void;
  removeItem: (cartItemId: string) => void;
  setDownpayment: (amount: number) => void;
  setScheme: (id: string | null) => void;
  setItemDiscount: (cartItemId: string, discountInput: string) => void;
  clearCalculator: () => void;
  getTotal: () => number;
  getItemLineTotal: (item: CalculatorItem) => number;
}

export const useCalculatorStore = create<CalculatorState>((set, get) => ({
  items: [],
  downpayment: 0,
  schemeId: null,
  
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

  setDownpayment: (amount) => set({ downpayment: amount }),
  setScheme: (id) => set({ schemeId: id }),
  
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

    set({
      items: state.items.map(i =>
        i.cartItemId === cartItemId ? { ...i, discountInput } : i
      )
    });
  },

  clearCalculator: () => set({ 
    items: [], 
    downpayment: 0,
    schemeId: null,
  }),
  
  getItemLineTotal: (item: CalculatorItem) => {
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
    return get().items.reduce((sum, item) => sum + get().getItemLineTotal(item), 0);
  }
}));
