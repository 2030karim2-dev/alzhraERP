import type { CommissionPeriod, CommissionPeriodState } from '../types';

interface CommissionPeriodListProps {
  periods: CommissionPeriod[];
  selectedPeriodId?: string;
  onSelect: (periodId: string) => void;
  labels: ReadonlyMap<CommissionPeriodState, string>;
}

export function CommissionPeriodList({
  periods,
  selectedPeriodId,
  onSelect,
  labels,
}: CommissionPeriodListProps): React.JSX.Element {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
      <div className="border-b border-[var(--app-border)] p-4">
        <h2 className="font-semibold text-[var(--app-text)]">الفترات</h2>
      </div>
      <div className="divide-y divide-[var(--app-border)]">
        {periods.map(period => (
          <button
            type="button"
            key={period.id}
            onClick={() => { onSelect(period.id); }}
            className={`flex w-full items-center justify-between p-4 text-right hover:bg-[var(--app-bg)] ${selectedPeriodId === period.id ? 'bg-emerald-50/60' : ''}`}
          >
            <span>
              <span className="block font-medium text-[var(--app-text)]">{period.period_label}</span>
              <span className="mt-1 block text-xs text-[var(--app-text-secondary)]">
                {period.period_start} — {period.period_end}
              </span>
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
              {labels.get(period.state) ?? period.state}
            </span>
          </button>
        ))}
        {periods.length === 0 && (
          <p className="p-12 text-center text-sm text-[var(--app-text-secondary)]">لا توجد فترات متاحة.</p>
        )}
      </div>
    </div>
  );
}
