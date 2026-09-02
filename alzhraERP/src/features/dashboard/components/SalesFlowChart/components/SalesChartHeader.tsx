import React from 'react';
import { Activity, BarChart3, Zap, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../../../core/utils';
import type { ChartType, PeriodType, SeriesType } from '../hooks/useSalesFlowChart';

interface SalesChartHeaderProps {
  seriesConfig: Record<SeriesType, { label: string; color: string }>;
  visibleSeries: Record<SeriesType, boolean>;
  toggleSeries: (series: SeriesType) => void;
  showPeriodSelector: boolean;
  period: PeriodType;
  handlePeriodChange: (p: PeriodType) => void;
  chartType: ChartType;
  setChartType: (c: ChartType) => void;
}

const periodLabels: Record<PeriodType, string> = {
  week: 'أسبوع',
  month: 'شهر',
  quarter: '3 أشهر',
  year: 'سنة',
  all: 'الكل',
};

export const SalesChartHeader: React.FC<SalesChartHeaderProps> = ({
  seriesConfig,
  visibleSeries,
  toggleSeries,
  showPeriodSelector,
  period,
  handlePeriodChange,
  chartType,
  setChartType,
}) => {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 max-md:mb-3">
      {/* Series Toggles */}
      <div className="no-scrollbar order-last mr-auto flex max-w-full gap-2 overflow-x-auto pb-1 lg:order-first">
        {(Object.keys(seriesConfig) as SeriesType[]).map(s => (
          <button
            key={s}
            onClick={() => {
              toggleSeries(s);
            }}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2 py-1 text-[10px] font-bold transition-all',
              visibleSeries[s]
                ? 'border-opacity-20 bg-opacity-10'
                : 'border-transparent bg-[var(--app-surface-hover)] opacity-60 grayscale'
            )}
            style={{
              backgroundColor: visibleSeries[s] ? seriesConfig[s].color + '20' : undefined,
              borderColor: visibleSeries[s] ? seriesConfig[s].color : undefined,
              color: visibleSeries[s] ? seriesConfig[s].color : undefined,
            }}
          >
            {visibleSeries[s] ? <CheckCircle2 size={12} /> : <div className="w-3" />}
            {seriesConfig[s].label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {/* Period Selector */}
        {showPeriodSelector && (
          <div className="flex items-center gap-1 rounded-xl bg-[var(--app-surface-hover)] p-1">
            {(['week', 'month', 'quarter', 'year', 'all'] as PeriodType[]).map(p => (
              <button
                key={p}
                onClick={() => {
                  handlePeriodChange(p);
                }}
                className={cn(
                  'rounded-lg px-3 py-1 text-[10px] font-bold transition-all',
                  period === p
                    ? 'scale-105 bg-[var(--app-surface)] text-[var(--app-text)] shadow-sm'
                    : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
                )}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 rounded-xl bg-[var(--app-surface-hover)] p-1">
          <button
            onClick={() => {
              setChartType('area');
            }}
            className={cn(
              'rounded-lg p-1.5 transition-all',
              chartType === 'area'
                ? 'bg-[var(--app-surface)] text-[var(--accent)] shadow-sm'
                : 'opacity-50'
            )}
          >
            <Activity size={14} />
          </button>
          <button
            onClick={() => {
              setChartType('bar');
            }}
            className={cn(
              'rounded-lg p-1.5 transition-all',
              chartType === 'bar'
                ? 'bg-[var(--app-surface)] text-[var(--accent)] shadow-sm'
                : 'opacity-50'
            )}
          >
            <BarChart3 size={14} />
          </button>
          <button
            onClick={() => {
              setChartType('composed');
            }}
            className={cn(
              'rounded-lg p-1.5 transition-all',
              chartType === 'composed'
                ? 'bg-[var(--app-surface)] text-[var(--accent)] shadow-sm'
                : 'opacity-50'
            )}
          >
            <Zap size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
