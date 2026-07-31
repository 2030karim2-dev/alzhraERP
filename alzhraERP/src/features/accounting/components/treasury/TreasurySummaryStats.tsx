import React, { useMemo } from 'react';
import { useLedger } from '../../hooks';
import { formatCurrency } from '../../../../core/utils';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import StatCard from '../../../../ui/common/StatCard';

interface Props {
    accountId: string;
    dateRange: { from: string; to: string };
}

const TreasurySummaryStats: React.FC<Props> = ({ accountId, dateRange }) => {
    const { data: ledger, isLoading } = useLedger(accountId, dateRange.from, dateRange.to);

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-slate-800 animate-pulse rounded-lg"></div>)}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard
                title="الرصيد الحالي"
                value={formatCurrency(Math.abs(stats.balance))}
                subtext={stats.balance >= 0 ? "رصيد مدين (متوفر)" : "رصيد دائن (مكشوف)"}
                icon={Wallet}
                colorClass="text-blue-600"
                iconBgClass="bg-blue-100 dark:bg-blue-900/30"
            />
            <StatCard
                title="إجمالي المقبوضات"
                value={formatCurrency(stats.totalDebit)}
                subtext="حركات الإيداع والقبض"
                icon={TrendingUp}
                colorClass="text-emerald-600"
                iconBgClass="bg-emerald-100 dark:bg-emerald-900/30"
            />
            <StatCard
                title="إجمالي المدفوعات"
                value={formatCurrency(stats.totalCredit)}
                subtext="حركات الصرف والتحويل"
                icon={TrendingDown}
                colorClass="text-red-600"
                iconBgClass="bg-red-100 dark:bg-red-900/30"
            />
        </div>
    );
};

export default TreasurySummaryStats;
