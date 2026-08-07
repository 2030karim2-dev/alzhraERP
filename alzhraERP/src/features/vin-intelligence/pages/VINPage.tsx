import React, { useState, useCallback, useEffect } from 'react';
import MicroHeader from '../../../ui/base/MicroHeader';
import { Car, RotateCcw } from 'lucide-react';
import { useTranslation } from '../../../lib/hooks/useTranslation';
import VINSearch from '../components/VINSearch';
import AnalysisProgress from '../components/AnalysisProgress';
import VehicleCard from '../components/VehicleCard';
import DashboardSummary from '../components/DashboardSummary';
import CorePartsTable from '../components/CorePartsTable';
import InventoryMatches from '../components/InventoryMatches';
import MissingParts from '../components/MissingParts';
import DemandIntelligence from '../components/DemandIntelligence';
import VINHistory from '../components/VINHistory';
import ExplainabilityDrawer from '../components/ExplainabilityDrawer';
import { useVinAnalysis } from '../hooks/useVinAnalysis';
import { useVinHistory } from '../hooks/useVinHistory';
import type { VehicleCorePart } from '../types';

const VINPage: React.FC = () => {
  const { t } = useTranslation();
  const { result, isAnalyzing, error, steps, analyzeVin, reset } = useVinAnalysis();
  const { history, addToHistory } = useVinHistory();
  const [selectedPart, setSelectedPart] = useState<VehicleCorePart | null>(null);

  const handleAnalyze = useCallback(async (vin: string) => {
    await analyzeVin(vin);
  }, [analyzeVin]);

  // Update latest history entry with vehicle data once result arrives
  useEffect(() => {
    if (result) {
      addToHistory({
        vin: result.vin,
        make: result.vehicle.make,
        model: result.vehicle.model,
        year: result.vehicle.year,
        analyzedAt: result.analysisTimestamp,
        resultSummary: `${result.vehicle.make} ${result.vehicle.model} ${result.vehicle.year || ''} — ${result.coreParts.length} قطع`,
      });
    }
  }, [result, addToHistory]);

  const handleSelectRecent = useCallback((vin: string) => {
    handleAnalyze(vin);
  }, [handleAnalyze]);

  const handlePartClick = useCallback((part: VehicleCorePart) => {
    setSelectedPart(part);
  }, []);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <div className="flex flex-col h-full">
      <MicroHeader
        title={t('vin_title')}
        icon={Car}
        iconColor="text-blue-600"
        actions={
          result && (
            <button onClick={handleReset} className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-[var(--app-text-secondary)] rounded-lg text-[9px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">
              <RotateCcw size={11} /> {t('vin_new_analysis')}
            </button>
          )
        }
      />

      <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-3 bg-[var(--app-bg)]">
        <DashboardSummary />

        <VINSearch
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
          recentVins={history.map(h => h.vin)}
          onSelectRecent={handleSelectRecent}
        />

        <AnalysisProgress steps={steps} isAnalyzing={isAnalyzing} />

        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-3">
            <p className="text-[10px] font-bold text-rose-600">{error}</p>
          </div>
        )}

        {result && (
          <>
            <VehicleCard vehicle={result.vehicle} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2 space-y-3">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text)] mb-2 px-1">{t('vin_core_parts')}</h3>
                  <CorePartsTable parts={result.coreParts} onPartClick={handlePartClick} />
                </div>
              </div>

              <div className="space-y-3">
                <InventoryMatches matches={result.inventoryMatches} />
                <MissingParts parts={result.missingParts} />
                <DemandIntelligence insights={result.demandInsights} />
                <VINHistory history={history} onSelect={handleSelectRecent} />
              </div>
            </div>

            {result.warnings && result.warnings.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-1">Warnings</p>
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-[9px] text-amber-700 dark:text-amber-400">{w}</p>
                ))}
              </div>
            )}
          </>
        )}

        {!isAnalyzing && !result && (
          <VINHistory history={history} onSelect={handleSelectRecent} />
        )}
      </div>

      {selectedPart && result && (
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
