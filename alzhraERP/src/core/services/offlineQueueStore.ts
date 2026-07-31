import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get, set as idbSet, del } from 'idb-keyval';
import { logger } from '../utils/logger';
import { inventoryService } from '../../features/inventory/service';
import { salesService } from '../../features/sales/service';

/**
 * OfflineAction represents a pending database operation
 */
export interface OfflineAction {
    id: string;
    type: 'CREATE_INVOICE' | 'UPDATE_STOCK' | 'CREATE_PRODUCT' | 'DELETE_PRODUCT' | 'POST_JOURNAL';
    payload: any;
    timestamp: number;
    retryCount: number;
}

interface OfflineQueueState {
    queue: OfflineAction[];
    isProcessing: boolean;

    // Actions
    enqueue: (type: OfflineAction['type'], payload: any) => void;
    removeFromQueue: (id: string) => void;
    updateAction: (id: string, updates: Partial<OfflineAction>) => void;
    setProcessing: (processing: boolean) => void;
    clearQueue: () => void;
    syncQueue: () => Promise<void>;
}

// Custom storage for zustand using idb-keyval to handle large offline queues safely
const idbStorage = {
    getItem: async (name: string) => (await get(name)) || null,
    setItem: async (name: string, value: string) => await idbSet(name, value),
    removeItem: async (name: string) => await del(name),
};

export const useOfflineQueueStore = create<OfflineQueueState>()(
    persist(
        (set, getStore) => ({
            queue: [],
            isProcessing: false,

            enqueue: (type: OfflineAction['type'], payload: any) => {
                const newAction: OfflineAction = {
                    id: crypto.randomUUID(),
                    type,
                    payload,
                    timestamp: Date.now(),
                    retryCount: 0,
                };
                set((state: OfflineQueueState) => ({ queue: [...state.queue, newAction] }));
            },

            removeFromQueue: (id: string) => {
                set((state: OfflineQueueState) => ({ queue: state.queue.filter((a) => a.id !== id) }));
            },

            updateAction: (id: string, updates: Partial<OfflineAction>) => {
                set((state: OfflineQueueState) => ({
                    queue: state.queue.map((a) => (a.id === id ? { ...a, ...updates } : a)),
                }));
            },

            setProcessing: (isProcessing: boolean) => set({ isProcessing }),

            clearQueue: () => set({ queue: [] }),

            syncQueue: async () => {
                const state = getStore();
                const { queue, isProcessing, setProcessing, removeFromQueue, updateAction } = state;

                if (isProcessing || queue.length === 0) return;

                setProcessing(true);
                logger.info('OfflineQueue', `Starting sync for ${queue.length} actions`);

                for (const action of queue) {
                    try {
                        const { company_id, user_id, ...data } = action.payload;

                        switch (action.type) {
                            case 'CREATE_PRODUCT':
                                await inventoryService.createProduct(data, company_id, user_id);
                                break;
                            case 'CREATE_INVOICE':
                                await salesService.processNewSale(company_id, user_id, data);
                                break;
                            case 'UPDATE_STOCK':
                                // await inventoryService.updateStock(data);
                                break;
                        }

                        removeFromQueue(action.id);
                        logger.info('OfflineQueue', `Successfully synced action ${action.id}`);
                    } catch (err: any) {
                        logger.error('OfflineQueue', `Failed to sync action ${action.id}`, err);
                        updateAction(action.id, { retryCount: (action.retryCount || 0) + 1 });

                        // Stop on significant error to preserve order
                        break;
                    }
                }

                setProcessing(false);
            },
        }),
        {
            name: 'alzhra-offline-queue',
            storage: createJSONStorage(() => idbStorage as any),
        }
    )
);
