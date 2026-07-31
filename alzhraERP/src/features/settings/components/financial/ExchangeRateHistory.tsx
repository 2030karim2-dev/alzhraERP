
import React, { useMemo, useState } from 'react';
import { History, TrendingUp, TrendingDown, Minus, Calendar, Filter, ArrowLeftRight } from 'lucide-react';
import { useCurrencies } from '../../hooks';
import { cn } from '../../../../core/utils';

interface ExchangeRateEntry {
    id: string;
    currency_code: string;
    rate_to_base: number;
    effective_date: string;
    created_by?: string;
}

const ExchangeRateHistory: React.FC = () => {
    const { rates } = useCurrencies();
    const [filterCurrency, setFilterCurrency] = useState<string>('all');

    const rateHistory: ExchangeRateEntry[] = (rates.data || []) as ExchangeRateEntry[];

    // Get unique currencies from history
    const currencies = useMemo(() => {
        const codes = new Set(rateHistory.map(r => r.currency_code));
        return Array.from(codes);
    }, [rateHistory]);

    // Filter and sort rates
    const filteredRates = useMemo(() => {
        let filtered = [...rateHistory];
        if (filterCurrency !== 'all') {
            filtered = filtered.filter(r => r.currency_code === filterCurrency);
        }
        return filtered.sort((a, b) =>
            new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime()
        );
    }, [rateHistory, filterCurrency]);

    // Calculate trend for each rate entry
    const getTrend = (rate: ExchangeRateEntry, _index: number): 'up' | 'down' | 'same' => {
        const sameRates = filteredRates.filter(r => r.currency_code === rate.currency_code);
        const currentIdx = sameRates.indexOf(rate);
        const prevRate = sameRates[currentIdx + 1]; // Sorted newest first
        if (!prevRate) return 'same';
        if (rate.rate_to_base > prevRate.rate_to_base) return 'up';
        if (rate.rate_to_base < prevRate.rate_to_base) return 'down';
        return 'same';
    };

    const getChangePercent = (rate: ExchangeRateEntry): string | null => {
        const sameRates = filteredRates.filter(r => r.currency_code === rate.currency_code);
        const currentIdx = sameRates.indexOf(rate);
        const prevRate = sameRates[currentIdx + 1];
        if (!prevRate || prevRate.rate_to_base === 0) return null;
        const change = ((rate.rate_to_base - prevRate.rate_to_base) / prevRate.rate_to_base) * 100;
        return change.toFixed(2);
    };

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('ar-SA', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };

    const formatTime = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
    };

    if (rates.isLoading) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-gray-100 dark:border-slate-800 p-8 text-center">
                <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-[9px] font-bold text-gray-400 mt-2">جاري تحميل السجل...</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 md:p-5 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-500 text-white rounded-xl shadow-md shadow-amber-500/20">
                        <History size={16} />
                    </div>
                    <div>
                        <h3 className="text-xs md:text-sm font-bold text-gray-800 dark:text-slate-100 uppercase tracking-tight">
                            سجل أسعار الصرف التاريخي
                        </h3>
                        <p className="text-[8px] md:text-[9px] font-bold text-gray-400 dark:text-slate-500 mt-0.5">
                            {filteredRates.length} سجل — آخر تحديث {filteredRates[0] ? formatDate(filteredRates[0].effective_date) : '—'}
                        </p>
                    </div>
                </div>

                {/* Currency Filter */}
                {currencies.length > 0 && (
                    <div className="flex items-center gap-2">
                        <Filter size={12} className="text-gray-400" />
                        <select
                            value={filterCurrency}
                            onChange={e => setFilterCurrency(e.target.value)}
                            className="bg-gray-50 dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-lg py-1.5 px-3 text-[10px] md:text-xs font-bold text-gray-700 dark:text-slate-300 outline-none focus:border-blue-500 transition-colors"
                        >
                            <option value="all">جميع العملات</option>
                            {currencies.map(code => (
                                <option key={code} value={code}>{code}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Rate History Table */}
            {filteredRates.length === 0 ? (
                <div className="p-10 text-center">
                    <ArrowLeftRight size={32} className="text-gray-200 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-xs font-bold text-gray-400 dark:text-slate-500">
                        لا يوجد سجل لأسعار الصرف بعد
                    </p>
                    <p className="text-[9px] text-gray-300 dark:text-slate-600 mt-1">
                        قم بتحديث سعر صرف من تبويب "تعدد العملات" وسيظهر هنا تلقائياً
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                                <th className="text-right px-4 py-2.5 text-[8px] md:text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">#</th>
                                <th className="text-right px-4 py-2.5 text-[8px] md:text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">العملة</th>
                                <th className="text-right px-4 py-2.5 text-[8px] md:text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">السعر</th>
                                <th className="text-right px-4 py-2.5 text-[8px] md:text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">التغيير</th>
                                <th className="text-right px-4 py-2.5 text-[8px] md:text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">التاريخ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRates.map((rate, index) => {
                                const trend = getTrend(rate, index);
                                const change = getChangePercent(rate);
                                return (
                                    <tr
                                        key={rate.id}
                                        className={cn(
                                            "border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors",
                                            index === 0 && "bg-blue-50/30 dark:bg-blue-900/10"
                                        )}
                                    >
                                        <td className="px-4 py-3 text-[9px] md:text-[10px] font-bold text-gray-300 dark:text-slate-600">
                                            {filteredRates.length - index}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                                                <ArrowLeftRight size={10} className="text-gray-400" />
                                                <span className="text-[9px] md:text-[10px] font-bold text-gray-700 dark:text-slate-200">
                                                    {rate.currency_code}
                                                </span>
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs md:text-sm font-bold text-gray-800 dark:text-slate-100 tabular-nums">
                                                {Number(rate.rate_to_base).toFixed(4)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                {trend === 'up' && <TrendingUp size={12} className="text-emerald-500" />}
                                                {trend === 'down' && <TrendingDown size={12} className="text-red-500" />}
                                                {trend === 'same' && <Minus size={12} className="text-gray-300" />}
                                                {change && (
                                                    <span className={cn(
                                                        "text-[9px] md:text-[10px] font-bold tabular-nums",
                                                        trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-gray-400'
                                                    )}>
                                                        {trend === 'up' ? '+' : ''}{change}%
                                                    </span>
                                                )}
                                                {!change && (
                                                    <span className="text-[9px] text-gray-300 dark:text-slate-600">—</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={10} className="text-gray-300 dark:text-slate-600" />
                                                <div>
                                                    <span className="text-[9px] md:text-[10px] font-bold text-gray-600 dark:text-slate-300 block">
                                                        {formatDate(rate.effective_date)}
                                                    </span>
                                                    <span className="text-[7px] md:text-[8px] text-gray-300 dark:text-slate-600">
                                                        {formatTime(rate.effective_date)}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ExchangeRateHistory;
