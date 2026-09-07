import React, { useMemo } from 'react';
import { useLedger, useAccounts } from '../../hooks';
import { formatCurrency } from '../../../../core/utils';
import { getLedgerBalanceLabel } from '../../utils/ledgerBalance';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import StatCard from '../../../../ui/common/StatCard';

interface Props {
  accountId: string;
  dateRange: { from: string; to: string };
}

const TreasurySummaryStats: React.FC<Props> = ({ accountId, dateRange }) => {
  const { data: accounts } = useAccounts();
  const { data: ledger, isLoading } = useLedger(accountId, dateRange.from, dateRange.to);

  const account = useMemo(() => accounts?.find(a => a.id === accountId), [accounts, accountId]);
  const currencyCode =
    account?.currency_code ||
    (ledger && ledger.length > 0 ? ledger[ledger.length - 1].currency_code : undefined);

  const stats = useMemo(() => {
    if (!ledger) return { balance: 0, totalDebit: 0, totalCredit: 0 };

    const totalDebit = ledger.reduce((sum, item) => sum + item.debit_amount, 0); // Inflow
    const totalCredit = ledger.reduce((sum, item) => sum + item.credit_amount, 0); // Outflow

    // Balance depends on account type, but for assets (Treasury), Dr is positive
    // However, the ledger usually returns a running balance.
    // Let's calculate net movement for the period + opening balance if we had it.
    // For now, let's use the final balance from the last entry if available, or calc net.
    const lastEntry = ledger[ledger.length - 1];
    const currentBalance = lastEntry ? lastEntry.balance : 0;

    return { balance: currentBalance, totalDebit, totalCredit };
  }, [ledger]);

  if (isLoading) {
    return (
      <div className="mb-6 grid grid-cols-1 gap-4 max-md:mb-3 max-md:gap-3 md:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="h-24 animate-pulse border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm"
          />
        ))}
      </div>
    );
  }

  // Determine sign by account nature (ledger RPC returns sign-normalised balances)
  const lastLedgerRow = ledger && ledger.length > 0 ? ledger[ledger.length - 1] : undefined;
  const { isCredit: isCreditBalance } = getLedgerBalanceLabel(
    stats.balance,
    lastLedgerRow?.accountType
  );

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 max-md:mb-3 max-md:gap-3 md:grid-cols-3">
      <StatCard
        title="الرصيد الحالي"
        value={formatCurrency(Math.abs(stats.balance), currencyCode)}
        subtext={isCreditBalance ? 'رصيد دائن (مكشوف)' : 'رصيد مدين (متوفر)'}
        icon={Wallet}
        colorClass="text-blue-600"
        iconBgClass="bg-blue-100 dark:bg-blue-900/30"
      />
      <StatCard
        title="إجمالي المقبوضات"
        value={formatCurrency(stats.totalDebit, currencyCode)}
        subtext="حركات الإيداع والقبض"
        icon={TrendingUp}
        colorClass="text-emerald-600"
        iconBgClass="bg-emerald-100 dark:bg-emerald-900/30"
      />
      <StatCard
        title="إجمالي المدفوعات"
        value={formatCurrency(stats.totalCredit, currencyCode)}
        subtext="حركات الصرف والتحويل"
        icon={TrendingDown}
        colorClass="text-red-600"
        iconBgClass="bg-red-100 dark:bg-red-900/30"
      />
    </div>
  );
};

export default TreasurySummaryStats;
