
import { supabase } from '../../../lib/supabaseClient';
import { logger } from '../../../core/utils/logger';
import type { CreatePurchaseDTO } from '../types';

export const purchaseAccountingService = {
    /**
     * Post-commit accounting verification (fire-and-forget).
     *
     * `commit_purchase_invoice` is expected to create the journal entry
     * (Dr Purchases / Cr Supplier) natively. This check queries the journal
     * and warns when it is missing, so a "successful save without a journal
     * entry" is never silent. It never throws — the save flow must not be
     * blocked by verification.
     */
    handleNewPurchase: async (...args: [string, CreatePurchaseDTO, string, string, number]): Promise<void> => {
        const [invoiceId] = args;
        try {
            const { data, error } = await supabase
                .from('journal_entries')
                .select('id')
                .eq('reference_id', invoiceId)
                .is('deleted_at', null)
                .limit(1);

            if (error) throw error;

            if (data.length === 0) {
                logger.warn('PurchaseAccounting', 'No journal entry found for purchase invoice after commit', { invoiceId });
            }
        } catch (err) {
            logger.warn('PurchaseAccounting', 'Post-commit journal verification failed', { invoiceId, error: err });
        }
    }
};


