import React, { useState, useCallback, useEffect, useMemo } from 'react';
import MicroHeader from '../../../ui/base/MicroHeader';
import { Car, RotateCcw, LayoutDashboard, Wrench, Sparkles, Clock } from 'lucide-react';
import { useTranslation } from '../../../lib/hooks/useTranslation';
import VINSearch from '../components/VINSearch';
import AnalysisProgress from '../components/AnalysisProgress';
import ExplainabilityDrawer from '../components/ExplainabilityDrawer';
import DashboardTab from './tabs/DashboardTab';
import PartsTab from './tabs/PartsTab';
import MarketTab from './tabs/MarketTab';
import HistoryTab from './tabs/HistoryTab';
import { useVinAnalysis } from '../hooks/useVinAnalysis';
import { useVinHistory } from '../hooks/useVinHistory';
import { useVinAI } from '../hooks/useVinAI';
import { useVinCounts } from '../hooks/useVinCounts';
import type { VehicleCorePart, VinDashboardMetrics, VINTab } from '../types';

const TABS: { id: VINTab; labelKey: string; Icon: React.FC<{ size?: number; className?: string }> }[] = [
  { id: 'dashboard', labelKey: 'vin_tab_dashboard', Icon: LayoutDashboard },
  { id: 'parts',     labelKey: 'vin_tab_parts',     Icon: Wrench },
  { id: 'market',    labelKey: 'vin_tab_market',    Icon: Sparkles },
  { id: 'history',   labelKey: 'vin_tab_history',   Icon: Clock },
];

const VINPage: React.FC = () => {
  const { t } = useTranslation();
  const { result, isAnalyzing, error, steps, analyzeVin, reset } = useVinAnalysis();
  const { history, addToHistory, error: historyError } = useVinHistory();
  const { aiInsight, isAnalyzingAI, aiError, runAIAnalysis } = useVinAI();
  const { vehicleCount, vinsAnalyzedCount, refreshCounts } = useVinCounts();
  const [selectedPart, setSelectedPart] = useState<VehicleCorePart | null>(null);
  const [activeTab, setActiveTab] = useState<VINTab>('dashboard');

  const handleAnalyze = useCallback(async (vin: string) => {
    await analyzeVin(vin);
  }, [analyzeVin]);

  useEffect(() => {
    if (result && result.analysisStatus !== 'FAILED' && result.vehicle.make) {
      addToHistory({
        vin: result.vin,
        make: result.vehicle.make,
        model: result.vehicle.model,
        year: result.vehicle.year,
        analyzedAt: result.analysisTimestamp,
        resultSummary: `${result.vehicle.make} ${result.vehicle.model} ${result.vehicle.year || ''} — ${result.coreParts.length} ${t('vin_parts_count')}`,
      });
      refreshCounts();
      setActiveTab('dashboard');
    }
  }, [result, addToHistory, t, refreshCounts]);

  useEffect(() => {
    if (result && result.analysisStatus === 'COMPLETE' && result.vehicle.make) {
      runAIAnalysis(result);
    }
  }, [result, runAIAnalysis]);

  const metrics = useMemo((): VinDashboardMetrics => ({
    vinsAnalyzed: vinsAnalyzedCount,
    vehiclesInKnowledgeBase: vehicleCount,
    verifiedFitments: result ? result.coreParts.filter(p => p.fitmentStatus === 'VERIFIED').length : 0,
    inventoryMatches: result ? result.inventoryMatches.length : 0,
    unknownFitments: result ? result.coreParts.filter(p => p.fitmentStatus === 'UNKNOWN').length : 0,
  }), [vinsAnalyzedCount, vehicleCount, result]);

  const handleSelectRecent = useCallback((vin: string) => {
    handleAnalyze(vin);
  }, [handleAnalyze]);

  const handlePartClick = useCallback((part: VehicleCorePart) => {
    setSelectedPart(part);
  }, []);

  const handleReset = useCallback(() => {
    reset();
    setActiveTab('dashboard');
  }, [reset]);

  const hasResult = result && result.analysisStatus !== 'FAILED';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <MicroHeader
          Icon={Car}
          title={t('vin_intelligence')}
          description={t('vin_intelligence_desc')}
        />
        {result && (
          <button onClick={handleReset}
            className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--app-text-secondary)] transition-all">
            <RotateCcw size={12} />
            {t('vin_new_analysis')}
          </button>
        )}
      </div>

      {hasResult && <DashboardSummary metrics={metrics} />}

      <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl shadow-sm p-3">
        <VINSearch
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
          recentVins={history.map(h => h.vin)}
          onSelectRecent={handleSelectRecent}
        />
      </div>

      <AnalysisProgress steps={steps} isAnalyzing={isAnalyzing} />

      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-3">
          <p className="text-[10px] font-bold text-rose-600">{error}</p>
        </div>
      )}

      {result && result.analysisStatus === 'FAILED' && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">{t('vin_not_found')}</p>
          <p className="text-[9px] text-amber-700 dark:text-amber-400">
            {t('vin_not_found_desc', { vin: result.vin })}
          </p>
        </div>
      )}

      {hasResult && (
        <div role="tablist" aria-label={t('vin_tab_nav')} className="flex gap-1 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl p-1 overflow-x-auto">
          {TABS.map((tab, idx) => {
            const isActive = activeTab === tab.id;
            const handleKey = (e: React.KeyboardEvent) => {
              const n = TABS.length; let next = idx;
              if (e.key === 'ArrowRight') next = (idx + 1) % n;
              else if (e.key === 'ArrowLeft') next = (idx - 1 + n) % n;
              else if (e.key === 'Home') next = 0;
              else if (e.key === 'End') next = n - 1;
              else return;
              e.preventDefault();
              setActiveTab(TABS[next].id);
            };
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`vin-tabpanel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                title={t(tab.labelKey)}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={handleKey}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)] hover:text-[var(--app-text)]'
                }`}
              >
                <tab.Icon size={13} />
                <span className="hidden sm:inline">{t(tab.labelKey)}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="min-h-[300px]">
        {!hasResult && !isAnalyzing && !error && !result && (
          <HistoryTab
            history={history}
            metrics={metrics}
            historyError={historyError}
            onSelectVin={handleSelectRecent}
          />
        )}

        {hasResult && activeTab === 'dashboard' && (
          <DashboardTab result={result} metrics={metrics} error={error} />
        )}

        {hasResult && activeTab === 'parts' && (
          <PartsTab result={result} onPartClick={handlePartClick} />
        )}

        {hasResult && activeTab === 'market' && (
          <MarketTab
            result={result}
            aiInsight={aiInsight}
            isAnalyzingAI={isAnalyzingAI}
            aiError={aiError}
          />
        )}

        {hasResult && activeTab === 'history' && (
          <HistoryTab
            history={history}
            metrics={metrics}
            historyError={historyError}
            onSelectVin={handleSelectRecent}
          />
        )}
      </div>

      {selectedPart && result && result.analysisStatus !== 'FAILED' && (
        <ExplainabilityDrawer
          isOpen={!!selectedPart}
          onClose={() => setSelectedPart(null)}
          vehicle={result.vehicle}
          part={selectedPart}
        />
      )}
    </div>
  );
};

export default VINPage;
