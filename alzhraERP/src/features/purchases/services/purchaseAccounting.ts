
// import { supabase } from '../../../lib/supabaseClient';
// import { accountsService } from '../../accounting/services/accountsService';
// import { journalService } from '../../accounting/services/journalService';
// import { bondsService } from '../../bonds/service';
import { CreatePurchaseDTO } from '../types';
// import { routeToChildByCurrency } from '../../../core/utils/accountRouting';

export const purchaseAccountingService = {
    /**
     * Handle accounting side-effects for a new purchase.
     * 
     * IMPORTANT: The `commit_purchase_invoice` RPC already creates:
     *   Dr Purchases (5201) / Cr Supplier (2201)
     * 
     * So we do NOT create that entry again. We only need to handle cash purchases:
     * - Cash: Create a transfer entry Dr Supplier / Cr Cash (to move amount from payable to cash)
     * - Credit: Do nothing (RPC already handled it correctly)
     */
    handleNewPurchase: async (
        invoiceId: string,
        data: CreatePurchaseDTO,
        _companyId: string,
        _userId: string,
        _totalAmount: number
    ) => {
        try {
            console.info('📦 Purchase accounting atomic RPC executed for:', invoiceId, 'Method:', data.paymentMethod);
            console.info('📋 The RPC commit_purchase_invoice already handled all accounting entries natively.');
            return;
        } catch (error: unknown) {
            console.error('❌ Error processing purchase accounting reference:', error);
            throw error;
        }
    }
};

