import React from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import type { VinHistoryEntry } from '../types';
import { format } from 'date-fns';
import { useTranslation } from '../../../lib/hooks/useTranslation';

const formatDate = (dateStr: string): string => {
  try { return format(new Date(dateStr), 'MMM dd'); } catch { return ''; }
};

const VINHistory: React.FC<{ history: VinHistoryEntry[]; onSelect: (vin: string) => void }> = ({ history, onSelect }) => {
  const { t } = useTranslation();
  if (!history.length) return null;
  return (
    <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl shadow-sm p-3">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text)] mb-2 flex items-center gap-1.5">
        <Clock size={12} className="text-slate-500" /> {t('vin_history')}
      </h3>
      <div className="space-y-1">
        {history.map(h => (
          <button key={h.vin} onClick={() => onSelect(h.vin)} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[var(--app-surface-hover)] transition-all group text-start">
            <div className="min-w-0">
              <p className="font-mono font-bold text-[10px] text-indigo-600 dark:text-indigo-400">{h.vin}</p>
              <p className="text-[8px] text-[var(--app-text-secondary)] truncate">
                {h.make ? `${h.make} ${h.model} ${h.year || ''}` : h.resultSummary || ''}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[7px] font-bold text-[var(--app-text-secondary)] uppercase tracking-widest">
                {formatDate(h.analyzedAt)}
              </span>
              <ChevronRight size={12} className="text-slate-300 group-hover:text-blue-500" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default VINHistory;
