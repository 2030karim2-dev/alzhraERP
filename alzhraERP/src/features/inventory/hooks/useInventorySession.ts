/**
 * useInventorySession - Hook to manage inventory session state with persistence
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  inventoryPersistence,
  type InventorySessionDraft,
} from '../services/inventoryPersistenceService';
import { useFeedbackStore } from '../../feedback/store';

interface UseInventorySessionProps {
  sessionId: string;
  warehouseId?: string;
  initialItems: Array<Record<string, unknown>>;
  autoSave?: boolean;
}

export function useInventorySession({
  sessionId,
  warehouseId,
  initialItems,
  autoSave = true,
}: UseInventorySessionProps) {
  const { showToast } = useFeedbackStore();
  const [items, setItems] = useState<Array<Record<string, unknown>>>(initialItems);
  const [isRestoring, setIsRestoring] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const isDirtyRef = useRef(false);
  const lastItemsRef = useRef<Array<Record<string, unknown>>>(initialItems);

  // Restore session on mount
  useEffect(() => {
    let mounted = true;
    async function restore() {
      if (!mounted) return;
      const draft = await inventoryPersistence.restoreSession(sessionId);
      if (draft && mounted) {
        // Merge draft quantities into initialItems to preserve full product details
        const mergedItems = [...initialItems];

        draft.items.forEach(draftItem => {
          const existingIndex = mergedItems.findIndex(
            i => (i.product_id || i.id) === draftItem.productId
          );

          if (existingIndex >= 0) {
            mergedItems[existingIndex] = {
              ...mergedItems[existingIndex],
              counted_quantity: draftItem.countedQuantity,
            };
          } else {
            // Edge case: item in draft but not in server yet
            mergedItems.push({
              product_id: draftItem.productId,
              counted_quantity: draftItem.countedQuantity,
            });
          }
        });

        setItems(mergedItems);
        lastItemsRef.current = mergedItems;
        setSaveStatus('saved');
        showToast('تم استعادة بيانات الجلسة من الحفظ التلقائي', 'info');
      }
      setIsRestoring(false);
    }

    // We only want to restore once, but we need initialItems to be loaded first
    // If initialItems is empty, it might be loading, or it might actually be empty.
    // We'll run restore once we have items, or after a short delay if it remains empty.
    const timer = setTimeout(
      () => {
        if (mounted && isRestoring) {
          restore();
        }
      },
      initialItems.length > 0 ? 0 : 1000
    );

    if (initialItems.length > 0 && isRestoring) {
      clearTimeout(timer);
      restore();
    }

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [sessionId, showToast, initialItems, isRestoring]);

  // Subscribe to save status changes
  useEffect(() => {
    const unsubscribe = inventoryPersistence.subscribe(setSaveStatus);
    return unsubscribe;
  }, []);

  // Helper to build draft
  const buildDraft = useCallback(
    (currentItems: Array<Record<string, unknown>>): InventorySessionDraft => {
      const draft: InventorySessionDraft = {
        sessionId,
        items: currentItems.map(item => ({
          productId: String(item.product_id || item.id || ''),
          countedQuantity: (item.counted_quantity as number) ?? null,
          timestamp: Date.now(),
          synced: false,
        })),
        lastSavedAt: Date.now(),
        isDirty: true,
      };
      if (warehouseId) {
        draft.warehouseId = warehouseId;
      }
      return draft;
    },
    [sessionId, warehouseId]
  );

  // Auto-save on items change
  useEffect(() => {
    if (!autoSave) return;
    if (JSON.stringify(items) === JSON.stringify(lastItemsRef.current)) return;
    isDirtyRef.current = true;
    lastItemsRef.current = items;
    const draft = buildDraft(items);
    inventoryPersistence.scheduleLocalSave(draft);
    inventoryPersistence.saveToServer(draft);
  }, [items, autoSave, buildDraft]);

  // Force save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isDirtyRef.current) {
        const draft = buildDraft(items);
        inventoryPersistence.forceSave(draft);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [items, buildDraft]);

  const updateItems = useCallback((newItems: Array<Record<string, unknown>>) => {
    setItems(newItems);
  }, []);
  const updateItemQuantity = useCallback((productId: string, quantity: number | null) => {
    setItems(prev =>
      prev.map(item =>
        (item.product_id || item.id) === productId ? { ...item, counted_quantity: quantity } : item
      )
    );
  }, []);
  const addItem = useCallback((item: Record<string, unknown>) => {
    setItems(prev => {
      const exists = prev.find(i => (i.product_id || i.id) === (item.product_id || item.id));
      if (exists) return prev;
      return [item, ...prev];
    });
  }, []);
  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(item => (item.product_id || item.id) !== productId));
  }, []);
  const clearSession = useCallback(() => {
    setItems([]);
    lastItemsRef.current = [];
    isDirtyRef.current = false;
    inventoryPersistence.clearSession();
  }, []);
  const mergeWithServer = useCallback((serverItems: Array<Record<string, unknown>>) => {
    setItems(prev => {
      const merged = [...prev];
      serverItems.forEach(serverItem => {
        const exists = merged.find(
          i => (i.product_id || i.id) === (serverItem.product_id || serverItem.id)
        );
        if (!exists) merged.unshift(serverItem);
      });
      lastItemsRef.current = merged;
      return merged;
    });
  }, []);

  return {
    items,
    updateItems,
    updateItemQuantity,
    addItem,
    removeItem,
    clearSession,
    mergeWithServer,
    isRestoring,
    saveStatus,
    isDirty: isDirtyRef.current,
  };
}
