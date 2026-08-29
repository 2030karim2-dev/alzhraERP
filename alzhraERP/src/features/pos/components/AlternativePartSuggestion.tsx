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
  alternatives, onSelect, className,
}) => {
  if (alternatives.length === 0) return null;

  return (
    <div className={cn('p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800', className)}>
      <div className="flex items-center gap-2 mb-3">
        <TrendingDown size={14} className="text-amber-600" />
        <span className="text-xs font-bold text-amber-700 dark:text-amber-400">قطع بديلة متوفرة</span>
      </div>

      <div className="space-y-2">
        {alternatives.map((alt) => (
          <button
            key={alt.id}
            onClick={() => onSelect(alt)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-[var(--app-border)] hover:border-amber-300 dark:hover:border-amber-700 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <Package size={18} className="text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[var(--app-text)] truncate">{alt.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-mono text-[var(--app-text-secondary)]">{alt.partNumber}</span>
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', qualityColors[alt.quality])}>
                  {qualityLabels[alt.quality]}
                </span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-black text-[var(--app-text)] font-mono">{alt.price.toLocaleString('en-US')} ريال</p>
              {alt.savingsPercent > 0 && (
                <p className="text-[10px] font-bold text-emerald-600">وفر {alt.savingsPercent}%</p>
              )}
              <p className="text-[10px] text-[var(--app-text-secondary)]">المخزون: {alt.stockQuantity}</p>
            </div>
            <CheckCircle size={16} className="text-[var(--app-text-secondary)] opacity-0 group-hover:opacity-100 group-hover:text-emerald-500 transition-all flex-shrink-0 max-md:opacity-100" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default AlternativePartSuggestion;
