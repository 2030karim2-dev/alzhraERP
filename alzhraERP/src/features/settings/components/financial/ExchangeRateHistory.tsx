import React, { useMemo, useState } from 'react';
import {
  History,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Filter,
  ArrowLeftRight,
} from 'lucide-react';
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
    return filtered.sort(
      (a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime()
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
      return date.toLocaleDateString('ar-SA-u-nu-latn', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('ar-SA-u-nu-latn', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  if (rates.isLoading) {
    return (
      <div className="rounded-2xl border-2 border-gray-100 bg-[var(--app-surface)] p-8 text-center dark:border-slate-800 max-md:p-4">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <p className="mt-2 text-[10px] font-bold text-gray-400">جاري تحميل السجل...</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-gray-100 bg-[var(--app-surface)] shadow-sm dark:border-slate-800">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-3 border-b border-gray-100 p-4 dark:border-slate-800 max-md:gap-3 max-md:p-4 sm:flex-row sm:items-center md:p-5">
        <div className="flex items-center gap-2 max-md:gap-2.5">
          <div className="rounded-xl bg-amber-500 p-2 text-white shadow-md shadow-amber-500/20 max-md:p-2">
            <History size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-tight text-gray-800 dark:text-slate-100 md:text-sm">
              سجل أسعار الصرف التاريخي
            </h3>
            <p className="mt-0.5 text-[10px] font-bold text-gray-400 dark:text-slate-500 md:text-[10px]">
              {filteredRates.length} سجل — آخر تحديث{' '}
              {filteredRates[0] ? formatDate(filteredRates[0].effective_date) : '—'}
            </p>
          </div>
        </div>

        {/* Currency Filter */}
        {currencies.length > 0 && (
          <div className="flex items-center gap-2 max-md:gap-2">
            <Filter size={12} className="text-gray-400" />
            <select
              value={filterCurrency}
              onChange={e => {
                setFilterCurrency(e.target.value);
              }}
              className="rounded-lg border-2 border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] font-bold text-gray-700 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 md:text-xs"
            >
              <option value="all">جميع العملات</option>
              {currencies.map(code => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Rate History Table */}
      {filteredRates.length === 0 ? (
        <div className="p-10 text-center max-md:p-5">
          <ArrowLeftRight size={32} className="mx-auto mb-3 text-gray-200 dark:text-slate-700" />
          <p className="text-xs font-bold text-gray-400 dark:text-slate-500">
            لا يوجد سجل لأسعار الصرف بعد
          </p>
          <p className="mt-1 text-[10px] text-gray-300 dark:text-slate-600">
            قم بتحديث سعر صرف من تبويب "تعدد العملات" وسيظهر هنا تلقائياً
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 dark:border-slate-800 dark:bg-slate-800/50">
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 md:text-[10px]">
                  #
                </th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 md:text-[10px]">
                  العملة
                </th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 md:text-[10px]">
                  السعر
                </th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 md:text-[10px]">
                  التغيير
                </th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 md:text-[10px]">
                  التاريخ
                </th>
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
                      'border-b border-gray-50 transition-colors hover:bg-gray-50/50 dark:border-slate-800/50 dark:hover:bg-slate-800/30',
                      index === 0 && 'bg-blue-50/30 dark:bg-blue-900/10'
                    )}
                  >
                    <td className="px-4 py-3 text-[10px] font-bold text-gray-300 dark:text-slate-600 md:text-[10px]">
                      {filteredRates.length - index}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 dark:bg-slate-800 max-md:gap-1.5">
                        <ArrowLeftRight size={10} className="text-gray-400" />
                        <span className="text-[10px] font-bold text-gray-700 dark:text-slate-200 md:text-[10px]">
                          {rate.currency_code}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold tabular-nums text-gray-800 dark:text-slate-100 md:text-sm">
                        {Number(rate.rate_to_base).toFixed(4)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 max-md:gap-1">
                        {trend === 'up' && <TrendingUp size={12} className="text-emerald-500" />}
                        {trend === 'down' && <TrendingDown size={12} className="text-red-500" />}
                        {trend === 'same' && <Minus size={12} className="text-gray-300" />}
                        {change && (
                          <span
                            className={cn(
                              'text-[10px] font-bold tabular-nums md:text-[10px]',
                              trend === 'up'
                                ? 'text-emerald-600'
                                : trend === 'down'
                                  ? 'text-red-600'
                                  : 'text-gray-400'
                            )}
                          >
                            {trend === 'up' ? '+' : ''}
                            {change}%
                          </span>
                        )}
                        {!change && (
                          <span className="text-[10px] text-gray-300 dark:text-slate-600">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 max-md:gap-1.5">
                        <Calendar size={10} className="text-gray-300 dark:text-slate-600" />
                        <div>
                          <span className="block text-[10px] font-bold text-gray-600 dark:text-slate-300 md:text-[10px]">
                            {formatDate(rate.effective_date)}
                          </span>
                          <span className="text-[10px] text-gray-300 dark:text-slate-600 md:text-[10px]">
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
