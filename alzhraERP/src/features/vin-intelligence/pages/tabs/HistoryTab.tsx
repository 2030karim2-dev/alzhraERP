import React from 'react';
import VINHistory from '../../components/VINHistory';
import type { VinHistoryEntry, VinDashboardMetrics } from '../../types';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import { Clock, Database, CheckCircle2, Package } from 'lucide-react';

interface HistoryTabProps {
  history: VinHistoryEntry[];
  metrics: VinDashboardMetrics;
  historyError: string | null;
  onSelectVin: (vin: string) => void;
}

/**
 * Tab 4: History — Past analyses + quick stats
 * Reference panel for revisiting previous VIN lookups.
 */
const HistoryTab: React.FC<HistoryTabProps> = ({ history, metrics, historyError, onSelectVin }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 animate-fadeIn">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl p-2.5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
            <Clock size={12} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] font-bold uppercase tracking-wider text-[var(--app-text-secondary)]">{t('vin_stats_analyzed')}</p>
            <p className="text-xs font-black text-[var(--app-text)]">{metrics.vinsAnalyzed}</p>
          </div>
        </div>
        <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl p-2.5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
            <Database size={12} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] font-bold uppercase tracking-wider text-[var(--app-text-secondary)]">{t('vin_stats_vehicles')}</p>
            <p className="text-xs font-black text-[var(--app-text)]">{metrics.vehiclesInKnowledgeBase}</p>
          </div>
        </div>
        <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl p-2.5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
            <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] font-bold uppercase tracking-wider text-[var(--app-text-secondary)]">{t('vin_stats_verified')}</p>
            <p className="text-xs font-black text-[var(--app-text)]">{metrics.verifiedFitments}</p>
          </div>
        </div>
        <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl p-2.5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
            <Package size={12} className="text-green-600 dark:text-green-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] font-bold uppercase tracking-wider text-[var(--app-text-secondary)]">{t('vin_stats_inventory')}</p>
            <p className="text-xs font-black text-[var(--app-text)]">{metrics.inventoryMatches}</p>
          </div>
        </div>
      </div>

      {/* History Error */}
      {historyError && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-3">
          <p className="text-[10px] font-bold text-rose-600">{historyError}</p>
        </div>
      )}

      {/* VIN History List */}
      {history.length > 0 ? (
        <VINHistory history={history} onSelect={onSelectVin} />
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center px-4 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <Clock size={18} className="text-[var(--app-text-secondary)]" />
          </div>
          <p className="text-[10px] font-bold text-[var(--app-text)] mb-1">{t('vin_no_history')}</p>
          <p className="text-[8px] text-[var(--app-text-secondary)]">{t('vin_history_will_appear')}</p>
        </div>
      )}
    </div>
  );
};

export default HistoryTab;
