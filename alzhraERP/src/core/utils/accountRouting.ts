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
            console.info(
                `Smart Routing: Redirected from parent ${selectedAccount.id} (${selectedAccount.name}) ` +
                `to child ${matchedChild.id} (${matchedChild.name}) matching currency ${currency}`
            );
            return matchedChild;
        }
    }

    return selectedAccount;
};
