import { inventoryService } from '../../features/inventory/service';
import { salesService } from '../../features/sales/service';
import { expensesService } from '../../features/expenses/service';
import { purchasesService, purchasesApi } from '../../features/purchases/service';
import { accountsService } from '../../features/accounting/services/accountsService';
import { inventoryApi } from '../../features/inventory/api';
import { partiesService } from '../../features/parties/service';

/**
 * Resolver for background sync mutations.
 * Maps mutation keys to their respective service calls.
 */
export const processSyncMutation = async (mutationKey: any[], variables: any, metadata?: any) => {
    const [feature, action] = mutationKey;

    // Inventory Sync
    if (feature === 'products' && action === 'save') {
        const { id, company_id, user_id, ...data } = variables;

        if (id) {
            // Conflict Detection: Fetch current state
            const { data: current } = await inventoryApi.getProductById(id);
            if (current && metadata?.last_updated_at) {
                const serverTime = new Date(current.updated_at).getTime();
                const clientTime = new Date(metadata.last_updated_at).getTime();

                if (serverTime > clientTime) {
                    throw new Error(`CONFLICT: تم تعديل هذا المنتج في المتجر من جهاز آخر. (خادم: ${current.updated_at}, محلي: ${metadata.last_updated_at})`);
                }
            }
            return inventoryService.updateProduct(id, data as any, company_id);
        }
        return inventoryService.createProduct(data as any, company_id, user_id);
    }

    if (feature === 'inventory' && action === 'transfer') {
        return inventoryService.createTransfer(variables);
    }

    if (feature === 'inventory' && action === 'start_audit') {
        const { company_id, user_id, ...data } = variables;
        return inventoryService.startAudit(data, company_id, user_id);
    }

    if (feature === 'inventory' && action === 'save_audit_progress') {
        const { items } = variables;
        return inventoryService.saveAuditProgress(items);
    }

    // Parties Sync
    if (feature === 'parties' && action === 'save') {
        const { company_id, id, ...data } = variables;
        return partiesService.saveParty(company_id, data, id);
    }

    if (feature === 'parties' && action === 'save_category') {
        const { company_id, name, type, id } = variables;
        return partiesService.saveCategory(company_id, { name, type }, id);
    }

    // Sales Sync
    if (feature === 'sales' && action === 'create') {
        const { company_id, user_id, ...data } = variables;
        return salesService.processNewSale(company_id, user_id, data);
    }

    // Expenses Sync
    if (feature === 'expenses' && action === 'create') {
        const { company_id, user_id, ...data } = variables;
        return expensesService.processNewExpense(data, company_id, user_id);
    }

    // Purchases Sync
    if (feature === 'purchases' && action === 'create') {
        const { company_id, user_id, ...data } = variables;
        return purchasesService.processPurchase(data, company_id, user_id);
    }

    if (feature === 'purchases' && action === 'payment') {
        const { company_id, user_id, ...data } = variables;
        return purchasesApi.createSupplierPayment(data, company_id, user_id);
    }

    // Accounting Sync
    if (feature === 'accounting' && action === 'create_account') {
        const { company_id, ...data } = variables;
        return accountsService.createAccount(data, company_id);
    }

    // Add more handlers as needed
    throw new Error(`No sync handler found for mutation key: ${mutationKey.join(':')}`);
};
