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

/** Type-only cast helper — runtime-identical to `as any`, but grep-able and explicit. */
const cast = <T>(value: unknown): T => value as T;

export const processSyncMutation = async (
    mutationKey: readonly unknown[],
    variables: unknown,
    metadata?: unknown
) => {
    const [feature, action] = mutationKey;
    const vars = (variables ?? {}) as Record<string, unknown>;
    const meta = (metadata ?? {}) as { last_updated_at?: string };

    // Inventory Sync
    if (feature === 'products' && action === 'save') {
        const { id, company_id, user_id, ...data } = vars;

        if (id) {
            // Conflict Detection: Fetch current state
            const { data: current } = await inventoryApi.getProductById(id as string);
            if (current && meta.last_updated_at) {
                const serverTime = new Date(current.updated_at).getTime();
                const clientTime = new Date(meta.last_updated_at).getTime();

                if (serverTime > clientTime) {
                    throw new Error(`CONFLICT: تم تعديل هذا المنتج في المتجر من جهاز آخر. (خادم: ${current.updated_at}, محلي: ${meta.last_updated_at})`);
                }
            }
            return inventoryService.updateProduct(id as string, cast<Parameters<typeof inventoryService.updateProduct>[1]>(data), company_id as string);
        }
        return inventoryService.createProduct(cast<Parameters<typeof inventoryService.createProduct>[0]>(data), company_id as string, user_id as string);
    }

    if (feature === 'inventory' && action === 'transfer') {
        return inventoryService.createTransfer(cast<Parameters<typeof inventoryService.createTransfer>[0]>(vars));
    }

    if (feature === 'inventory' && action === 'start_audit') {
        const { company_id, user_id, ...data } = vars;
        return inventoryService.startAudit(cast<Parameters<typeof inventoryService.startAudit>[0]>(data), company_id as string, user_id as string);
    }

    if (feature === 'inventory' && action === 'save_audit_progress') {
        const { items } = vars;
        return inventoryService.saveAuditProgress(cast<Parameters<typeof inventoryService.saveAuditProgress>[0]>(items));
    }

    // Parties Sync
    if (feature === 'parties' && action === 'save') {
        const { company_id, id, ...data } = vars;
        return partiesService.saveParty(company_id as string, cast<Parameters<typeof partiesService.saveParty>[1]>(data), cast<Parameters<typeof partiesService.saveParty>[2]>(id));
    }

    if (feature === 'parties' && action === 'save_category') {
        const { company_id, name, type, id } = vars;
        return partiesService.saveCategory(company_id as string, { name: name as string, type: type as string }, cast<Parameters<typeof partiesService.saveCategory>[2]>(id));
    }

    // Sales Sync
    if (feature === 'sales' && action === 'create') {
        const { company_id, user_id, ...data } = vars;
        return salesService.processNewSale(company_id as string, user_id as string, cast<Parameters<typeof salesService.processNewSale>[2]>(data));
    }

    // Expenses Sync
    if (feature === 'expenses' && action === 'create') {
        const { company_id, user_id, ...data } = vars;
        return expensesService.processNewExpense(cast<Parameters<typeof expensesService.processNewExpense>[0]>(data), company_id as string, user_id as string);
    }

    // Purchases Sync
    if (feature === 'purchases' && action === 'create') {
        const { company_id, user_id, ...data } = vars;
        return purchasesService.processPurchase(cast<Parameters<typeof purchasesService.processPurchase>[0]>(data), company_id as string, user_id as string);
    }

    if (feature === 'purchases' && action === 'payment') {
        const { company_id, user_id, ...data } = vars;
        return purchasesApi.createSupplierPayment(cast<Parameters<typeof purchasesApi.createSupplierPayment>[0]>(data), company_id as string, user_id as string);
    }

    // Accounting Sync
    if (feature === 'accounting' && action === 'create_account') {
        const { company_id, ...data } = vars;
        return accountsService.createAccount(cast<Parameters<typeof accountsService.createAccount>[0]>(data), company_id as string);
    }

    // Add more handlers as needed
    throw new Error(`No sync handler found for mutation key: ${mutationKey.join(':')}`);
};
