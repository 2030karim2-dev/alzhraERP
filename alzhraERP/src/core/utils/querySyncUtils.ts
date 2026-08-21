import { QueryClient } from '@tanstack/react-query';
import { logger } from './logger';

export interface FinancialSyncOptions {
  /** Invalidate accounts and treasury balances (default: true) */
  accounts?: boolean;
  /** Invalidate party balances and statement views (default: true) */
  parties?: boolean;
  /** Invalidate debt aging and follow-up tracking (default: true) */
  debts?: boolean;
  /** Invalidate journal entries and ledger logs (default: true) */
  journals?: boolean;
  /** Invalidate sales invoices and statistics (default: false) */
  sales?: boolean;
  /** Invalidate bonds log and balance summaries (default: false) */
  bonds?: boolean;
}

/**
 * ⚡ Centralized Cross-Module Financial Query Invalidator.
 *
 * Ensures that when a financial transaction occurs (sale, purchase, bond, journal entry, return),
 * all related cached queries across features are invalidated atomically in TanStack Query.
 */
export const invalidateFinancialQueries = async (
  queryClient: QueryClient,
  companyId?: string | null,
  options: FinancialSyncOptions = {
    accounts: true,
    parties: true,
    debts: true,
    journals: true,
  }
): Promise<void> => {
  if (!companyId) {
    logger.warn('QuerySync', 'Skipping financial query invalidation — companyId is missing');
    return;
  }

  const invalidations: Promise<void>[] = [];

  // 1. Chart of Accounts & Treasury balances
  if (options.accounts ?? true) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ['accounts', companyId] }),
      queryClient.invalidateQueries({ queryKey: ['account_balances', companyId] })
    );
  }

  // 2. Parties (Customers & Suppliers) balances & statements
  if (options.parties ?? true) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ['parties', companyId] }),
      queryClient.invalidateQueries({ queryKey: ['party_statement_v3'] }),
      queryClient.invalidateQueries({ queryKey: ['party_categories', companyId] })
    );
  }

  // 3. Debts tracking & Aging reports
  if (options.debts ?? true) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ['debts', companyId] }),
      queryClient.invalidateQueries({ queryKey: ['debt-stats', companyId] }),
      queryClient.invalidateQueries({ queryKey: ['debt-customers', companyId] }),
      queryClient.invalidateQueries({ queryKey: ['overdue_debts', companyId] })
    );
  }

  // 4. Journals & General Ledger
  if (options.journals ?? true) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ['journals', companyId] }),
      queryClient.invalidateQueries({ queryKey: ['general_ledger', companyId] })
    );
  }

  // 5. Sales & Invoices
  if (options.sales) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ['sales', companyId] }),
      queryClient.invalidateQueries({ queryKey: ['sales_stats', companyId] })
    );
  }

  // 6. Bonds
  if (options.bonds) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ['bonds', companyId] }),
      queryClient.invalidateQueries({ queryKey: ['bond_stats', companyId] })
    );
  }

  try {
    await Promise.all(invalidations);
    logger.info('QuerySync', 'Financial queries invalidated successfully', { companyId, options });
  } catch (error) {
    logger.error('QuerySync', 'Error invalidating financial queries', { error, companyId });
  }
};
