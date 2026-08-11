import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import MicroHeader from '../../../ui/base/MicroHeader';
import { Car, RotateCcw, Wrench, History } from 'lucide-react';
import { useTranslation } from '../../../lib/hooks/useTranslation';
import VINSearch from '../components/VINSearch';
import VehicleCard from '../components/VehicleCard';
import DashboardSummary from '../components/DashboardSummary';
import CorePartsTable from '../components/CorePartsTable';
import InventoryMatches from '../components/InventoryMatches';
import MissingParts from '../components/MissingParts';
import DemandIntelligence from '../components/DemandIntelligence';
import VINHistory from '../components/VINHistory';
import VinAIInsights from '../components/VinAIInsights';
import ExplainabilityDrawer from '../components/ExplainabilityDrawer';
import VinTabsBar from '../components/VinTabsBar';
import { useVinTabs, type TabStep } from '../hooks/useVinTabs';
import { useVinHistory } from '../hooks/useVinHistory';
import { useVinAI } from '../hooks/useVinAI';
import { useVinCounts } from '../hooks/useVinCounts';
import type { VehicleCorePart, VinDashboardMetrics, VinAnalysisResult } from '../types';
import { PartSearchPanel } from '../../part-intelligence/components/PartSearchPanel';


// ============================================================
// Empty state
// ============================================================
// Empty state receives history from parent to avoid conditional hook calls
const EmptyState: React.FC<{ onSelect: (vin: string) => void; history: ReturnType<typeof useVinHistory>['history'] }> = ({ onSelect, history }) => {
  if (history.length > 0) return <VINHistory history={history} onSelect={onSelect} />;
  return (
    <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl p-6 text-center">
      <Car size={32} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
      <p className="text-[11px] font-bold text-[var(--app-text-secondary)]">أدخل رقم الشاصي (VIN) للبدء</p>
    </div>
  );
};

// ============================================================
// Tab Content
// ============================================================
interface TabContentProps {
  tab: TabStep;
  data: ReturnType<typeof useVinTabs>['accumulatedData'];
  onPartClick: (part: VehicleCorePart) => void;
  error: string | null;
}

const TabContent: React.FC<TabContentProps> = ({ tab, data, onPartClick, error }) => {
  const { t } = useTranslation();
  const { aiInsight, isAnalyzingAI, aiError, runAIAnalysis } = useVinAI();

  useEffect(() => {
    if (tab === 'inventory' && data.vehicle?.make && data.coreParts.length > 0 && !aiInsight && !isAnalyzingAI) {
      const r: VinAnalysisResult = {
        vin: data.vin, vehicle: data.vehicle, coreParts: data.coreParts,
        inventoryMatches: data.inventoryMatches, missingParts: data.missingParts,
        demandInsights: data.demandInsights, analysisTimestamp: new Date().toISOString(),
        analysisStatus: 'COMPLETE',
      };
      runAIAnalysis(r);
    }
  }, [tab, data, aiInsight, isAnalyzingAI, runAIAnalysis]);

  switch (tab) {
    case 'validate-decode':
      return data.vehicle ? (
        <div className="space-y-3">
          <VehicleCard vehicle={data.vehicle} />
          {error && <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 rounded-xl p-3"><p className="text-[10px] font-bold text-rose-600">{error}</p></div>}
        </div>
      ) : null;

    case 'knowledge':
      return (
        <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl p-4 text-center">
          <p className="text-[10px] font-bold text-[var(--app-text)]">
            {data.vehicleIsNew ? `تمت إضافة ${data.vehicle?.make || ''} ${data.vehicle?.model || ''} إلى قاعدة المعرفة` : `المركبة ${data.vehicle?.make || ''} ${data.vehicle?.model || ''} موجودة مسبقاً`}
          </p>
          <p className="text-[9px] text-[var(--app-text-secondary)] mt-1">VIN: {data.normalizedVin}</p>
        </div>
      );

    case 'parts':
      return (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Wrench size={12} className="text-blue-500" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text)]">
              {t('vin_core_parts')} ({data.coreParts.length})
            </h3>
          </div>
          {data.coreParts.length > 0
            ? <CorePartsTable parts={data.coreParts} onPartClick={onPartClick} />
            : <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-xl p-4 text-center"><p className="text-[10px] font-bold text-amber-600">{t('vin_no_parts')}</p></div>}
        </div>
      );

    case 'inventory':
      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-2"><Wrench size={12} className="text-blue-500" /><h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text)]">{t('vin_core_parts')} ({data.coreParts.length})</h3></div>
            <CorePartsTable parts={data.coreParts} onPartClick={onPartClick} />
          </div>
          <div className="space-y-3">
            <InventoryMatches matches={data.inventoryMatches} />
            <MissingParts parts={data.missingParts} />
            <DemandIntelligence insights={data.demandInsights} />
            <PartSearchPanel vin={data.vin} vehicleInfo={{ make: data.vehicle?.make || '', model: data.vehicle?.model || '', year: data.vehicle?.year }} />
            <VinAIInsights insight={aiInsight} isLoading={isAnalyzingAI} error={aiError} />
          </div>
        </div>
      );

    case 'audit':
      return (
        <div className="space-y-3">
          <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2"><History size={12} className="text-purple-500" /><h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text)]">{t('vin_analysis_summary')}</h3></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
              <div><span className="text-[8px] text-[var(--app-text-secondary)] uppercase">{t('vin_parts_count')}</span><p className="font-bold">{data.coreParts.length}</p></div>
              <div><span className="text-[8px] text-[var(--app-text-secondary)] uppercase">{t('vin_in_stock')}</span><p className="font-bold text-emerald-600">{data.inventoryMatches.length}</p></div>
              <div><span className="text-[8px] text-[var(--app-text-secondary)] uppercase">{t('vin_missing_parts')}</span><p className="font-bold text-rose-600">{data.missingParts.length}</p></div>
              <div><span className="text-[8px] text-[var(--app-text-secondary)] uppercase">{t('vin_demand_intel')}</span><p className="font-bold text-orange-600">{data.demandInsights.length}</p></div>
            </div>
          </div>
          <PartSearchPanel vin={data.vin} vehicleInfo={{ make: data.vehicle?.make || '', model: data.vehicle?.model || '', year: data.vehicle?.year }} />
          <VinAIInsights insight={aiInsight} isLoading={isAnalyzingAI} error={aiError} />
        </div>
      );

    default: return null;
  }
};

// ============================================================
// VINPage
// ============================================================
const VINPage: React.FC = () => {
  const { t } = useTranslation();
  const { tabs, activeTab, setActiveTab, accumulatedData: data, runAllSteps, retryStep, reset, isAnyLoading } = useVinTabs();
  const { history, addToHistory } = useVinHistory();
  const { vehicleCount, vinsAnalyzedCount, refreshCounts } = useVinCounts();
  const [selectedPart, setSelectedPart] = useState<VehicleCorePart | null>(null);

  useEffect(() => {
    if (data.vehicle?.make) {
      addToHistory({ vin: data.vin, make: data.vehicle.make, model: data.vehicle.model, year: data.vehicle.year, analyzedAt: new Date().toISOString(), resultSummary: `${data.vehicle.make} ${data.vehicle.model} ${data.vehicle.year || ''} - ${data.coreParts.length} أجزاء` });
      refreshCounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.vehicle?.make]);

  const handleAnalyze = useCallback(async (vin: string) => { await runAllSteps(vin); }, [runAllSteps]);
  const handleSelectRecent = useCallback((vin: string) => { handleAnalyze(vin); }, [handleAnalyze]);
  const handlePartClick = useCallback((part: VehicleCorePart) => { setSelectedPart(part); }, []);

  const retryRef = useRef(retryStep);
  retryRef.current = retryStep;

  const handleTabClick = useCallback((idx: number) => {
    if (tabs[idx]?.status !== 'locked') { setActiveTab(idx); if (tabs[idx]?.status === 'idle') retryRef.current(tabs[idx].id); }
  }, [tabs, setActiveTab]);

  useEffect(() => {
    const ct = tabs[activeTab];
    if (ct?.status === 'success' && activeTab < tabs.length - 1 && tabs[activeTab + 1]?.status === 'idle') {
      setActiveTab(activeTab + 1); retryRef.current(tabs[activeTab + 1].id);
    }
  }, [tabs, activeTab, setActiveTab]);

  const metrics = useMemo((): VinDashboardMetrics => ({
    vinsAnalyzed: vinsAnalyzedCount, vehiclesInKnowledgeBase: vehicleCount,
    verifiedFitments: data.coreParts.filter(p => p.fitmentStatus === 'VERIFIED').length,
    inventoryMatches: data.inventoryMatches.length,
    unknownFitments: data.coreParts.filter(p => p.fitmentStatus === 'UNKNOWN').length,
  }), [vinsAnalyzedCount, vehicleCount, data]);

  const hasData = !!data.vehicle;
  const activeStep = tabs[activeTab]?.id;

  return (
    <div className="flex flex-col h-full bg-[var(--app-bg)]">
      <MicroHeader title={t('vin_intelligence')} subtitle={t('vin_subtitle')} icon={Car}
        actions={<button onClick={reset} className="text-[10px] font-bold text-[var(--app-text-secondary)] hover:text-[var(--app-text)] flex items-center gap-1"><RotateCcw size={12} /> {t('vin_reset')}</button>} />

      <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-3">
        <DashboardSummary metrics={metrics} />
        <VINSearch onAnalyze={handleAnalyze} isAnalyzing={isAnyLoading} recentVins={history.map(h => h.vin)} onSelectRecent={handleSelectRecent} />

        {hasData && (
          <>
            <VinTabsBar tabs={tabs} activeTab={activeTab} onTabClick={handleTabClick} />
            <div className="space-y-3">
              <TabContent key={data.vin} tab={activeStep as TabStep} data={data} onPartClick={handlePartClick} error={tabs[activeTab]?.error || null} />
              {tabs[activeTab]?.status === 'error' && (
                <div className="flex justify-center">
                  <button onClick={() => retryStep(activeStep as TabStep)} className="bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all"><RotateCcw size={12} /> {t('vin_retry')}</button>
                </div>
              )}
            </div>
          </>
        )}

        {!hasData && !isAnyLoading && <EmptyState onSelect={handleSelectRecent} history={history} />}
      </div>

      {selectedPart && hasData && (
        <ExplainabilityDrawer isOpen={!!selectedPart} onClose={() => setSelectedPart(null)} vehicle={data.vehicle!} part={selectedPart} />
      )}
    </div>
  );
};

export default VINPage;
