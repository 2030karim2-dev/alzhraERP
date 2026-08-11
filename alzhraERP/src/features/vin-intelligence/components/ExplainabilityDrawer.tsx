import React, { useEffect, useState } from 'react';
import { X, Car, Wrench, CheckCircle2, AlertTriangle, HelpCircle, XCircle, Sparkles, Loader2 } from 'lucide-react';
import type { VehicleCorePart, VehicleConfiguration } from '../types';
import { useTranslation } from '../../../lib/hooks/useTranslation';
import { getPartAIInsight } from '../services/vinAIService';
import { logger } from '../../../core/utils/logger';

interface ExplainabilityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: VehicleConfiguration;
  part: VehicleCorePart;
}

const ExplainabilityDrawer: React.FC<ExplainabilityDrawerProps> = ({ isOpen, onClose, vehicle, part }) => {
  const { t } = useTranslation();

  // AI part explanation — on-demand, resets whenever a different part is opened
  const [partInsight, setPartInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightFailed, setInsightFailed] = useState(false);

  useEffect(() => {
    setPartInsight(null);
    setInsightFailed(false);
    setInsightLoading(false);
  }, [part.id]);

  const handleAIInsight = async () => {
    setInsightLoading(true);
    setInsightFailed(false);
    try {
      const text = await getPartAIInsight(part, vehicle.make, vehicle.model);
      if (text) setPartInsight(text);
      else setInsightFailed(true);
    } catch (err) {
      logger.error('VIN', 'Part AI insight failed', err);
      setInsightFailed(true);
    } finally {
      setInsightLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-[var(--app-surface)] border border-[var(--app-border)] rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[80vh] overflow-y-auto p-4 transition-all duration-200 ease-out">
        <button onClick={onClose} className="absolute top-3 right-3 p-1 hover:bg-[var(--app-surface-hover)] rounded-lg">
          <X size={14} className="text-[var(--app-text-secondary)]" />
        </button>

        <h2 className="text-[11px] font-black uppercase tracking-widest text-[var(--app-text)] mb-4">
          {part.fitmentStatus === 'NOT_COMPATIBLE' 
            ? t('vin_why_not_compatible')
            : t('vin_why_compatible')}
        </h2>

        <div className="space-y-3">
          <div className="bg-[var(--app-bg)] border border-[var(--app-border)] rounded-lg p-2.5">
            <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--app-text-secondary)] mb-1.5">{t('vin_vehicle_config')}</p>
            <div className="flex items-center gap-2">
              <Car size={14} className="text-blue-500" />
              <span className="font-bold text-[10px] text-[var(--app-text)]">{vehicle.make} {vehicle.model} {vehicle.year}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 mt-1.5 text-[9px]">
              <div><span className="text-[var(--app-text-secondary)]">{t('vin_engine_detail')}</span> <span className="font-bold">{vehicle.engineSize ?? t('vin_not_available')}</span></div>
              <div><span className="text-[var(--app-text-secondary)]">{t('vin_fuel_detail')}</span> <span className="font-bold">{vehicle.fuelType ?? t('vin_not_available')}</span></div>
              <div><span className="text-[var(--app-text-secondary)]">{t('vin_drive_detail')}</span> <span className="font-bold">{vehicle.driveType ?? t('vin_not_available')}</span></div>
            </div>
          </div>

          <div className="bg-[var(--app-bg)] border border-[var(--app-border)] rounded-lg p-2.5">
            <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--app-text-secondary)] mb-1.5">{t('vin_part_label')}</p>
            <div className="flex items-center gap-2">
              <Wrench size={14} className="text-indigo-500" />
              <span className="font-bold text-[10px] text-[var(--app-text)]">{part.canonicalPartName}</span>
            </div>
            {part.oemNumbers.length > 0 && (
              <p className="text-[9px] font-mono text-indigo-600 mt-1">OEM: {part.oemNumbers.join(', ')}</p>
            )}
          </div>

          <div className="bg-[var(--app-bg)] border border-[var(--app-border)] rounded-lg p-2.5">
            <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--app-text-secondary)] mb-1.5">{t('vin_fitment_label')}</p>
            <div className="flex items-center gap-1.5">
              {part.fitmentStatus === 'VERIFIED' && <CheckCircle2 size={14} className="text-emerald-500" />}
              {part.fitmentStatus === 'INFERRED' && <AlertTriangle size={14} className="text-amber-500" />}
              {part.fitmentStatus === 'UNKNOWN' && <HelpCircle size={14} className="text-slate-400" />}
              {part.fitmentStatus === 'NOT_COMPATIBLE' && <XCircle size={14} className="text-rose-400" />}
              <span className="font-bold text-[10px]">{part.fitmentStatus}</span>
            </div>
            <p className="text-[9px] text-[var(--app-text-secondary)] mt-1">
              <span className="font-bold">{t('vin_evidence')}:</span> {part.evidence || t('vin_no_evidence')}
            </p>
            <p className="text-[9px] text-[var(--app-text-secondary)]">
              <span className="font-bold">{t('vin_source')}:</span> {part.evidenceSource || t('vin_unknown_source')}
            </p>
          </div>

          <div className="bg-[var(--app-bg)] border border-[var(--app-border)] rounded-lg p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--app-text-secondary)] flex items-center gap-1">
                <Sparkles size={10} className="text-violet-500" /> شرح الذكاء الاصطناعي
              </p>
              {!partInsight && !insightLoading && (
                <button onClick={handleAIInsight}
                  className="text-[9px] font-bold text-violet-600 hover:text-violet-700 bg-violet-50 dark:bg-violet-900/20 px-2 py-1 rounded-lg transition-all">
                  {insightFailed ? 'إعادة المحاولة' : 'تحليل القطعة'}
                </button>
              )}
            </div>
            {insightLoading && (
              <p className="text-[9px] text-[var(--app-text-secondary)] flex items-center gap-1">
                <Loader2 size={10} className="animate-spin" /> جاري تحليل القطعة بالذكاء الاصطناعي...
              </p>
            )}
            {partInsight && <p className="text-[9px] leading-relaxed text-[var(--app-text)]">{partInsight}</p>}
            {insightFailed && !insightLoading && !partInsight && (
              <p className="text-[9px] text-rose-500">تعذر الحصول على شرح الذكاء الاصطناعي حالياً.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExplainabilityDrawer;
