import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { del, get, set } from 'idb-keyval';
import { Persister } from '@tanstack/react-query-persist-client';

/**
 * Creates an IndexedDB persister for TanStack Query
 * This allows the app to load data from the local database when offline
 */
export function createIndexedDBPersister(idbKey: string = 'alzhra-query-cache'): Persister {
    return {
        persistClient: async (client) => {
            await set(idbKey, client);
        },
        restoreClient: async () => {
            return await get(idbKey);
        },
        removeClient: async () => {
            await del(idbKey);
        },
    };
}

// Fallback to localStorage if IndexedDB is not available or for simpler data
export const localStoragePersister = createSyncStoragePersister({
    storage: window.localStorage,
    key: 'ALZHRA_OFFLINE_CACHE',
});
