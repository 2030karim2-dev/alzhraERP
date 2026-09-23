/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { RequisitionItem, RequisitionSupplier, RequisitionBatch } from '../types/requisitions';
import { formatLocalDate } from '@/core/utils/dateUtils';

interface RequisitionsState {
  items: RequisitionItem[];
  supplier: RequisitionSupplier | null;
  notes: string;
  batchTitle: string;
  savedBatches: RequisitionBatch[];

  // Item Actions
  addItem: (initial?: Partial<RequisitionItem>) => void;
  updateItem: (id: string, updates: Partial<RequisitionItem>) => void;
  removeItem: (id: string) => void;
  duplicateItem: (id: string) => void;
  moveItem: (fromIndex: number, toIndex: number) => void;
  clearItems: () => void;
  ensureMinimumRows: (count?: number) => void;

  // Supplier & Metadata Actions
  setSupplier: (supplier: RequisitionSupplier | null) => void;
  setNotes: (notes: string) => void;
  setBatchTitle: (title: string) => void;

  // Batch Management
  saveCurrentBatch: () => string;
  loadBatch: (batchId: string) => void;
  deleteBatch: (batchId: string) => void;

  // Clipboard import
  importFromText: (text: string) => number;
}

const createEmptyItem = (): RequisitionItem => ({
  id: crypto.randomUUID(),
  name: '',
  partNumber: '',
  brand: '',
  quantity: 1,
  notes: '',
});

const DEFAULT_ROW_COUNT = 5;

export const useRequisitionsStore = create<RequisitionsState>()(
  persist(
    (set, get) => ({
      items: [
        createEmptyItem(),
        createEmptyItem(),
        createEmptyItem(),
        createEmptyItem(),
        createEmptyItem(),
      ],
      supplier: null,
      notes: '',
      batchTitle: `طلب مشتريات - ${formatLocalDate()}`,
      savedBatches: [],

      addItem: initial => {
        const newItem: RequisitionItem = {
          ...createEmptyItem(),
          ...initial,
        };
        set(state => ({ items: [...state.items, newItem] }));
      },

      updateItem: (id, updates) => {
        set(state => ({
          items: state.items.map(item => (item.id === id ? { ...item, ...updates } : item)),
        }));
      },

      removeItem: id => {
        set(state => {
          const next = state.items.filter(item => item.id !== id);
          return {
            items: next.length > 0 ? next : [createEmptyItem()],
          };
        });
      },

      duplicateItem: id => {
        set(state => {
          const idx = state.items.findIndex(item => item.id === id);
          const target = state.items.find(item => item.id === id);
          if (idx === -1 || target === undefined) return state;
          const cloned: RequisitionItem = {
            ...target,
            id: crypto.randomUUID(),
          };
          const next = [...state.items];
          next.splice(idx + 1, 0, cloned);
          return { items: next };
        });
      },

      moveItem: (fromIndex, toIndex) => {
        set(state => {
          if (
            fromIndex < 0 ||
            fromIndex >= state.items.length ||
            toIndex < 0 ||
            toIndex >= state.items.length
          ) {
            return state;
          }
          const next = [...state.items];
          const [moved] = next.splice(fromIndex, 1);
          next.splice(toIndex, 0, moved);
          return { items: next };
        });
      },

      clearItems: () => {
        set({
          items: [
            createEmptyItem(),
            createEmptyItem(),
            createEmptyItem(),
            createEmptyItem(),
            createEmptyItem(),
          ],
          notes: '',
        });
      },

      ensureMinimumRows: (count = DEFAULT_ROW_COUNT) => {
        set(state => {
          if (state.items.length >= count) return state;
          const additionalCount = count - state.items.length;
          const newRows = Array.from({ length: additionalCount }, () => createEmptyItem());
          return { items: [...state.items, ...newRows] };
        });
      },

      setSupplier: supplier => set({ supplier }),
      setNotes: notes => set({ notes }),
      setBatchTitle: batchTitle => set({ batchTitle }),

      saveCurrentBatch: () => {
        const state = get();
        const nonEmptyItems = state.items.filter(
          item => item.name.trim() !== '' || item.partNumber.trim() !== ''
        );
        const now = formatLocalDate();
        const batchId = crypto.randomUUID();
        const newBatch: RequisitionBatch = {
          id: batchId,
          title: state.batchTitle.trim() || `طلب مشتريات - ${now}`,
          supplier: state.supplier || undefined,
          items: nonEmptyItems.length > 0 ? nonEmptyItems : state.items,
          notes: state.notes,
          createdAt: now,
          updatedAt: now,
          status: 'draft',
        };

        set(s => ({
          savedBatches: [newBatch, ...s.savedBatches.filter(b => b.id !== batchId)],
        }));

        return batchId;
      },

      loadBatch: batchId => {
        const state = get();
        const found = state.savedBatches.find(b => b.id === batchId);
        if (!found) return;

        set({
          batchTitle: found.title,
          supplier: found.supplier || null,
          items:
            found.items.length > 0
              ? found.items.map(item => ({ ...item, id: crypto.randomUUID() }))
              : [createEmptyItem()],
          notes: found.notes || '',
        });
      },

      deleteBatch: batchId => {
        set(state => ({
          savedBatches: state.savedBatches.filter(b => b.id !== batchId),
        }));
      },

      importFromText: text => {
        if (text.trim() === '') return 0;
        const lines = text
          .split(/\r?\n/)
          .map(l => l.trim())
          .filter(Boolean);
        const imported: RequisitionItem[] = [];

        for (const line of lines) {
          // Check for tab or comma separation
          const delimiter = line.includes('\t') ? '\t' : line.includes(',') ? ',' : null;
          if (delimiter) {
            const parts = line.split(delimiter).map(p => p.trim());
            if (parts.length > 0) {
              const name = parts[0] || '';
              const partNumber = parts[1] || '';
              const brand = parts[2] || '';
              const rawQty = parts[3] ? Number(parts[3].replace(/[^\d.]/g, '')) : 1;
              const quantity = !isNaN(rawQty) && rawQty > 0 ? rawQty : 1;
              const notes = parts.slice(4).join(' ').trim();

              if (name || partNumber) {
                imported.push({
                  id: crypto.randomUUID(),
                  name,
                  partNumber,
                  brand,
                  quantity,
                  notes,
                });
              }
            }
          } else {
            // Single line product name/part number
            if (line) {
              imported.push({
                id: crypto.randomUUID(),
                name: line,
                partNumber: '',
                brand: '',
                quantity: 1,
                notes: '',
              });
            }
          }
        }

        if (imported.length > 0) {
          set(state => {
            // replace empty placeholder rows or append
            const active = state.items.filter(
              item => item.name.trim() !== '' || item.partNumber.trim() !== ''
            );
            return { items: [...active, ...imported] };
          });
        }

        return imported.length;
      },
    }),
    {
      name: 'alzhra_sales_requisitions_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        items: state.items,
        supplier: state.supplier,
        notes: state.notes,
        batchTitle: state.batchTitle,
        savedBatches: state.savedBatches,
      }),
    }
  )
);
