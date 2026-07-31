
import { update, get, set } from 'idb-keyval';

const QUEUE_KEY = 'offline-queue';

export interface QueuedAction {
    type: string;
    payload: unknown;
    timestamp: number;
}

export const offlineService = {
    /**
     * إضافة عملية جديدة إلى قائمة الانتظار في IndexedDB
     */
    async queueAction(action: Omit<QueuedAction, 'timestamp'>): Promise<void> {
        const queuedAction: QueuedAction = { ...action, timestamp: Date.now() };
        await update(QUEUE_KEY, (val: QueuedAction[] = []) => [...val, queuedAction]);
        console.info(`[Offline Service] Action '${action.type}' queued.`);
    },

    /**
     * جلب كافة العمليات من قائمة الانتظار
     */
    async getQueuedActions(): Promise<QueuedAction[]> {
        return (await get(QUEUE_KEY)) || [];
    },

    /**
     * مسح قائمة الانتظار بالكامل بعد نجاح المزامنة
     */
    async clearQueue(): Promise<void> {
        await set(QUEUE_KEY, []);
        console.info('[Offline Service] Queue cleared.');
    }
};