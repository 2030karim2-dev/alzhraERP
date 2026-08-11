import React from 'react';
import type { VinAnalysisResult } from '../../types';
import type { VinAIInsight } from '../../services/vinAIService';

interface MarketTabProps {
  result: VinAnalysisResult | null;
  aiInsight: VinAIInsight | null;
  isAnalyzingAI: boolean;
  aiError: string | null;
}

const MarketTab: React.FC<MarketTabProps> = () => {
  return <div>Market Tab</div>;
};

export default MarketTab;
