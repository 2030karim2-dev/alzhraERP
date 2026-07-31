
import { create } from 'zustand';
import { Product } from '../inventory/types';
import { useDiscountStore } from '../settings/taxDiscountStore';
import { convertCurrency } from '../../core/utils/currencyUtils';

export interface PurchaseInvoiceItem {
  id: string;
  productId: string;
  sku: string;
  partNumber: string;
  brand: string;
  name: string;
  quantity: number;
  costPrice: number;
  discount: number;

}

interface PurchaseState {
  items: PurchaseInvoiceItem[];
  supplier: { id: string, name: string } | null;
  totals: { grandTotal: number };
  invoiceNumber: string;
  issueDate: string;
  currency: string;
  exchangeRate: number;
  warehouseId: string;
  invoiceType: 'cash' | 'credit';
  cashboxId: string;

  // UI Settings

  showDiscount: boolean;

  // Actions
  initializeItems: (count: number) => void;
  bulkLoadItems: (newItems: Record<string, unknown>[]) => void;
  updateItem: (index: number, field: keyof PurchaseInvoiceItem, value: string | number) => void;
  setProductForRow: (index: number, product: Product) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  calculateTotals: () => void;
  setSupplier: (supplier: { id: string, name: string } | null) => void;
  setMetadata: (field: string, value: string | number) => void;
  toggleColumn: (field: 'showDiscount') => void;
  resetCart: () => void;
}

const createNewItem = (): PurchaseInvoiceItem => ({
  id: crypto.randomUUID() as string,
  productId: '',
  sku: '',
  partNumber: '',
  brand: '',
  name: '',
  quantity: 0,
  costPrice: 0,
  discount: 0,

});

export const usePurchaseStore = create<PurchaseState>((set, get) => ({
  items: [],
  supplier: null,
  totals: { grandTotal: 0 },
  invoiceNumber: '',
  issueDate: new Date().toISOString().split('T')[0],
  currency: 'SAR',
  exchangeRate: 1,
  warehouseId: 'wh_main',
  invoiceType: 'cash',
  cashboxId: '',

  showDiscount: false,

  initializeItems: (count) => {
    // Only initialize if empty
    if (get().items.length === 0) {
      set({ items: Array.from({ length: count }, createNewItem) });
    }
  },

  bulkLoadItems: (incomingItems) => {
    const formattedItems: PurchaseInvoiceItem[] = incomingItems.map(item => ({
      id: crypto.randomUUID() as string,
      productId: String(item.productId || 'imported'),
      sku: String(item.sku || ''),
      partNumber: String(item.partNumber || ''),
      brand: String(item.brand || ''),
      name: String(item.name || ''),
      quantity: Number(item.quantity) || 1,
      costPrice: Number(item.unitPrice ?? item.costPrice) || 0,
      discount: 0,

    }));

    // Ensure we have at least 6 rows for UI consistency
    const paddedItems = [...formattedItems];
    while (paddedItems.length < 6) {
      paddedItems.push(createNewItem());
    }

    set({ items: paddedItems });
    get().calculateTotals();
  },

  updateItem: (index, field, value) => {
    set(state => {
      const newItems = [...state.items];
      if (newItems[index]) {
        const item = { ...newItems[index], [field]: value };
        newItems[index] = item;
      }
      return { items: newItems };
    });
    get().calculateTotals();
  },

  setProductForRow: (index, product) => {
    set(state => {
      const newItems = [...state.items];
      const rate = state.exchangeRate;

      // Convert cost price: if foreign currency, convert from foreign to base (SAR)
      // The cost_price in Product is in SAR (base), so we convert to foreign for display
      let convertedCost = product.cost_price || 0;
      if (state.currency !== 'SAR') {
        try {
          // Convert from base (SAR) to foreign currency for display in purchase invoice
          convertedCost = convertCurrency(product.cost_price || 0, rate, 'fromBase');
        } catch (e) {
          console.error('PurchaseStore: Invalid exchange rate for setProductForRow', { rate, currency: state.currency });
          return state; // Don't update if rate is invalid
        }
      }

      if (newItems[index]) {
        newItems[index] = {
          ...newItems[index],
          productId: product.id,
          name: product.name,
          sku: product.sku,
          partNumber: product.part_number || '',
          brand: product.brand || '',
          costPrice: convertedCost,
          quantity: 1
        };
      }
      return { items: newItems };
    });
    get().calculateTotals();
  },

  addItem: () => set(state => ({ items: [...state.items, createNewItem()] })),
  removeItem: (index) => {
    set(state => {
      const newItems = state.items.filter((_, i) => i !== index);
      return { items: newItems.length > 0 ? newItems : [createNewItem()] };
    });
    get().calculateTotals();
  },

  calculateTotals: () => {
    const { discountEnabled } = useDiscountStore.getState(); // Read outside set() to avoid race condition
    set(state => {
      const grandTotal = state.items.reduce((acc, item) => {
        const sub = (Number(item.quantity) * Number(item.costPrice));
        const discount = (discountEnabled && state.showDiscount) ? (Number(item.discount) || 0) : 0;
        const afterDiscount = sub - discount;
        return acc + afterDiscount;
      }, 0);
      return { totals: { grandTotal } };
    });
  },

  setSupplier: (supplier) => set({ supplier }),
  setMetadata: (field, value) => set((state) => ({ ...state, [field]: value })),
  toggleColumn: (field) => {
    set(state => ({ [field]: !state[field] }));
    get().calculateTotals();
  },

  resetCart: () => set({
    items: Array.from({ length: 6 }, createNewItem),
    supplier: null,
    totals: { grandTotal: 0 },
    currency: 'SAR',
    exchangeRate: 1,
    invoiceType: 'cash',
    cashboxId: '',
    invoiceNumber: '',
    issueDate: new Date().toISOString().split('T')[0]
  })
}));
