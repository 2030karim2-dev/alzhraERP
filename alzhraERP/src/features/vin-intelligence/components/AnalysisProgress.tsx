import React from 'react';
import { CheckCircle2, Loader2, Circle, XCircle } from 'lucide-react';
import type { AnalysisStep } from '../types';
import { useTranslation } from '../../../lib/hooks/useTranslation';

interface AnalysisProgressProps {
  steps: AnalysisStep[];
  isAnalyzing: boolean;
}

const AnalysisProgress: React.FC<AnalysisProgressProps> = ({ steps, isAnalyzing }) => {
  const { t } = useTranslation();
  if (!isAnalyzing && steps.every(s => s.status === 'PENDING')) return null;

  return (
    <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl p-3 shadow-sm">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text-secondary)] mb-3">
        {t('vin_analyzing')}
      </h3>
      <div className="space-y-1.5">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-2">
            {step.status === 'COMPLETE' && <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />}
            {step.status === 'IN_PROGRESS' && <Loader2 size={12} className="text-blue-500 animate-spin shrink-0" />}
            {step.status === 'PENDING' && <Circle size={10} className="text-slate-300 dark:text-slate-600 shrink-0 ml-[2px]" />}
            {step.status === 'ERROR' && <XCircle size={12} className="text-rose-500 shrink-0" />}
            <span className={`text-[10px] font-bold ${
              step.status === 'COMPLETE' ? 'text-emerald-600 dark:text-emerald-400' :
              step.status === 'IN_PROGRESS' ? 'text-blue-600 dark:text-blue-400' :
              'text-[var(--app-text-secondary)]'
            }`}>
              {t(step.label)}
            </span>
          </div>
        ))}
      </div>
      {isAnalyzing && (
        <div className="mt-3 pt-2 border-t border-[var(--app-border)]">
          <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{
              width: `${steps.length ? (steps.filter(s => s.status === 'COMPLETE').length / steps.length) * 100 : 0}%`
            }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisProgress;
