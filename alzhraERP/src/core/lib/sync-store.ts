import { get, del, update } from 'idb-keyval';
import { logger } from '../utils/logger';

export interface PendingMutation {
    id: string;
    mutationKey: any[];
    variables: any;
    timestamp: number;
    retryCount: number;
    metadata?: {
        version?: string | number;
        last_updated_at?: string;
    };
}

const STORAGE_KEY = 'alzhra-pending-sync';

export const syncStore = {
    /**
     * Enqueue a new mutation for background sync.
     *
     * Identical pending mutations (same `mutationKey` and same `variables`)
     * are de-duplicated: retrying the same offline action must not enqueue a
     * second entry that would later execute the operation twice.
     */
    async enqueue(mutation: Omit<PendingMutation, 'id' | 'timestamp' | 'retryCount'>) {
        const key = JSON.stringify(mutation.mutationKey);
        const variables = JSON.stringify(mutation.variables);

        const existing = await this.getPending();
        const duplicate = existing.find(
            (m) => JSON.stringify(m.mutationKey) === key && JSON.stringify(m.variables) === variables
        );
        if (duplicate) {
            logger.info('SyncStore', `Duplicate pending mutation skipped: ${duplicate.id}`);
            return duplicate.id;
        }

        const id = crypto.randomUUID();
        const newEntry: PendingMutation = {
            ...mutation,
            id,
            timestamp: Date.now(),
            retryCount: 0,
        };

        await update(STORAGE_KEY, (val: PendingMutation[] | undefined) => {
            const list = val || [];
            return [...list, newEntry];
        });

        logger.info('SyncStore', `Enqueued mutation: ${id}`, { key: mutation.mutationKey });
        return id;
    },

    /**
     * Get all pending mutations
     */
    async getPending(): Promise<PendingMutation[]> {
        return (await get(STORAGE_KEY)) || [];
    },

    /**
     * Remove a mutation after successful sync
     */
    async dequeue(id: string) {
        await update(STORAGE_KEY, (val: PendingMutation[] | undefined) => {
            if (!val) return [];
            return val.filter(m => m.id !== id);
        });
        logger.info('SyncStore', `Dequeued mutation: ${id}`);
    },

    /**
     * Update retry count for a mutation
     */
    async incrementRetry(id: string) {
        await update(STORAGE_KEY, (val: PendingMutation[] | undefined) => {
            if (!val) return [];
            return val.map(m =>
                m.id === id ? { ...m, retryCount: m.retryCount + 1 } : m
            );
        });
    },

    /**
     * Clear all pending mutations (dangerous!)
     */
    async clear() {
        await del(STORAGE_KEY);
    }
};
