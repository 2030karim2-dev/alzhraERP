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

    let totalDebit = 0;
    let totalCredit = 0;

    for (const item of ledger) {
      // Ignore virtual opening balance line in inflow/outflow gross sums
      if (item.entry_number === 0) continue;

      const desc = item.description || '';
      const ref = item.reference_type || '';

      const isOutflowReversal =
        ref === 'expense_void' ||
        ref === 'payment_bond_void' ||
        ref === 'payment_void' ||
        desc.startsWith('عكس مصروف') ||
        desc.startsWith('عكس: صرف') ||
        desc.includes('عكس سند صرف') ||
        desc.includes('عكس سند: صرف');

      const isInflowReversal =
        ref === 'receipt_bond_void' ||
        ref === 'receipt_void' ||
        ref === 'sales_return' ||
        desc.startsWith('عكس سند قبض') ||
        desc.startsWith('عكس: قبض') ||
        desc.includes('عكس سند: قبض') ||
        desc.includes('عكس مبيعات');

      if (isOutflowReversal) {
        // Red Storno: Inverting an outflow (credit) puts amount in debit.
        // Under Storno netting, it reduces gross outflows rather than inflating receipts.
        totalCredit -= item.debit_amount;
      } else if (isInflowReversal) {
        // Red Storno: Inverting an inflow (debit) puts amount in credit.
        // Under Storno netting, it reduces gross inflows rather than inflating payments.
        totalDebit -= item.credit_amount;
      } else {
        totalDebit += item.debit_amount;
        totalCredit += item.credit_amount;
      }
    }

    const lastEntry = ledger[ledger.length - 1];
    const currentBalance = lastEntry ? lastEntry.balance : 0;

    return {
      balance: currentBalance,
      totalDebit: Math.max(0, totalDebit),
      totalCredit: Math.max(0, totalCredit),
    };
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
