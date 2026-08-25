import { create } from 'zustand';
import { Product } from '../inventory/types';
import { useDiscountStore } from '../settings/taxDiscountStore';
import { useFeedbackStore } from '../feedback/store';
import { convertCurrency } from '../../core/utils/currencyUtils';
import { logger } from '../../core/utils/logger';

/**
 * SalesCartItem - Used for the sales cart/UI state
 * Different from InvoiceItem in types.ts which represents database records
 */
export interface SalesCartItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  partNumber?: string;    // OEM part number - matches purchases
  brand?: string;        // Brand/manufacturer - matches purchases
  quantity: number;
  basePrice: number; // Price in SAR (base currency)
  price: number;     // Converted price based on current exchange rate
  discount: number;
  costPrice: number;
  warehouse_distribution?: Array<{ warehouse_id: string; warehouse_name: string; quantity: number }> | undefined;
}

export interface SalesSummary {
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
}

interface SalesState {
  items: SalesCartItem[];
  selectedCustomer: { id: string, name: string, phone?: string } | null;
  summary: SalesSummary;
  invoiceType: 'cash' | 'credit';
  currency: string;
  exchangeRate: number;
  exchangeOperator: 'multiply' | 'divide';
  warehouseId: string;
  cashboxId: string;
  showDiscount: boolean;
  notes: string;

  // Actions
  initializeItems: (count: number) => void;
  updateItem: (index: number, field: keyof SalesCartItem, value: string | number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setProductForRow: (index: number, product: Product) => void;
  addItem: () => void;
  addProductToCart: (product: Product) => void;
  removeItem: (idOrIndex: number | string) => void;
  calculateTotals: () => void;
  setCustomer: (customer: { id: string, name: string, phone?: string } | null) => void;
  setMetadata: (field: string, value: string | boolean | null | number) => void;
  toggleColumn: (field: 'showDiscount') => void;
  resetCart: () => void;
}

const createNewItem = (): SalesCartItem => ({
  id: crypto.randomUUID(),
  productId: '',
  sku: '',
  name: '',
  partNumber: '',
  brand: '',
  quantity: 0,
  basePrice: 0,
  price: 0,
  discount: 0,
  costPrice: 0,
});

/**
 * Validate exchange rate before any foreign-currency conversion.
 * Returns `true` if the rate is valid, `false` (with toast) otherwise.
 */
const assertValidExchangeRate = (currency: string, rate: number): boolean => {
  if (currency !== 'SAR' && (!rate || rate <= 0)) {
    useFeedbackStore.getState().showToast(
      'لا يمكن تحويل العملة: سعر الصرف غير صالح (صفر أو سالب). يرجى ضبط سعر الصرف أولاً.',
      'error'
    );
    return false;
  }
  return true;
};

/**
 * Safely convert a base-currency price to the current foreign currency.
 * Returns the original price if the currency is SAR or conversion fails.
 */
const safeConvertFromBase = (
  basePrice: number,
  currency: string,
  rate: number,
  operator: 'multiply' | 'divide',
  context: string
): { price: number; failed: boolean } => {
  if (currency === 'SAR') return { price: basePrice, failed: false };
  try {
    return { price: convertCurrency(basePrice, rate, 'fromBase', operator), failed: false };
  } catch (e) {
    logger.error('SalesStore', `Invalid exchange rate for ${context}`, { rate, currency });
    useFeedbackStore.getState().showToast(
      'خطأ في تحويل العملة: ' + ((e as Error)?.message || 'سعر صرف غير صالح'),
      'error'
    );
    return { price: basePrice, failed: true };
  }
};

export const useSalesStore = create<SalesState>((set, get) => ({
  items: [],
  selectedCustomer: null,
  summary: { subtotal: 0, discountAmount: 0, totalAmount: 0 },
  invoiceType: 'cash',
  currency: 'SAR',
  exchangeRate: 1,
  exchangeOperator: 'multiply',
  // [FIX] warehouseId فارغ — يُعيّن تلقائياً من InvoiceMeta عند التحميل (مثل cashboxId)
  warehouseId: '',
  // [FIX] cashboxId فارغ بدلاً من 'box_1' الوهمي - يُعيّن تلقائياً من InvoiceMeta عند التحميل
  cashboxId: '',
  showDiscount: false,
  notes: '',

  initializeItems: (count) => set({ items: Array.from({ length: count }, createNewItem) }),

  updateItem: (index, field, value) => {
    set(state => {
      const newItems = [...state.items];
      if (newItems[index]) {
        // Use typed Pick to constrain field-value pairs:
        // quantity/costPrice/basePrice/price/discount → number, rest → string
        type NumericFields = 'quantity' | 'costPrice' | 'basePrice' | 'price' | 'discount';
        const numericFields = new Set<NumericFields>(['quantity', 'costPrice', 'basePrice', 'price', 'discount']);
        const coercedValue = numericFields.has(field as NumericFields) ? Number(value) : String(value);
        newItems[index] = { ...newItems[index], [field]: coercedValue as SalesCartItem[typeof field] };
      }
      return { items: newItems };
    });
    get().calculateTotals();
  },

  updateQuantity: (productId, quantity) => {
    set(state => ({
      items: state.items.map(item =>
        item.productId === productId ? { ...item, quantity: Math.max(0, quantity) } : item
      )
    }));
    get().calculateTotals();
  },

  setProductForRow: (index, product) => {
    const state = get();
    if (!assertValidExchangeRate(state.currency, state.exchangeRate)) return;

    set(state => {
      const newItems = [...state.items];
      const basePrice = product.selling_price || 0;
      const { price: convertedPrice, failed } = safeConvertFromBase(
        basePrice, state.currency, state.exchangeRate, state.exchangeOperator, 'setProductForRow'
      );
      if (failed) return state;

      if (newItems[index]) {
        newItems[index] = {
          ...newItems[index],
          productId: product.id,
          name: product.name,
          sku: product.sku,
          partNumber: product.part_number || '',
          brand: product.brand || '',
          basePrice: basePrice,
          price: convertedPrice,
          quantity: 1,
          costPrice: product.cost_price || 0,
          warehouse_distribution: product.warehouse_distribution
        };
      }
      return { items: newItems };
    });
    get().calculateTotals();
  },

  addItem: () => set(state => ({ items: [...state.items, createNewItem()] })),

  addProductToCart: (product) => {
    const currentState = get();
    if (!assertValidExchangeRate(currentState.currency, currentState.exchangeRate)) return;

    set(state => {
      const existing = state.items.find(i => i.productId === product.id);
      if (existing) {
        return {
          items: state.items.map(i =>
            i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }

      const basePrice = product.selling_price || 0;
      const { price: convertedPrice, failed } = safeConvertFromBase(
        basePrice, state.currency, state.exchangeRate, state.exchangeOperator, 'addProductToCart'
      );
      if (failed) return state;

      const newItem: SalesCartItem = {
        id: crypto.randomUUID(),
        productId: product.id,
        sku: product.sku,
        name: product.name,
        partNumber: product.part_number || '',
        brand: product.brand || '',
        quantity: 1,
        basePrice: basePrice,
        price: convertedPrice,
        discount: 0,
        costPrice: product.cost_price || 0,
        warehouse_distribution: product.warehouse_distribution
      };

      return { items: [newItem, ...state.items] };
    });
    get().calculateTotals();
  },

  removeItem: (idOrIndex) => {
    set(state => {
      const newItems = typeof idOrIndex === 'string'
        ? state.items.filter(i => i.productId !== idOrIndex)
        : state.items.filter((_, i) => i !== idOrIndex);
      return { items: newItems };
    });
    get().calculateTotals();
  },

  calculateTotals: () => {
    // [FIX #3] تُقرأ حالة الخصم من المتجر الخارجي خارج set() لتجنب سباق الحالة
    // هذا آمن لأن JS أحادي الخيط ويتم الاستدعاء دائماً خارج set()
    const { discountEnabled } = useDiscountStore.getState();
    set(state => {
      let subtotal = 0;
      let discountAmount = 0;

      state.items.forEach(item => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const lineSub = qty * price;
        subtotal += lineSub;

        const lineDiscount = (discountEnabled && state.showDiscount) ? (Number(item.discount) || 0) : 0;
        discountAmount += lineDiscount;
      });

      const totalAmount = subtotal - discountAmount;

      return {
        summary: { subtotal, discountAmount, totalAmount }
      };
    });
  },

  setCustomer: (selectedCustomer) => set({ selectedCustomer }),

  setMetadata: (field, value) => {
    set((state) => {
      const newState = { ...state, [field]: value };

      if (['currency', 'exchangeRate', 'exchangeOperator'].includes(field as string)) {
        const rate = newState.exchangeRate;
        const isForeign = newState.currency !== 'SAR';

        newState.items = newState.items.map(item => {
          if (!item.productId) return item;
          if (!isForeign) return { ...item, price: item.basePrice };

          try {
            const newPrice = convertCurrency(item.basePrice, rate, 'fromBase', newState.exchangeOperator);
            return { ...item, price: newPrice };
          } catch (e) {
            logger.error('SalesStore', 'Invalid rate in setMetadata', { rate, currency: newState.currency });
            return item;
          }
        });
      }

      return newState;
    });
    get().calculateTotals();
  },

  toggleColumn: (field) => {
    set(state => ({ [field]: !state[field] }));
    get().calculateTotals();
  },

  resetCart: () => set(() => ({
    items: [],
    selectedCustomer: null,
    summary: { subtotal: 0, discountAmount: 0, totalAmount: 0 },
    invoiceType: 'cash',
    currency: 'SAR',
    exchangeRate: 1,
    exchangeOperator: 'multiply',
    warehouseId: '',
    cashboxId: '',
    showDiscount: false,
    notes: ''
  }))
}));

// [FIX #3] الاشتراك في تغييرات إعدادات الخصم لإعادة حساب الإجماليات تلقائياً
// يضمن أن إجماليات الفاتورة محدّثة دائماً عند تفعيل/إلغاء الخصم
useDiscountStore.subscribe((state, prevState) => {
  if (state.discountEnabled !== prevState.discountEnabled) {
    useSalesStore.getState().calculateTotals();
  }
});