import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory mock for idb-keyval in Node/Vitest environment
const mockStorage = new Map<string, any>();

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => mockStorage.get(key)),
  set: vi.fn(async (key: string, val: any) => {
    mockStorage.set(key, val);
  }),
  update: vi.fn(async (key: string, updater: (val: any) => any) => {
    const current = mockStorage.get(key);
    const updated = updater(current);
    mockStorage.set(key, updated);
  }),
  del: vi.fn(async (key: string) => {
    mockStorage.delete(key);
  }),
}));

import { offlineMutationQueue } from './offlineMutationQueue';
import { syncStore } from '../lib/sync-store';

describe('OfflineMutationQueue', () => {
  beforeEach(async () => {
    mockStorage.clear();
    await syncStore.clear();
  });

  it('enqueues mutations and triggers registered handlers sequentially', async () => {
    const executed: string[] = [];

    offlineMutationQueue.registerHandler('TEST_CREATE_ORDER', async (variables: any) => {
      executed.push(variables.orderNumber);
      return { success: true };
    });

    await offlineMutationQueue.addMutation(['TEST_CREATE_ORDER'], { orderNumber: 'ORD-001' }, undefined, { autoFlush: false });
    await offlineMutationQueue.addMutation(['TEST_CREATE_ORDER'], { orderNumber: 'ORD-002' }, undefined, { autoFlush: false });

    const countBefore = await offlineMutationQueue.getPendingCount();
    expect(countBefore).toBe(2);

    const result = await offlineMutationQueue.processQueue();

    expect(result.processed).toBe(2);
    expect(result.failed).toBe(0);
    expect(executed).toEqual(['ORD-001', 'ORD-002']);

    const remaining = await offlineMutationQueue.getPendingCount();
    expect(remaining).toBe(0);
  });

  it('handles failing mutations by incrementing retry count', async () => {
    let attempts = 0;

    offlineMutationQueue.registerHandler('TEST_FAILING_ACTION', async () => {
      attempts++;
      throw new Error('Database connection timeout');
    });

    await offlineMutationQueue.addMutation(['TEST_FAILING_ACTION'], { data: 123 }, undefined, { autoFlush: false });

    const result = await offlineMutationQueue.processQueue();

    expect(result.failed).toBe(1);
    expect(attempts).toBe(1);

    const pending = await syncStore.getPending();
    expect(pending).toHaveLength(1);
    expect(pending[0].retryCount).toBe(1);
  });
});
