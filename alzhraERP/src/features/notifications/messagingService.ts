// ============================================
// Messaging Service - Central Notification Hub
// ============================================
// Fire-and-forget: never blocks the transaction

import { messagingApi } from './messagingApi';
import { messageTemplates, SaleData, PurchaseData, BondData, ExpenseData, StockTransferData } from './messageTemplates';

type EventMap = {
    sale: SaleData;
    purchase: PurchaseData;
    bond_receipt: BondData;
    bond_payment: BondData;
    expense: ExpenseData;
    stock_transfer: StockTransferData;
};

// Map frontend event types to the DB event_type values
const eventTypeToDbField: Record<string, string> = {
    sale: 'sale',
    purchase: 'purchase',
    bond_receipt: 'bond',
    bond_payment: 'bond',
    expense: 'expense',
    stock_transfer: 'stock_transfer',
};

export const messagingService = {
    /**
     * Send a transaction notification (fire-and-forget).
     * Call this after a successful transaction. Errors are logged but never thrown.
     */
    notify: <T extends keyof EventMap>(
        companyId: string,
        eventType: T,
        data: EventMap[T],
        referenceId?: string
    ): void => {
        // Fire-and-forget: run in background
        (async () => {
            try {
                const templateFn = messageTemplates[eventType];
                if (!templateFn) {
                    console.warn(`[MessagingService] No template for event: ${eventType}`);
                    return;
                }

                const message = templateFn(data as any);
                const dbEventType = eventTypeToDbField[eventType] || eventType;

                await messagingApi.sendNotification(companyId, dbEventType, message, referenceId);
            } catch (error) {
                // Never let notification errors affect the main flow
                console.error('[MessagingService] Notification failed (non-blocking):', error);
            }
        })();
    },

    /**
     * Test connection to a specific channel
     */
    testConnection: async (companyId: string): Promise<{ success: boolean; results?: any[] }> => {
        const testMessage = `✅ اختبار الاتصال ناجح!
━━━━━━━━━━━━━━
🔗 نظام الزهراء سمارت ERP
📅 ${new Date().toLocaleDateString('ar-SA-u-nu-latn')}
⏰ ${new Date().toLocaleTimeString('ar-SA')}`;

        return await messagingApi.sendNotification(companyId, 'test', testMessage);
    },
};
