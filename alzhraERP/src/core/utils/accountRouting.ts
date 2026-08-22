import { logger } from '../../core/utils/logger';
/**
 * Smart Account Routing Utilities
 * M1: Extracted shared logic from sales/service.ts and purchases/purchaseAccounting.ts
 * 
 * Routes payments to the correct child account based on the transaction currency.
 * For example, if USD is the transaction currency and the selected parent account (1010)
 * has a child account tagged with currency_code='USD', the payment routes there.
 */

export interface RoutableAccount {
    id: string;
    code: string;
    name: string;
    type: string;
    currency_code?: string;
    parent_id?: string | null;
    is_system?: boolean;
    balance?: number;
}

/**
 * Find the correct child account matching the requested currency.
 * If the selected account has children and one matches the currency, use it.
 * Otherwise, falls back to the selected account itself.
 * 
 * @param accounts - Full list of accounts
 * @param parentAccountId - The account ID selected by the user
 * @param currency - The currency of the transaction
 * @returns The routed account (either child or the parent itself)
 */
export const routeToChildByCurrency = (
    accounts: RoutableAccount[],
    parentAccountId: string,
    currency?: string
): RoutableAccount | undefined => {
    const selectedAccount = accounts.find(a => a.id === parentAccountId);
    if (!selectedAccount) return undefined;

    if (!currency) return selectedAccount;

    // Check if selected account has children
    const childAccounts = accounts.filter(a => a.parent_id === selectedAccount.id);

    if (childAccounts.length > 0) {
        // Find child matching the currency
        const matchedChild = childAccounts.find(
            a => (a.currency_code || 'SAR') === currency
        );

        if (matchedChild) {
            logger.info("accountRouting", `Smart Routing: Redirected from parent ${selectedAccount.id} (${selectedAccount.name}) ` +
                `to child ${matchedChild.id} (${matchedChild.name}) matching currency ${currency}`);
            return matchedChild;
        }
    }

    return selectedAccount;
};

/**
 * Strict Multi-Currency Payment Account Resolver:
 * - Credit (آجل): strictly returns undefined (routes to AR 1100 or AP 2100).
 * - Cash (نقداً): strictly routes to the cash/bank account matching currency (SAR -> صندوق الريال السعودي, YER -> صندوق الريال اليمني).
 */
export const resolveStrictPaymentAccount = (
    accounts: RoutableAccount[],
    paymentMethod: string | undefined | null,
    currency: string = 'SAR',
    preferredAccountId?: string | null
): string | undefined => {
    // 1. Credit transactions NEVER have a treasury account (they strictly debit/credit Accounts Receivable 1100 / Payable 2100)
    if (paymentMethod === 'credit') {
        return undefined;
    }

    // 2. If preferredAccountId is specified, attempt child routing by currency
    if (preferredAccountId) {
        const routed = routeToChildByCurrency(accounts, preferredAccountId, currency);
        if (routed && (routed.currency_code === currency || !routed.currency_code)) {
            return routed.id;
        }
    }

    // 3. Find cash & bank accounts (Asset accounts)
    const cashAccounts = accounts.filter(a =>
        a.type === 'asset' &&
        (a.code?.startsWith('101') || a.code?.startsWith('102') || a.code === '1000' || a.name?.includes('صندوق') || a.name?.includes('بنك'))
    );

    // 3a. Exact match by currency_code
    const exactMatch = cashAccounts.find(a => a.currency_code === currency);
    if (exactMatch) {
        logger.info("accountRouting", `Strict Currency Match: Routed to ${exactMatch.name} (${exactMatch.code}) for currency ${currency}`);
        return exactMatch.id;
    }

    // 3b. Match by name keyword if currency_code isn't populated on the account row
    if (currency === 'YER') {
        const yerAccount = cashAccounts.find(a =>
            a.name?.includes('يمن') || a.name?.includes('YER') || a.name?.includes('ريال يمني')
        );
        if (yerAccount) {
            logger.info("accountRouting", `Strict Keyword Match: Routed to ${yerAccount.name} (${yerAccount.code}) for currency YER`);
            return yerAccount.id;
        }
    } else if (currency === 'SAR') {
        const sarAccount = cashAccounts.find(a =>
            a.name?.includes('سعود') || a.name?.includes('SAR') || a.name?.includes('رئيسي') || a.currency_code === 'SAR'
        );
        if (sarAccount) {
            logger.info("accountRouting", `Strict Keyword Match: Routed to ${sarAccount.name} (${sarAccount.code}) for currency SAR`);
            return sarAccount.id;
        }
    }

    // 4. Default cash account fallback
    return preferredAccountId || cashAccounts[0]?.id;
};
