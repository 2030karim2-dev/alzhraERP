import { AIParsedResponse } from './aiActions';
import { salesService } from '../sales/service';
import { purchasesService } from '../purchases/service';
import { expensesService } from '../expenses/service';
import { bondsService } from '../bonds/service';
import { CreateInvoiceDTO } from '../sales/types';
import { CreatePurchaseDTO } from '../purchases/types';
import { ExpenseFormData } from '../expenses/types';
import { BondFormData } from '../bonds/types';

/**
 * Maps the parsed AI intent and entities to the actual ERP service calls.
 */
export async function executeParsedAction(
    action: AIParsedResponse,
    companyId: string,
    userId: string
): Promise<boolean> {
    if (!action.entities) return false;

    const { intent, entities } = action;

    try {
        switch (intent) {
            case 'create_sales_invoice': {
                const payload: CreateInvoiceDTO = {
                    partyId: null,
                    type: 'sale',
                    dueDate: entities.date || new Date().toISOString().split('T')[0],
                    currency: 'SAR',
                    paymentMethod: (entities.paymentMethod === 'bank' ? 'credit' : (entities.paymentMethod as 'cash'|'credit' || 'cash')),
                    status: 'paid',
                    discount: 0,
                    items: (entities.items || []).map(item => ({
                        productId: item.productCode || 'unknown',
                        quantity: item.quantity || 1,
                        unitPrice: item.unitPrice || 0,
                        name: item.productName || 'منتج عام',
                        sku: item.productCode || '',
                        costPrice: 0,
                        maxStock: 9999
                    })),
                };
                await salesService.processNewSale(companyId, userId, payload);
                return true;
            }

            case 'create_return_sale': {
                const payload: CreateInvoiceDTO = {
                    partyId: null,
                    type: 'return_sale',
                    dueDate: entities.date || new Date().toISOString().split('T')[0],
                    currency: 'SAR',
                    paymentMethod: (entities.paymentMethod === 'bank' ? 'credit' : (entities.paymentMethod as 'cash'|'credit' || 'cash')),
                    status: 'paid',
                    discount: 0,
                    items: (entities.items || []).map(item => ({
                        productId: item.productCode || 'unknown',
                        quantity: item.quantity || 1,
                        unitPrice: item.unitPrice || 0,
                        name: item.productName || 'منتج عام',
                        sku: item.productCode || '',
                        costPrice: 0,
                        maxStock: 9999
                    })),
                };
                await salesService.processNewSale(companyId, userId, payload);
                return true;
            }

            case 'create_purchase_invoice': {
                const payload: CreatePurchaseDTO = {
                    supplierId: null,
                    invoiceNumber: 'AI-' + Date.now(),
                    type: 'purchase',
                    issueDate: entities.date || new Date().toISOString().split('T')[0],
                    dueDate: entities.date || new Date().toISOString().split('T')[0],
                    currency: 'SAR',
                    paymentMethod: (entities.paymentMethod === 'bank' ? 'credit' : (entities.paymentMethod as 'cash'|'credit' || 'cash')),
                    status: 'posted',
                    items: (entities.items || []).map(item => ({
                        productId: item.productCode || 'unknown',
                        quantity: item.quantity || 1,
                        costPrice: item.unitPrice || 0,
                        name: item.productName || 'منتج عام',
                        sku: item.productCode || '',
                        partNumber: item.productCode || '',
                        brand: item.manufacturer || '',
                        total: (item.quantity || 1) * (item.unitPrice || 0)
                    })) as CreatePurchaseDTO['items'],
                } as CreatePurchaseDTO;
                await purchasesService.processPurchase(payload, companyId, userId);
                return true;
            }

            case 'create_return_purchase': {
                const payload: CreatePurchaseDTO = {
                    supplierId: null,
                    invoiceNumber: 'AI-RET-' + Date.now(),
                    type: 'return_purchase',
                    issueDate: entities.date || new Date().toISOString().split('T')[0],
                    dueDate: entities.date || new Date().toISOString().split('T')[0],
                    currency: 'SAR',
                    paymentMethod: (entities.paymentMethod === 'bank' ? 'credit' : (entities.paymentMethod as 'cash'|'credit' || 'cash')),
                    status: 'posted',
                    items: (entities.items || []).map(item => ({
                        productId: item.productCode || 'unknown',
                        quantity: item.quantity || 1,
                        costPrice: item.unitPrice || 0,
                        name: item.productName || 'منتج عام',
                        sku: item.productCode || '',
                        partNumber: item.productCode || '',
                        brand: item.manufacturer || '',
                        total: (item.quantity || 1) * (item.unitPrice || 0)
                    })) as CreatePurchaseDTO['items'],
                } as CreatePurchaseDTO;
                await purchasesService.processPurchaseReturn(payload, companyId, userId);
                return true;
            }

            case 'create_expense': {
                const payload = {
                    company_id: companyId,
                    amount: entities.amount || 0,
                    currency_code: 'SAR',
                    exchange_rate: 1,
                    payment_method: entities.paymentMethod || 'cash',
                    status: 'paid',
                    description: entities.description || '',
                    expense_date: entities.date || new Date().toISOString().split('T')[0],
                    category_id: 'unknown' // Requires looking up category ID
                } as unknown as ExpenseFormData;
                await expensesService.processNewExpense(payload, companyId, userId);
                return true;
            }

            case 'create_bond_receipt': {
                const payload: BondFormData = {
                    type: 'receipt',
                    amount: entities.amount || 0,
                    currency_code: 'SAR',
                    exchange_rate: 1,
                    payment_method: (entities.paymentMethod === 'credit' ? 'cash' : (entities.paymentMethod || 'cash')),
                    date: entities.date || new Date().toISOString().split('T')[0],
                    description: entities.description || '',
                    cash_account_id: 'unknown',
                    counterparty_type: 'party',
                    counterparty_id: 'unknown'
                };
                await bondsService.createBond(companyId, userId, payload);
                return true;
            }

            case 'create_bond_payment': {
                const payload: BondFormData = {
                    type: 'payment',
                    amount: entities.amount || 0,
                    currency_code: 'SAR',
                    exchange_rate: 1,
                    payment_method: (entities.paymentMethod === 'credit' ? 'cash' : (entities.paymentMethod || 'cash')),
                    date: entities.date || new Date().toISOString().split('T')[0],
                    description: entities.description || '',
                    cash_account_id: 'unknown',
                    counterparty_type: 'party',
                    counterparty_id: 'unknown'
                };
                await bondsService.createBond(companyId, userId, payload);
                return true;
            }

            // Other intents will be implemented later
            default:
                console.warn(`Unimplemented AI action: ${intent}`);
                return false;
        }
    } catch (error) {
        console.error('Error executing AI action', error);
        throw error;
    }
}
