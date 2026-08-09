
import { update, get, set } from 'idb-keyval';
import { logger } from '../core/utils/logger';

const QUEUE_KEY = 'offline-queue';

export interface QueuedAction {
  id: string;                    // Unique action ID
  type: string;                  // e.g. 'CREATE_INVOICE', 'CREATE_PURCHASE'
  payload: unknown;
  idempotencyKey: string;        // Prevents duplicate processing
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  lastAttemptAt?: number;
}

function generateId(): string {
  // crypto.randomUUID() with fallback
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const offlineService = {
  /**
   * إضافة عملية جديدة إلى قائمة الانتظار مع مفتاح Idempotency.
   */
  async queueAction(action: Omit<QueuedAction, 'id' | 'timestamp' | 'status' | 'retryCount' | 'maxRetries'>): Promise<string> {
    const id = generateId();
    const queuedAction: QueuedAction = {
      ...action,
      id,
      idempotencyKey: action.idempotencyKey || generateId(),
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
      maxRetries: 5,
    };
    await update(QUEUE_KEY, (val: QueuedAction[] = []) => [...val, queuedAction]);
    logger.info('OfflineService', `Action '${action.type}' queued with idempotency key`, { id, key: queuedAction.idempotencyKey });
    return id;
  },

  /**
   * جلب كافة العمليات من قائمة الانتظار.
   */
  async getQueuedActions(): Promise<QueuedAction[]> {
    return (await get(QUEUE_KEY)) || [];
  },

  /**
   * جلب العمليات الفاشلة القابلة لإعادة المحاولة.
   */
  async getFailedActions(): Promise<QueuedAction[]> {
    const all = await this.getQueuedActions();
    return all.filter(a => a.status === 'failed' && a.retryCount < a.maxRetries);
  },

  /**
   * تحديث حالة عملية إلى 'syncing'.
   */
  async markSyncing(id: string): Promise<void> {
    await update(QUEUE_KEY, (val: QueuedAction[] = []) =>
      val.map(a => a.id === id ? { ...a, status: 'syncing' as const, lastAttemptAt: Date.now() } : a)
    );
  },

  /**
   * تحديث حالة عملية إلى 'failed' مع سبب الفشل.
   * العملية تبقى في القائمة لإعادة المحاولة لاحقًا.
   */
  async markFailed(id: string, error: string): Promise<void> {
    await update(QUEUE_KEY, (val: QueuedAction[] = []) =>
      val.map(a => a.id === id ? {
        ...a,
        status: 'failed' as const,
        lastError: error,
        retryCount: a.retryCount + 1,
        lastAttemptAt: Date.now(),
      } : a)
    );
    logger.warn('OfflineService', `Action '${id}' marked as failed (attempt ${(await this.getById(id))?.retryCount})`, { error });
  },

  /**
   * تحديث حالة عملية إلى 'completed'.
   */
  async markCompleted(id: string): Promise<void> {
    await update(QUEUE_KEY, (val: QueuedAction[] = []) =>
      val.map(a => a.id === id ? { ...a, status: 'completed' as const } : a)
    );
  },

  /**
   * الحصول على عملية محددة بمعرفها.
   */
  async getById(id: string): Promise<QueuedAction | null> {
    const all = await this.getQueuedActions();
    return all.find(a => a.id === id) || null;
  },

  /**
   * مسح العمليات المكتملة فقط (وليس الفاشلة).
   */
  async clearCompleted(): Promise<void> {
    await update(QUEUE_KEY, (val: QueuedAction[] = []) =>
      val.filter(a => a.status !== 'completed')
    );
    logger.info('OfflineService', 'Completed actions cleared from queue');
  },

  /**
   * مسح قائمة الانتظار بالكامل بعد نجاح المزامنة الكاملة.
   */
  async clearQueue(): Promise<void> {
    await set(QUEUE_KEY, []);
    logger.info('OfflineService', 'Queue fully cleared');
  },

  /**
   * التحقق من وجود عملية بنفس idempotency key (منع التكرار).
   */
  async isDuplicate(idempotencyKey: string): Promise<boolean> {
    const all = await this.getQueuedActions();
    return all.some(a => a.idempotencyKey === idempotencyKey && (a.status === 'completed' || a.status === 'syncing'));
  },

  /**
   * إعادة محاولة جميع العمليات الفاشلة.
   */
  async getRetryableActions(): Promise<QueuedAction[]> {
    const all = await this.getQueuedActions();
    return all.filter(a =>
      (a.status === 'failed' || a.status === 'pending') &&
      a.retryCount < a.maxRetries
    );
  },
};