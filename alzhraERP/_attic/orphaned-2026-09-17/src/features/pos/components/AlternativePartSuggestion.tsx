import React from 'react';
import { Package, TrendingDown, CheckCircle } from 'lucide-react';
import { cn } from '../../../core/utils';

interface AlternativePart {
  id: string;
  name: string;
  partNumber: string;
  price: number;
  stockQuantity: number;
  savingsPercent: number;
  quality: 'original' | 'aftermarket' | 'used';
}

interface AlternativePartSuggestionProps {
  alternatives: AlternativePart[];
  onSelect: (part: AlternativePart) => void;
  className?: string;
}

const qualityLabels: Record<string, string> = {
  original: 'أصلي',
  aftermarket: 'تجاري',
  used: 'مستعمل',
};

const qualityColors: Record<string, string> = {
  original: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  aftermarket: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  used: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
};

const AlternativePartSuggestion: React.FC<AlternativePartSuggestionProps> = ({
  alternatives,
  onSelect,
  className,
}) => {
  if (alternatives.length === 0) return null;

  return (
    <div
      className={cn(
        'rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/10',
        className
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <TrendingDown size={14} className="text-amber-600" />
        <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
          قطع بديلة متوفرة
        </span>
      </div>

      <div className="space-y-2">
        {alternatives.map(alt => (
          <button
            key={alt.id}
            onClick={() => {
              onSelect(alt);
            }}
            className="group flex w-full items-center gap-3 rounded-xl border border-[var(--app-border)] bg-white p-3 text-left transition-all hover:border-amber-300 dark:bg-slate-800 dark:hover:border-amber-700"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <Package size={18} className="text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-[var(--app-text)]">{alt.name}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="font-mono text-[10px] text-[var(--app-text-secondary)]">
                  {alt.partNumber}
                </span>
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-bold',
                    qualityColors[alt.quality]
                  )}
                >
                  {qualityLabels[alt.quality]}
                </span>
              </div>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="font-mono text-sm font-black text-[var(--app-text)]">
                {alt.price.toLocaleString('en-US')} ريال
              </p>
              {alt.savingsPercent > 0 && (
                <p className="text-[10px] font-bold text-emerald-600">وفر {alt.savingsPercent}%</p>
              )}
              <p className="text-[10px] text-[var(--app-text-secondary)]">
                المخزون: {alt.stockQuantity}
              </p>
            </div>
            <CheckCircle
              size={16}
              className="flex-shrink-0 text-[var(--app-text-secondary)] opacity-0 transition-all group-hover:text-emerald-500 group-hover:opacity-100 max-md:opacity-100"
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default AlternativePartSuggestion;
