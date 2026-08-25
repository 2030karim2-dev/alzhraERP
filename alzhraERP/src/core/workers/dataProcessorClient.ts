/**
 * Client interface for Data Processor Web Worker
 * Provides Promise-based offloading with main-thread fallback.
 */
import type { WorkerTaskMessage, WorkerResponseMessage } from './dataProcessor.worker';

class DataProcessorClient {
  private worker: Worker | null = null;
  private pendingTasks = new Map<
    string,
    { resolve: (value: any) => void; reject: (reason?: any) => void }
  >();

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return;
    }

    try {
      this.worker = new Worker(
        new URL('./dataProcessor.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (e: MessageEvent<WorkerResponseMessage>) => {
        const { id, success, result, error } = e.data;
        const task = this.pendingTasks.get(id);
        if (task) {
          this.pendingTasks.delete(id);
          if (success) {
            task.resolve(result);
          } else {
            task.reject(new Error(error || 'Worker operation failed'));
          }
        }
      };

      this.worker.onerror = (err) => {
        console.error('DataProcessor Worker error:', err);
      };
    } catch (e) {
      console.warn('Web Workers unavailable or failed to initialize, using main thread fallback', e);
      this.worker = null;
    }
  }

  public async runTask<T = any>(
    type: WorkerTaskMessage['type'],
    payload: any
  ): Promise<T> {
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (this.worker) {
      return new Promise<T>((resolve, reject) => {
        this.pendingTasks.set(id, { resolve, reject });
        this.worker!.postMessage({ id, type, payload } as WorkerTaskMessage);
      });
    }

    // Direct Synchronous Fallback (e.g. during Node/Vitest tests)
    switch (type) {
      case 'FILTER_DATASET': {
        const { items, filterCriteria } = payload;
        if (!Array.isArray(items)) return [] as unknown as T;
        const keys = Object.keys(filterCriteria || {});
        if (keys.length === 0) return items as unknown as T;
        return items.filter(item =>
          keys.every(key => {
            const criterion = filterCriteria[key];
            if (criterion === undefined || criterion === null || criterion === '') return true;
            const val = item[key];
            if (typeof val === 'string' && typeof criterion === 'string') {
              return val.toLowerCase().includes(criterion.toLowerCase());
            }
            return val === criterion;
          })
        ) as unknown as T;
      }
      case 'CALCULATE_TOTALS': {
        const { items, numericFields } = payload;
        const totals: Record<string, number> = {};
        (numericFields || []).forEach((field: string) => {
          totals[field] = 0;
        });
        if (Array.isArray(items)) {
          items.forEach(item => {
            numericFields.forEach((field: string) => {
              const val = Number(item[field]);
              if (!isNaN(val)) totals[field] += val;
            });
          });
        }
        return totals as unknown as T;
      }
      case 'PARSE_EXCEL_ROWS': {
        const { rawRows, headerMap } = payload;
        if (!Array.isArray(rawRows) || rawRows.length < 2) return [] as unknown as T;
        const headerRow = rawRows[0] || [];
        const normalizedHeaders = headerRow.map((h: any) => String(h || '').trim());
        const dataRows = rawRows.slice(1);
        return dataRows.map(row => {
          const item: Record<string, any> = {};
          normalizedHeaders.forEach((header: string, index: number) => {
            const mappedKey = headerMap?.[header] || header;
            item[mappedKey] = row[index] !== undefined ? row[index] : null;
          });
          return item;
        }) as unknown as T;
      }
      case 'AGGREGATE_LEDGER': {
        const { entries } = payload;
        let totalDebit = 0;
        let totalCredit = 0;
        if (Array.isArray(entries)) {
          entries.forEach(entry => {
            totalDebit += Number(entry.debit || 0);
            totalCredit += Number(entry.credit || 0);
          });
        }
        return {
          totalDebit,
          totalCredit,
          balance: totalDebit - totalCredit,
          isBalanced: Math.abs(totalDebit - totalCredit) < 0.001,
        } as unknown as T;
      }
      default:
        throw new Error(`Unsupported task type: ${type}`);
    }
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingTasks.clear();
  }
}

export const dataProcessorClient = new DataProcessorClient();
