import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CompanionEntityTarget,
  PartyCompanionData,
  InvoiceCompanionData,
  ProductCompanionData,
} from '../types';

interface AccompanyingInfoState {
  isOpen: boolean;
  isPinned: boolean;
  isMinimized: boolean;
  target: CompanionEntityTarget | null;
  partyData: PartyCompanionData | null;
  invoiceData: InvoiceCompanionData | null;
  productData: ProductCompanionData | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  togglePinned: () => void;
  toggleMinimized: () => void;
  setTarget: (target: CompanionEntityTarget | null) => void;
  setPartyData: (data: PartyCompanionData | null) => void;
  setInvoiceData: (data: InvoiceCompanionData | null) => void;
  setProductData: (data: ProductCompanionData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useAccompanyingInfoStore = create<AccompanyingInfoState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      isPinned: false,
      isMinimized: false,
      target: null,
      partyData: null,
      invoiceData: null,
      productData: null,
      isLoading: false,
      error: null,

      toggleOpen: () => set(state => ({ isOpen: !state.isOpen })),
      setOpen: open => set({ isOpen: open }),
      togglePinned: () => set(state => ({ isPinned: !state.isPinned })),
      toggleMinimized: () => set(state => ({ isMinimized: !state.isMinimized })),
      setTarget: target =>
        set({
          target,
          error: null,
          partyData:
            target?.type === 'customer' || target?.type === 'supplier' ? get().partyData : null,
          invoiceData: target?.type === 'invoice' ? get().invoiceData : null,
          productData: target?.type === 'product' ? get().productData : null,
        }),
      setPartyData: partyData => set({ partyData, isLoading: false, error: null }),
      setInvoiceData: invoiceData => set({ invoiceData, isLoading: false, error: null }),
      setProductData: productData => set({ productData, isLoading: false, error: null }),
      setLoading: isLoading => set({ isLoading }),
      setError: error => set({ error, isLoading: false }),
      clear: () =>
        set({
          target: null,
          partyData: null,
          invoiceData: null,
          productData: null,
          isLoading: false,
          error: null,
        }),
    }),
    {
      name: 'alzhra-accompanying-info-settings',
      partialize: state => ({
        isOpen: state.isOpen,
        isPinned: state.isPinned,
        isMinimized: state.isMinimized,
      }),
    }
  )
);
