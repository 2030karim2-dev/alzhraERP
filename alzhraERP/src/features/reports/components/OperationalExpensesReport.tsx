import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store';
import { reportsApi } from '../api';
import { formatCurrency, cn } from '../../../core/utils';
import { Wallet, TrendingDown, PieChart as PieIcon, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import StatCard from '../../../ui/common/StatCard';
import ExcelTable from '../../../ui/common/ExcelTable';
import ShareButton from '../../../ui/common/ShareButton';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#14b8a6'];

const useOperationalExpenses = (days: number = 30) => {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['operational_expenses', user?.company_id, days],
        queryFn: async () => {
            if (!user?.company_id) return null;

            const fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - days);

            // Get all expense journal lines with their accounts
            const { data: lines, error } = await reportsApi.getOperationalExpensesLines(user.company_id, fromDate.toISOString().split('T')[0]);

            if (error) throw error;

            // Group by account
            const accountMap: Record<string, { name: string; code: string; total: number; count: number }> = {};
            (lines || []).forEach((line: any) => {
                const accountId = line.account?.id;
                const accountName = line.account?.name_ar || 'غير محدد';
                const accountCode = line.account?.code || '';

                if (!accountMap[accountId]) {
                    accountMap[accountId] = { name: accountName, code: accountCode, total: 0, count: 0 };
                }
                accountMap[accountId].total += Number(line.debit_amount || 0) - Number(line.credit_amount || 0);
                accountMap[accountId].count += 1;
            });

            const expensesByAccount = Object.entries(accountMap)
                .map(([id, data]) => ({ id, ...data }))
                .filter(a => a.total > 0)
                .sort((a, b) => b.total - a.total);

            const totalExpenses = expensesByAccount.reduce((s, a) => s + a.total, 0);

            // Pie chart data
            const chartData = expensesByAccount.slice(0, 8).map((a, i) => ({
                name: a.name,
                value: Math.abs(a.total),
                fill: COLORS[i % COLORS.length],
            }));

            // If there are more than 8, group the rest as "أخرى"
            if (expensesByAccount.length > 8) {
                const otherTotal = expensesByAccount.slice(8).reduce((s, a) => s + a.total, 0);
                chartData.push({ name: 'أخرى', value: Math.abs(otherTotal), fill: '#94a3b8' });
            }

            return {
                expensesByAccount,
                totalExpenses,
                chartData,
                transactionCount: (lines || []).length,
            };
        },
        enabled: !!user?.company_id,
    });
};

const OperationalExpensesReport: React.FC = () => {
    const [days, setDays] = useState(30);
    const [showAll, setShowAll] = useState(false);
    const { data, isLoading } = useOperationalExpenses(days);

    const columns = useMemo(() => [
        {
            header: 'كود الحساب',
            accessor: (row: any) => <span className="font-mono text-[9px] text-gray-400">{row.code}</span>,
            width: '80px',
        },
        {
            header: 'اسم المصروف',
            accessor: (row: any) => <span className="font-bold text-gray-800 dark:text-slate-100 text-[10px]">{row.name}</span>,
        },
        {
            header: 'عدد الحركات',
            accessor: (row: any) => <span className="text-[10px] text-gray-500">{row.count}</span>,
            width: '80px',
            align: 'center' as const,
        },
        {
            header: 'الإجمالي',
            accessor: (row: any) => (
                <span dir="ltr" className="font-bold font-mono text-[10px] text-rose-700 dark:text-rose-400">
                    {formatCurrency(Math.abs(row.total))}
                </span>
            ),
            width: '120px',
            align: 'center' as const,
        },
        {
            header: 'النسبة',
            accessor: (row: any) => {
                const pct = data?.totalExpenses ? ((Math.abs(row.total) / data.totalExpenses) * 100) : 0;
                return (
                    <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 dark:bg-slate-800 rounded-full h-1.5">
                            <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-[9px] font-bold text-gray-500 w-10 text-left">{pct.toFixed(1)}%</span>
                    </div>
                );
            },
            width: '130px',
        },
    ], [data?.totalExpenses]);

    if (isLoading) return <div className="p-20 text-center animate-pulse">جاري تحليل المصروفات التشغيلية...</div>;

    const displayExpenses = showAll ? data?.expensesByAccount : data?.expensesByAccount.slice(0, 10);

    return (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header */}
            <div className="flex items-center gap-2 justify-between">
                <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                    <Wallet size={16} className="text-rose-600" /> تقرير المصاريف التشغيلية
                </h3>
                <div className="flex gap-1">
                    {[7, 14, 30, 90].map(d => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={cn(
                                "px-3 py-1 rounded-lg text-[10px] font-bold transition-colors",
                                days === d
                                    ? "bg-rose-600 text-white"
                                    : "bg-gray-100 dark:bg-slate-800 text-gray-500 hover:bg-gray-200"
                            )}
                        >
                            {d} يوم
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <StatCard title={`إجمالي المصروفات (${days} يوم)`} value={formatCurrency(data?.totalExpenses || 0)} icon={TrendingDown} colorClass="text-rose-500" iconBgClass="bg-rose-500" />
                <StatCard title="عدد الحركات" value={String(data?.transactionCount || 0)} icon={Calendar} colorClass="text-amber-500" iconBgClass="bg-amber-500" />
                <StatCard title="عدد أنواع المصروفات" value={String(data?.expensesByAccount.length || 0)} icon={PieIcon} colorClass="text-indigo-500" iconBgClass="bg-indigo-500" />
            </div>

            {/* Chart + Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Pie Chart */}
                {(data?.chartData.length || 0) > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-800 p-4 shadow-sm">
                        <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-3">توزيع المصروفات</h4>
                        <div style={{ width: '100%', height: 250 }}>
                            <ResponsiveContainer width="100%" height={250} minWidth={1} minHeight={250}>
                                <PieChart>
                                    <Pie
                                        data={data?.chartData || []}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        dataKey="value"
                                        paddingAngle={2}
                                    >
                                        {data?.chartData.map((entry, i) => (
                                            <Cell key={i} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: any) => formatCurrency(value || 0)} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                                    <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-3 border-b dark:border-slate-800 flex justify-between items-center bg-rose-50/50 dark:bg-rose-950/20">
                        <h4 className="font-bold text-[9px] text-rose-600 uppercase flex items-center gap-2">
                            <Wallet size={12} /> تفصيل المصروفات ({data?.expensesByAccount.length || 0})
                        </h4>
                        <ShareButton
                            size="sm"
                            eventType="expenses_report"
                            title="مشاركة تقرير المصاريف"
                            message={`💰 تقرير المصاريف التشغيلية\n━━━━━━━━━━━━━━\n📊 إجمالي المصروفات (${days} يوم): ${formatCurrency(data?.totalExpenses || 0)}\n📋 عدد الأنواع: ${data?.expensesByAccount.length || 0}\n\n أعلى المصروفات:\n${(data?.expensesByAccount.slice(0, 5) || []).map((e, i) => `${i + 1}. ${e.name}: ${formatCurrency(Math.abs(e.total))}`).join('\n')}`}
                        />
                    </div>
                    <div className="p-1">
                        <ExcelTable columns={columns} data={displayExpenses || []} colorTheme="orange" isRTL />
                    </div>
                    {(data?.expensesByAccount.length || 0) > 10 && (
                        <button
                            onClick={() => setShowAll(!showAll)}
                            className="w-full p-2 text-center text-[10px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center gap-1 border-t dark:border-slate-800"
                        >
                            {showAll ? <><ChevronUp size={12} /> إخفاء</> : <><ChevronDown size={12} /> عرض الكل ({data?.expensesByAccount.length})</>}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OperationalExpensesReport;
