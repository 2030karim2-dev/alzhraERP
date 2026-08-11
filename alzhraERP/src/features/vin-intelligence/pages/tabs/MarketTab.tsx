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

  return (
    <div className="space-y-3 animate-fadeIn">
      {/* Demand Intelligence */}
      <DemandIntelligence insights={result!.demandInsights} />

      {/* AI Market Analysis (DeepSeek) */}
      <VinAIInsights insight={aiInsight} isLoading={isAnalyzingAI} error={aiError} />

      {/* Part Number Intelligence Search */}
      <PartSearchPanel
        vin={result!.vin}
        vehicleInfo={{
          make: result!.vehicle.make,
          model: result!.vehicle.model,
          year: result!.vehicle.year,
        }}
      />
    </div>
  );
};

export default MarketTab;
