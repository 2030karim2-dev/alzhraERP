import React from 'react';
import DemandIntelligence from '../../components/DemandIntelligence';
import VinAIInsights from '../../components/VinAIInsights';
import { PartSearchPanel } from '../../../part-intelligence/components/PartSearchPanel';
import type { VinAnalysisResult } from '../../types';
import type { VinAIInsight } from '../../services/vinAIService';
import { useTranslation } from '../../../../lib/hooks/useTranslation';

interface MarketTabProps {
  result: VinAnalysisResult | null;
  aiInsight: VinAIInsight | null;
  isAnalyzingAI: boolean;
  aiError: string | null;
}

/**
 * Tab 3: Market Intelligence — Demand insights + AI analysis + part number search
 * Strategic view for procurement decisions and market analysis.
 */
const MarketTab: React.FC<MarketTabProps> = ({ result, aiInsight, isAnalyzingAI, aiError }) => {
  const { t } = useTranslation();

  if (!result || result.analysisStatus === 'FAILED') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
          <span className="text-2xl">🧠</span>
        </div>
        <h3 className="text-sm font-black text-[var(--app-text)] mb-1">
          {t('vin_no_market_data')}
        </h3>
        <p className="text-[10px] text-[var(--app-text-secondary)] max-w-xs">
          {t('vin_analyze_for_market')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fadeIn">
      {/* Demand Intelligence */}
      <DemandIntelligence insights={result.demandInsights} />

      {/* AI Market Analysis (DeepSeek) */}
      <VinAIInsights insight={aiInsight} isLoading={isAnalyzingAI} error={aiError} />

      {/* Part Number Intelligence Search */}
      <PartSearchPanel
        vin={result.vin}
        vehicleInfo={{
          make: result.vehicle.make,
          model: result.vehicle.model,
          year: result.vehicle.year,
        }}
      />
    </div>
  );
};

export default MarketTab;
