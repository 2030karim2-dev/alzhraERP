
export interface LedgerBalanceLabel {
  label: 'مدين' | 'دائن';
  isCredit: boolean;
}

export const isDebitNormalAccount = (accountType?: string): boolean =>
  accountType !== 'liability' && accountType !== 'equity' && accountType !== 'revenue';

/**
 * `get_account_ledger` returns a sign-normalised running balance:
 *   asset/expense  → positive = debit (مدين), negative = credit (دائن)
 *   liability/equity/revenue → positive = credit (دائن), negative = debit (مدين)
 * When the account type is unknown (legacy data) we fall back to debit-normal
 * (the pre-fix behaviour) so existing views stay safe.
 */
export const getLedgerBalanceLabel = (balance: number, accountType?: string): LedgerBalanceLabel => {
  const isCredit = isDebitNormalAccount(accountType) ? balance < 0 : balance > 0;
  return { label: isCredit ? 'دائن' : 'مدين', isCredit };
};
