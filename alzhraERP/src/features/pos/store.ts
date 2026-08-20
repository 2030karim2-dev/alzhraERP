
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SalesCartItem } from '../sales/store';

export interface SuspendedCustomer {
  id: string;
  name: string;
  phone?: string;
}

export interface SuspendedOrder {
  id: string;
  items: SalesCartItem[];
  customer: SuspendedCustomer | null;
  time: string;
}

export interface POSState {
  suspendedOrders: SuspendedOrder[];
  suspendCurrentOrder: (items: SalesCartItem[], customer: SuspendedCustomer | null) => void;
  resumeOrder: (id: string) => SuspendedOrder | undefined;
  removeSuspended: (id: string) => void;
}

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      suspendedOrders: [],

      suspendCurrentOrder: (items, customer) => {
        const newOrder = {
          id: `SUS-${Date.now()}`,
          items,
          customer,
          time: new Date().toLocaleTimeString('ar-SA')
        };
        set({ suspendedOrders: [...get().suspendedOrders, newOrder] });
      },

      resumeOrder: (id) => {
        const order = get().suspendedOrders.find(o => o.id === id);
        if (order) {
          set({ suspendedOrders: get().suspendedOrders.filter(o => o.id !== id) });
        }
        return order;
      },

      removeSuspended: (id) => set({ suspendedOrders: get().suspendedOrders.filter(o => o.id !== id) })
    }),
    { name: 'al-zahra-pos-cache' }
  )
);
