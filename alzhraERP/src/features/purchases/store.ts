import { create, type StoreApi } from 'zustand';
import type { Product } from '../inventory/types';
import { useDiscountStore } from '../settings/taxDiscountStore';
import { convertCurrency } from '../../core/utils/currencyUtils';
import { logger } from '../../core/utils/logger';

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

export interface SupplierRef { id: string; name: string; }

interface PurchaseState {
  items: PurchaseInvoiceItem[];
  supplier: SupplierRef | null;
  totals: { grandTotal: number; subTotal: number; totalDiscount: number };
  invoiceNumber: string;
  issueDate: string;
  currency: string;
  exchangeRate: number;
  warehouseId: string;
  invoiceType: 'cash' | 'credit';
  cashboxId: string;
  notes: string;
  showDiscount: boolean;
  initializeItems: (count: number) => void;
  bulkLoadItems: (newItems: Array<Record<string, unknown>>) => void;
  updateItem: (index: number, field: keyof PurchaseInvoiceItem, value: string | number) => void;
  setProductForRow: (index: number, product: Product) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  calculateTotals: () => void;
  setSupplier: (supplier: SupplierRef | null) => void;
  setMetadata: (field: string, value: string | number) => void;
  toggleColumn: (field: 'showDiscount') => void;
  resetCart: () => void;
}

type PurchaseStoreSet = StoreApi<PurchaseState>['setState'];
type PurchaseStoreGet = StoreApi<PurchaseState>['getState'];
type PurchaseActions = Pick<PurchaseState, 'initializeItems' | 'bulkLoadItems' | 'updateItem' | 'setProductForRow' | 'addItem' | 'removeItem'>;
type PurchaseCalculationActions = Pick<PurchaseState, 'calculateTotals'>;
type PurchaseMetadataActions = Pick<PurchaseState, 'setSupplier' | 'setMetadata' | 'toggleColumn' | 'resetCart'>;

const readString = (value: unknown, fallback = ''): string => typeof value === 'string' ? value : typeof value === 'number' ? String(value) : fallback;
const readNumber = (value: unknown, fallback = 0): number => typeof value === 'number' && Number.isFinite(value) ? value : typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : fallback;
const createNewItem = (): PurchaseInvoiceItem => ({ id: crypto.randomUUID(), productId: '', sku: '', partNumber: '', brand: '', name: '', quantity: 0, costPrice: 0, discount: 0 });
const mapImportedItem = (item: Record<string, unknown>): PurchaseInvoiceItem => ({ id: crypto.randomUUID(), productId: readString(item.productId, 'imported'), sku: readString(item.sku), partNumber: readString(item.partNumber), brand: readString(item.brand), name: readString(item.name), quantity: readNumber(item.quantity, 1), costPrice: readNumber(item.unitPrice ?? item.costPrice), discount: 0 });

const updateInvoiceItem = (item: PurchaseInvoiceItem, field: keyof PurchaseInvoiceItem, value: string | number): PurchaseInvoiceItem => {
  switch (field) {
    case 'productId': return { ...item, productId: String(value) };
    case 'sku': return { ...item, sku: String(value) };
    case 'partNumber': return { ...item, partNumber: String(value) };
    case 'brand': return { ...item, brand: String(value) };
    case 'name': return { ...item, name: String(value) };
    case 'quantity': return { ...item, quantity: Number(value) };
    case 'costPrice': return { ...item, costPrice: Number(value) };
    case 'discount': return { ...item, discount: Number(value) };
    case 'id': return { ...item, id: String(value) };
    default: return item;
  }
};

type PurchaseItemActions = Pick<PurchaseActions, 'initializeItems' | 'bulkLoadItems' | 'updateItem'>;

const createItemActions = (set: PurchaseStoreSet, get: PurchaseStoreGet): PurchaseItemActions => ({
  initializeItems: (count) => {
    if (get().items.length === 0) set({ items: Array.from({ length: count }, createNewItem) });
  },
  bulkLoadItems: (incomingItems) => {
    const formattedItems = incomingItems.map(mapImportedItem);
    const paddedItems = [...formattedItems];
    while (paddedItems.length < 6) paddedItems.push(createNewItem());
    set({ items: paddedItems });
    get().calculateTotals();
  },
  updateItem: (index, field, value) => {
    set(state => ({ items: state.items.map((item, itemIndex) => itemIndex === index ? updateInvoiceItem(item, field, value) : item) }));
    get().calculateTotals();
  },
});

const createProductActions = (set: PurchaseStoreSet, get: PurchaseStoreGet): Pick<PurchaseActions, 'setProductForRow' | 'addItem' | 'removeItem'> => ({
  setProductForRow: (index, product) => {
    set(state => {
      const rate = state.exchangeRate;
      let convertedCost = product.cost_price;
      if (state.currency !== 'SAR') {
        try {
          convertedCost = convertCurrency(product.cost_price, rate, 'fromBase');
        } catch {
          logger.error("store", 'PurchaseStore: Invalid exchange rate for setProductForRow', { rate, currency: state.currency });
          return state;
        }
      }
      return { items: state.items.map((item, itemIndex) => itemIndex === index ? { ...item, productId: product.id, name: product.name, sku: product.sku, partNumber: product.part_number ?? '', brand: product.brand ?? '', costPrice: convertedCost, quantity: 1 } : item) };
    });
    get().calculateTotals();
  },
  addItem: () => { set(state => ({ items: [...state.items, createNewItem()] })); },
  removeItem: (index) => {
    set(state => {
      const newItems = state.items.filter((_, itemIndex) => itemIndex !== index);
      return { items: newItems.length > 0 ? newItems : [createNewItem()] };
    });
    get().calculateTotals();
  },
});

const createCalculationActions = (set: PurchaseStoreSet): PurchaseCalculationActions => ({
  calculateTotals: () => {
    const { discountEnabled } = useDiscountStore.getState();
    set(state => {
      let subTotal = 0;
      let totalDiscount = 0;
      const grandTotal = state.items.reduce((acc, item) => {
        const sub = item.quantity * item.costPrice;
        const discount = discountEnabled && state.showDiscount ? item.discount : 0;
        subTotal += sub;
        totalDiscount += discount;
        return acc + sub - discount;
      }, 0);
      return { totals: { grandTotal, subTotal, totalDiscount } };
    });
  },
});

const createMetadataActions = (set: PurchaseStoreSet, get: PurchaseStoreGet): PurchaseMetadataActions => ({
  setSupplier: (supplier) => { set({ supplier }); },
  setMetadata: (field, value) => {
    if (field === 'invoiceNumber' || field === 'issueDate' || field === 'currency' || field === 'warehouseId' || field === 'invoiceType' || field === 'cashboxId' || field === 'notes') set({ [field]: String(value) });
    if (field === 'exchangeRate') set({ exchangeRate: Number(value) });
  },
  toggleColumn: (_field) => {
    set(state => ({ showDiscount: !state.showDiscount }));
    get().calculateTotals();
  },
  resetCart: () => { set({ items: Array.from({ length: 6 }, createNewItem), supplier: null, totals: { grandTotal: 0, subTotal: 0, totalDiscount: 0 }, currency: 'SAR', exchangeRate: 1, warehouseId: '', invoiceType: 'cash', cashboxId: '', notes: '', showDiscount: false, invoiceNumber: '', issueDate: new Date().toISOString().split('T')[0] }); },
});

export const usePurchaseStore = create<PurchaseState>((set, get) => ({
  items: [], supplier: null, totals: { grandTotal: 0, subTotal: 0, totalDiscount: 0 }, invoiceNumber: '', issueDate: new Date().toISOString().split('T')[0], currency: 'SAR', exchangeRate: 1, warehouseId: '', invoiceType: 'cash', cashboxId: '', notes: '', showDiscount: false,
  ...createItemActions(set, get),
  ...createProductActions(set, get),
  ...createCalculationActions(set),
  ...createMetadataActions(set, get),
}));
