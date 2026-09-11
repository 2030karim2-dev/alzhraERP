import React from 'react';
import { Package } from 'lucide-react';
import { formatCurrency } from '../../../../core/utils';
import type { ReturnsType } from '../../hooks/useReturnsReport';

interface Props {
  topParties: TopPartyRow[];
  type: ReturnsType;
}

/** صف جهة (عميل/مورد) ضمن الأطراف الأكثر تفاعلاً في المرتجعات. */
interface TopPartyRow {
  name: string;
  count: number;
  total: number;
}

const ReturnsTopParties: React.FC<Props> = ({ topParties, type }) => {
  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h4 className="text-base font-bold text-slate-800 dark:text-white">
            {type === 'sales'
              ? 'العملاء الأكثر تسجيلاً للمرتجعات'
              : type === 'purchase'
                ? 'الموردون الأكثر تسجيلاً للمرتجعات'
                : 'الأطراف الأكثر تسجيلاً للمرتجعات'}
          </h4>
          <p className="text-[10px] font-semibold text-slate-400">
            تحليل الجهات الأكثر نشاطاً في المرتجعات المالية
          </p>
        </div>
      </div>
      {topParties.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topParties.map((party, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-hover)] p-3.5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-sm font-bold text-blue-600 dark:text-blue-400">
                  #{index + 1}
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-800 dark:text-white">
                    {party.name}
                  </span>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-400">عدد المرتجعات:</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {party.count}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-left">
                <div className="font-mono text-sm font-bold text-slate-800 dark:text-white">
                  {formatCurrency(party.total)}
                </div>
                <p className="text-[10px] font-semibold text-slate-400">إجمالي القيمة</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface-hover)] py-10 text-center">
          <Package size={32} className="mx-auto mb-2 text-slate-300 opacity-60" />
          <p className="text-xs font-semibold text-slate-400">
            لا توجد حركات مرتجعات مسجلة في هذه الفترة
          </p>
        </div>
      )}
    </div>
  );
};

export default ReturnsTopParties;
