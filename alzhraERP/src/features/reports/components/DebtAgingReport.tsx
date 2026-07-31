import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store';
import { reportsApi } from '../api';
import { formatCurrency } from '../../../core/utils';
import { Clock, AlertTriangle, Users, ShieldCheck } from 'lucide-react';
import StatCard from '../../../ui/common/StatCard';
import ExcelTable from '../../../ui/common/ExcelTable';
import ShareButton from '../../../ui/common/ShareButton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const AGING_COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444'];
const AGING_LABELS = ['حالية (0-30)', 'متأخرة (31-60)', 'متأخرة (61-90)', 'حرجة (90+)'];

const useDebtAging = () => {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['debt_aging', user?.company_id],
        queryFn: async () => {
            if (!user?.company_id) return null;

            // Get unpaid/partial invoices with party info
            const { data: invoices, error } = await reportsApi.getDebtAgingInvoices(user.company_id);

            if (error) throw error;

            const today = new Date();
            const agingBuckets = { current: 0, days30: 0, days60: 0, days90: 0 };
            const partyAging: Record<string, {
                id: string; name: string; type: string;
                current: number; days30: number; days60: number; days90: number;
                total: number; oldestDate: string;
            }> = {};

            (invoices || []).forEach((inv: any) => {
                const issueDate = new Date(inv.issue_date);
                const daysDiff = Math.floor((today.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24));
                const remaining = Number(inv.total_amount || 0) - Number(inv.paid_amount || 0);

                if (remaining <= 0) return;

                const partyId = inv.party_id;
                const partyName = (inv.parties as any)?.name || 'غير محدد';
                const partyType = (inv.parties as any)?.type || 'customer';

                if (!partyAging[partyId]) {
                    partyAging[partyId] = { id: partyId, name: partyName, type: partyType, current: 0, days30: 0, days60: 0, days90: 0, total: 0, oldestDate: inv.issue_date };
                }

                if (daysDiff <= 30) {
                    agingBuckets.current += remaining;
                    partyAging[partyId].current += remaining;
                } else if (daysDiff <= 60) {
                    agingBuckets.days30 += remaining;
                    partyAging[partyId].days30 += remaining;
                } else if (daysDiff <= 90) {
                    agingBuckets.days60 += remaining;
                    partyAging[partyId].days60 += remaining;
                } else {
                    agingBuckets.days90 += remaining;
                    partyAging[partyId].days90 += remaining;
                }

                partyAging[partyId].total += remaining;
                if (inv.issue_date < partyAging[partyId].oldestDate) {
                    partyAging[partyId].oldestDate = inv.issue_date;
                }
            });

            const partiesList = Object.values(partyAging).sort((a, b) => b.total - a.total);
            const totalOutstanding = partiesList.reduce((s, p) => s + p.total, 0);
            const criticalCount = partiesList.filter(p => p.days90 > 0).length;

            const chartData = [
                { name: AGING_LABELS[0], value: Math.max(0, agingBuckets.current) },
                { name: AGING_LABELS[1], value: Math.max(0, agingBuckets.days30) },
                { name: AGING_LABELS[2], value: Math.max(0, agingBuckets.days60) },
                { name: AGING_LABELS[3], value: Math.max(0, agingBuckets.days90) },
            ];

            return {
                agingBuckets,
                partiesList,
                totalOutstanding,
                criticalCount,
                chartData,
            };
        },
        enabled: !!user?.company_id,
    });
};

const DebtAgingReport: React.FC = () => {
    const { data, isLoading } = useDebtAging();

    const columns = useMemo(() => [
        {
            header: 'العميل',
            accessor: (row: any) => (
                <div className="flex flex-col">
                    <span className="font-bold text-gray-800 dark:text-slate-100 text-[10px]">{row.name}</span>
                    <span className="text-[8px] text-gray-400">أقدم فاتورة: {row.oldestDate?.split('T')[0]}</span>
                </div>
            ),
        },
        {
            header: 'حالية',
            accessor: (row: any) => row.current > 0 ? (
                <span dir="ltr" className="font-mono text-[9px] font-bold text-emerald-600">{formatCurrency(row.current)}</span>
            ) : <span className="text-gray-300">—</span>,
            width: '100px', align: 'center' as const,
        },
        {
            header: '31-60',
            accessor: (row: any) => row.days30 > 0 ? (
                <span dir="ltr" className="font-mono text-[9px] font-bold text-amber-600">{formatCurrency(row.days30)}</span>
            ) : <span className="text-gray-300">—</span>,
            width: '100px', align: 'center' as const,
        },
        {
            header: '61-90',
            accessor: (row: any) => row.days60 > 0 ? (
                <span dir="ltr" className="font-mono text-[9px] font-bold text-orange-600">{formatCurrency(row.days60)}</span>
            ) : <span className="text-gray-300">—</span>,
            width: '100px', align: 'center' as const,
        },
        {
            header: '90+',
            accessor: (row: any) => row.days90 > 0 ? (
                <span dir="ltr" className="font-mono text-[9px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded">{formatCurrency(row.days90)}</span>
            ) : <span className="text-gray-300">—</span>,
            width: '100px', align: 'center' as const,
        },
        {
            header: 'الإجمالي',
            accessor: (row: any) => (
                <span dir="ltr" className="font-bold font-mono text-[10px] text-gray-800 dark:text-slate-100">{formatCurrency(row.total)}</span>
            ),
            width: '110px', align: 'center' as const,
        },
    ], []);

    if (isLoading) return <div className="p-20 text-center animate-pulse">جاري تحليل أعمار الديون...</div>;

    return (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header */}
            <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                <Clock size={16} className="text-amber-600" /> تقرير أعمار الديون (Aging Report)
            </h3>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <StatCard title="إجمالي المستحقات" value={formatCurrency(data?.totalOutstanding || 0)} icon={Users} colorClass="text-blue-500" iconBgClass="bg-blue-500" />
                <StatCard title="حالية (0-30 يوم)" value={formatCurrency(data?.agingBuckets.current || 0)} icon={ShieldCheck} colorClass="text-emerald-500" iconBgClass="bg-emerald-500" />
                <StatCard title="متأخرة (31-90 يوم)" value={formatCurrency((data?.agingBuckets.days30 || 0) + (data?.agingBuckets.days60 || 0))} icon={AlertTriangle} colorClass="text-amber-500" iconBgClass="bg-amber-500" />
                <StatCard title="حرجة (90+ يوم)" value={formatCurrency(data?.agingBuckets.days90 || 0)} icon={AlertTriangle} colorClass="text-rose-500" iconBgClass="bg-rose-500" />
            </div>

            {/* Alert for critical debts */}
            {(data?.criticalCount || 0) > 0 && (
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-lg p-3 flex items-center gap-3">
                    <AlertTriangle size={16} className="text-rose-600 flex-shrink-0" />
                    <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400">
                        ⚠️ يوجد {data?.criticalCount} عميل لديهم ديون متأخرة أكثر من 90 يوم بإجمالي {formatCurrency(data?.agingBuckets.days90 || 0)}
                    </span>
                </div>
            )}

            {/* Chart */}
            {(data?.chartData || []).some(d => d.value > 0) && (
                <div className="bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-800 p-4 shadow-sm">
                    <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-3">توزيع الديون حسب العمر</h4>
                    <div style={{ width: '100%', height: 200 }}>
                        <ResponsiveContainer width="100%" height={200} minWidth={1} minHeight={1}>
                            <BarChart data={data?.chartData || []} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={100} />
                                <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), 'المبلغ']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} minPointSize={1}>
                                    {data?.chartData.map((_, i) => (
                                        <Cell key={i} fill={AGING_COLORS[i]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-3 border-b dark:border-slate-800 flex justify-between items-center bg-amber-50/50 dark:bg-amber-950/20">
                    <h4 className="font-bold text-[9px] text-amber-600 uppercase flex items-center gap-2">
                        <Clock size={12} /> تفصيل أعمار الديون حسب العميل ({data?.partiesList.length || 0})
                    </h4>
                    <ShareButton
                        size="sm"
                        eventType="debt_aging"
                        title="مشاركة تقرير أعمار الديون"
                        message={`⏰ تقرير أعمار الديون\n━━━━━━━━━━━━━━\n💰 الإجمالي: ${formatCurrency(data?.totalOutstanding || 0)}\n✅ حالية: ${formatCurrency(data?.agingBuckets.current || 0)}\n⚠️ متأخرة (31-60): ${formatCurrency(data?.agingBuckets.days30 || 0)}\n🟠 متأخرة (61-90): ${formatCurrency(data?.agingBuckets.days60 || 0)}\n🔴 حرجة (90+): ${formatCurrency(data?.agingBuckets.days90 || 0)}`}
                    />
                </div>
                <div className="p-1">
                    <ExcelTable columns={columns} data={data?.partiesList || []} colorTheme="orange" isRTL />
                </div>
            </div>
        </div>
    );
};

export default DebtAgingReport;
