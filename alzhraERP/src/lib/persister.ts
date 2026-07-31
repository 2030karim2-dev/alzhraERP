import { get, set, del } from 'idb-keyval';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

const idbStorage = {
  getItem: async (key: string) => {
    const value = await get(key);
    return value;
  },
  setItem: async (key: string, value: string) => {
    await set(key, value);
  },
  removeItem: async (key: string) => {
    await del(key);
  },
};

export const persister = createAsyncStoragePersister({
  storage: idbStorage,
  key: 'AL_ZAHRA_OFFLINE_CACHE',
  throttleTime: 1000,
});