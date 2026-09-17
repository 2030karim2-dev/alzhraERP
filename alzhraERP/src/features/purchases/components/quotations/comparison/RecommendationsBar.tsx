import React from 'react';
import { Shield, Trophy, Zap } from 'lucide-react';
import { formatCurrency } from '../../../../../core/utils';
import {
  computeTotalDifference,
  type ComparisonSupplier,
} from '../../../services/quotationComparison';

type ChipTone = 'emerald' | 'blue' | 'amber' | 'violet';

const chipToneClass = (tone: ChipTone): string => {
  if (tone === 'emerald')
    return 'border-emerald-200 bg-white dark:border-emerald-800/30 dark:bg-slate-800/80';
  if (tone === 'blue')
    return 'border-blue-200 bg-white dark:border-blue-800/30 dark:bg-slate-800/80';
  if (tone === 'amber')
    return 'border-amber-200 bg-amber-50 dark:border-amber-800/30 dark:bg-amber-900/20';
  return 'border-violet-200 bg-white dark:border-violet-800/30 dark:bg-slate-800/80';
};

/** إطار موحّد لبطاقات شريط التوصيات (يقلّل تكرار الأنماط الأربعة). */
const ChipCard = ({
  tone,
  children,
}: {
  tone: ChipTone;
  children: React.ReactNode;
}): React.ReactElement => (
  <div
    className={`flex items-center gap-2 rounded-xl border px-3 py-2 shadow-sm ${chipToneClass(tone)}`}
  >
    {children}
  </div>
);

const CheapestSupplierChip = ({
  name,
  showNormalizedNote,
}: {
  name: string;
  showNormalizedNote: boolean;
}): React.ReactElement => (
  <ChipCard tone="emerald">
    <Trophy size={16} className="text-emerald-600" />
    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
      الأوفر إجمالياً:
    </span>
    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{name}</span>
    {showNormalizedNote && (
      <span className="text-[10px] text-violet-600 dark:text-violet-400">(بالمعادل السعودي)</span>
    )}
  </ChipCard>
);

const QuotationCountChip = ({ count }: { count: number }): React.ReactElement => (
  <ChipCard tone="blue">
    <Zap size={16} className="text-blue-600" />
    <span className="text-xs font-bold text-blue-700 dark:text-blue-400">عدد العروض:</span>
    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{count}</span>
  </ChipCard>
);

const MixedCurrencyNoticeChip = (): React.ReactElement => (
  <ChipCard tone="amber">
    <Shield size={16} className="text-amber-600" />
    <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
      عروض بعملات متعددة:
    </span>
    <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
      يرجى تفعيل «توحيد العملة للأساسية» لاحتساب فارق السعر الدقيق
    </span>
  </ChipCard>
);

const PriceDifferenceChip = ({
  difference,
}: {
  difference: { value: number; currency: string } | null;
}): React.ReactElement => (
  <ChipCard tone="violet">
    <Shield size={16} className="text-violet-600" />
    <span className="text-xs font-bold text-violet-700 dark:text-violet-400">
      فارق السعر الإجمالي:
    </span>
    <span className="text-xs font-medium text-gray-700 dark:text-gray-300" dir="ltr">
      {difference === null ? '—' : formatCurrency(difference.value, difference.currency)}
    </span>
  </ChipCard>
);

interface RecommendationsBarProps {
  suppliers: ComparisonSupplier[];
  cheapestId: string;
  isMixedCurrencies: boolean;
  normalizeCurrency: boolean;
  dynamicRatesMap?: Map<string, number> | undefined;
}

/** شريط التوصيات أسفل المقارنة: الأوفر إجمالاً + عدد العروض + فارق السعر. */
export const RecommendationsBar = ({
  suppliers,
  cheapestId,
  isMixedCurrencies,
  normalizeCurrency,
  dynamicRatesMap,
}: RecommendationsBarProps): React.ReactElement => {
  const cheapest = suppliers.find(supplier => supplier.id === cheapestId);
  const difference = computeTotalDifference(suppliers, {
    isMixedCurrencies,
    normalizeCurrency,
    dynamicRatesMap,
  });

  return (
    <div className="border-t border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 dark:border-slate-800 dark:from-emerald-900/10 dark:to-teal-900/10">
      <div className="flex flex-wrap items-center gap-4">
        {cheapest !== undefined && (
          <CheapestSupplierChip
            name={cheapest.party?.name ?? 'مورد غير محدد'}
            showNormalizedNote={isMixedCurrencies && normalizeCurrency}
          />
        )}
        <QuotationCountChip count={suppliers.length} />
        {isMixedCurrencies && !normalizeCurrency ? (
          <MixedCurrencyNoticeChip />
        ) : (
          <PriceDifferenceChip difference={difference} />
        )}
      </div>
    </div>
  );
};
