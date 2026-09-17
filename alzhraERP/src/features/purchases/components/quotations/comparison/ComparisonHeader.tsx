import React from 'react';
import { ArrowRightLeft, ChevronDown, ChevronUp, Scale } from 'lucide-react';

/** زر تفعيل/إلغاء توحيد العملات — يظهر فقط عند تعدد العملات. */
const NormalizeCurrencyButton = ({
  normalizeCurrency,
  onToggle,
}: {
  normalizeCurrency: boolean;
  onToggle: () => void;
}): React.ReactElement => (
  <button
    type="button"
    onClick={onToggle}
    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
      normalizeCurrency
        ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
        : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300'
    }`}
    title="تحويل كافة الأسعار إلى الريال السعودي بناءً على أسعار الصرف الرسمية للمقارنة العادلة"
  >
    <ArrowRightLeft size={13} />
    <span>{normalizeCurrency ? 'معايرة العملات مفعّلة (ر.س)' : 'توحيد العملة للأساسية (ر.س)'}</span>
  </button>
);

const ComparisonHeaderTitle = ({
  suppliersCount,
}: {
  suppliersCount: number;
}): React.ReactElement => (
  <div className="flex items-center gap-3">
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-500/20">
      <Scale size={20} />
    </div>
    <div>
      <h3 className="font-bold text-gray-900 dark:text-white">مقارنة عروض الأسعار</h3>
      <p className="text-xs font-medium text-violet-600 dark:text-violet-400">
        {suppliersCount} عرض من {suppliersCount} مورد
      </p>
    </div>
  </div>
);

interface ComparisonHeaderActionsProps {
  expanded: boolean;
  onToggle: () => void;
  onClose: () => void;
  isMixedCurrencies: boolean;
  normalizeCurrency: boolean;
  onToggleNormalize: () => void;
}

const ComparisonHeaderActions = ({
  expanded,
  onToggle,
  onClose,
  isMixedCurrencies,
  normalizeCurrency,
  onToggleNormalize,
}: ComparisonHeaderActionsProps): React.ReactElement => (
  <div className="flex items-center gap-2">
    {isMixedCurrencies && (
      <NormalizeCurrencyButton normalizeCurrency={normalizeCurrency} onToggle={onToggleNormalize} />
    )}
    <button
      type="button"
      aria-label={expanded ? 'طي المقارنة' : 'توسيع المقارنة'}
      onClick={onToggle}
      className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-900/20"
    >
      {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </button>
    <button
      type="button"
      onClick={onClose}
      className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900 dark:bg-slate-800 dark:hover:bg-slate-700"
    >
      إغلاق
    </button>
  </div>
);

interface ComparisonHeaderProps extends ComparisonHeaderActionsProps {
  suppliersCount: number;
}

/** شريط رأس شاشة المقارنة (عنوان + أدوات التحكم). */
export function ComparisonHeader({
  suppliersCount,
  ...actions
}: ComparisonHeaderProps): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 p-4 dark:border-violet-800/30 dark:from-violet-900/20 dark:to-indigo-900/20">
      <ComparisonHeaderTitle suppliersCount={suppliersCount} />
      <ComparisonHeaderActions {...actions} />
    </div>
  );
}
