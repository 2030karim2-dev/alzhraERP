import React, { useState } from 'react';
import { Copy, Check, Hash } from 'lucide-react';
import { cn } from '../../../core/utils';

interface OEMNumbersDisplayProps {
  partNumber: string;
  alternativeNumbers?: string[];
  className?: string;
}

const OEMNumbersDisplay: React.FC<OEMNumbersDisplayProps> = ({
  partNumber, alternativeNumbers = [], className,
}) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const allNumbers = [partNumber, ...alternativeNumbers.filter(n => n !== partNumber)];

  const copyToClipboard = (num: string, idx: number): void => {
    navigator.clipboard.writeText(num).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    }).catch(() => {});
  };

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {allNumbers.map((num, idx) => (
        <button
          key={`${num}-${idx}`}
          onClick={() => copyToClipboard(num, idx)}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition-all duration-200 active:scale-95',
            idx === 0
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
              : 'bg-[var(--app-bg)] text-[var(--app-text-secondary)] border border-[var(--app-border)] hover:border-blue-300 dark:hover:border-blue-700',
          )}
          title={idx === 0 ? 'رقم القطعة الأساسي' : 'رقم بديل'}
        >
          {idx === 0 && <Hash size={10} className="opacity-50" />}
          <span dir="ltr">{num}</span>
          {copiedIdx === idx ? (
            <Check size={10} className="text-emerald-500" />
          ) : (
            <Copy size={10} className="opacity-50 hover:opacity-100" />
          )}
        </button>
      ))}
    </div>
  );
};

export default OEMNumbersDisplay;
