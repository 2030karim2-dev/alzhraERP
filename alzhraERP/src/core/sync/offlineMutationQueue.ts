/**
 * Enterprise Offline Mutation Queue
 * Manages background execution, exponential backoff, conflict resolution, and offline telemetry.
 */
import { useState, useEffect } from 'react';
import { syncStore, type PendingMutation } from '../lib/sync-store';
import { logger } from '../utils/logger';

export interface MutationProcessor<TVariables = any, TResult = any> {
  (variables: TVariables): Promise<TResult>;
}

type SyncListener = (pendingCount: number, isSyncing: boolean) => void;

function isFatalClientError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.statusCode;
  if (status === 400 || status === 422 || status === 403 || status === 401) {
    return true;
  }
  const code = String(err.code || '');
  if (code.startsWith('23') || code.startsWith('PGRST1') || code.startsWith('PGRST2')) {
    return true;
  }
  return false;
}

class OfflineMutationQueueManager {
  private handlers = new Map<string, MutationProcessor>();
  private isProcessing = false;
  private listeners = new Set<SyncListener>();
  private maxRetries = 5;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        logger.info('OfflineSync', 'Network restored, triggering automatic queue flush');
        void this.processQueue();
      });
    }
  }

  /**
   * Register an action handler by mutation key prefix or exact name
   */
  public registerHandler(key: string, processor: MutationProcessor) {
    this.handlers.set(key, processor);
  }

  /**
   * Subscribe to queue status changes (pending count, syncing state)
   */
  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    void this.notifyListeners();
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notifyListeners() {
    const pending = await syncStore.getPending();
    const count = pending.length;
    this.listeners.forEach(fn => fn(count, this.isProcessing));
  }

  /**
   * Add a mutation to the persistent queue and attempt immediate execution if online
   */
  public async addMutation(
    mutationKey: string[],
    variables: unknown,
    metadata?: PendingMutation['metadata'],
    options: { autoFlush?: boolean } = { autoFlush: true }
  ): Promise<string> {
    const id = await syncStore.enqueue({
      mutationKey,
      variables,
      ...(metadata ? { metadata } : {}),
    });

    await this.notifyListeners();

    // If online and autoFlush requested, trigger background processing
    if (options.autoFlush !== false && (typeof navigator === 'undefined' || navigator.onLine)) {
      void this.processQueue();
    }

    return id;
  }

  /**
   * Process all pending mutations sequentially in order of insertion
   */
  public async processQueue(): Promise<{ processed: number; failed: number }> {
    if (this.isProcessing) {
      return { processed: 0, failed: 0 };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { processed: 0, failed: 0 };
    }

    this.isProcessing = true;
    await this.notifyListeners();

    let processedCount = 0;
    let failedCount = 0;

    try {
      const pending = await syncStore.getPending();
      // Sort oldest first
      const sorted = [...pending].sort((a, b) => a.timestamp - b.timestamp);

      for (const item of sorted) {
        const primaryKey = Array.isArray(item.mutationKey)
          ? String(item.mutationKey[0])
          : String(item.mutationKey);
        const handler = this.handlers.get(primaryKey);

        if (!handler) {
          logger.warn(
            'OfflineSync',
            `No handler registered for mutation key: ${primaryKey}. Retrying later.`
          );
          continue;
        }

        try {
          await handler(item.variables);
          await syncStore.dequeue(item.id);
          processedCount++;
          logger.info('OfflineSync', `Successfully replayed mutation: ${item.id} (${primaryKey})`);
        } catch (err: any) {
          failedCount++;
          await syncStore.incrementRetry(item.id);
          logger.error('OfflineSync', `Failed to execute mutation ${item.id}:`, err);

          const isFatal = isFatalClientError(err);
          if (isFatal || item.retryCount >= this.maxRetries) {
            logger.warn(
              'OfflineSync',
              `Mutation ${item.id} ${isFatal ? 'encountered fatal client error' : `exceeded max retries (${this.maxRetries})`}. Dropping from queue.`
            );
            await syncStore.dequeue(item.id);
          } else {
            // Exponential backoff pause between transient errors
            await new Promise(res =>
              setTimeout(res, Math.min(1000 * Math.pow(2, item.retryCount), 10000))
            );
          }
        }
      }
    } finally {
      this.isProcessing = false;
      await this.notifyListeners();
    }

    return { processed: processedCount, failed: failedCount };
  }

  /**
   * Get current count of pending offline items
   */
  public async getPendingCount(): Promise<number> {
    const pending = await syncStore.getPending();
    return pending.length;
  }
}

export const offlineMutationQueue = new OfflineMutationQueueManager();

/**
 * React hook to listen to offline sync queue state in UI components
 */
export function useOfflineQueueStatus() {
  const [status, setStatus] = useState<{ pendingCount: number; isSyncing: boolean }>({
    pendingCount: 0,
    isSyncing: false,
  });

  useEffect(() => {
    return offlineMutationQueue.subscribe((pendingCount, isSyncing) => {
      setStatus({ pendingCount, isSyncing });
    });
  }, []);

  return status;
}
